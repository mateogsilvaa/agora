import type { Danger, GameEvent, GameState, Requires, Stat } from './types';
import { weightedPick } from './rng';

export const RED_ZONE: Record<Stat, [number, number]> = {
  influencia: [15, 85],
  opinion: [15, 85],
  prensa: [15, 85],
  judicial: [-1, 70], // el riesgo judicial solo mata por arriba
};

export const SAFE_TURNS = 6; // los primeros meses no hay nada letal

const inRange = (v: number, [lo, hi]: [number, number]) => v >= lo && v <= hi;

export function meets(req: Requires | undefined, s: GameState): boolean {
  if (!req) return true;
  if (req.flagsAll?.some(f => !s.flags.includes(f))) return false;
  if (req.flagsNone?.some(f => s.flags.includes(f))) return false;
  if (req.flagsAny && !req.flagsAny.some(f => s.flags.includes(f))) return false;
  if (req.world?.some(f => !s.world.includes(f))) return false;
  if (req.worldNone?.some(f => s.world.includes(f))) return false;
  if (req.via && (!s.via || !req.via.includes(s.via))) return false;
  if (req.origin && !req.origin.includes(s.origin)) return false;
  if (req.conviccion && !inRange(s.conviccion, req.conviccion)) return false;
  if (req.minStageTurns !== undefined && s.stageTurns < req.minStageTurns) return false;
  for (const [k, r] of Object.entries(req.stats ?? {})) if (!inRange(s.stats[k as Stat], r!)) return false;
  for (const [npc, r] of Object.entries(req.relations ?? {})) if (!inRange(s.relations[npc] ?? 0, r)) return false;
  if (req.debtDue && !s.debts.some(d => d.id === req.debtDue && d.dueTurn <= s.turn)) return false;
  return true;
}

export function visibleOptions(e: GameEvent, s: GameState): number[] {
  return e.options.map((o, i) => (meets(o.requires, s) ? i : -1)).filter(i => i >= 0);
}

function available(e: GameEvent, s: GameState, ignoreCooldown = false): boolean {
  if (s.stage < e.stage[0] || s.stage > e.stage[1]) return false;
  const seen = s.lastSeen[e.id];
  const cd = e.cooldown ?? 40;
  if (seen !== undefined && !ignoreCooldown && (cd >= 999 || s.turn - seen < cd)) return false;
  if (seen !== undefined && ignoreCooldown && (cd >= 999 || s.turn - seen < 6)) return false;
  // las cadenas avanzan en orden: el paso n exige haber vivido el n-1
  if (e.chain && e.step && e.step > 1 && !s.flags.includes(`chain:${e.chain}:${e.step - 1}`)) return false;
  if (s.turn <= SAFE_TURNS && e.tags.includes('peligro')) return false;
  if (!meets(e.requires, s)) return false;
  return visibleOptions(e, s).length >= 2;
}

export function dangers(s: GameState): Danger[] {
  const out: Danger[] = [];
  for (const k of Object.keys(RED_ZONE) as Stat[]) {
    const [lo, hi] = RED_ZONE[k];
    if (s.stats[k] < lo) out.push(`${k}-low`);
    if (s.stats[k] > hi) out.push(`${k}-high`);
  }
  return out;
}

const SPECIAL = new Set(['warning', 'debt', 'promotion']);

/**
 * El director: prioridades fijas y luego sorteo con pesos.
 * deuda vencida > aviso > ascenso > cadena abierta > carta normal
 */
export function nextEvent(pack: GameEvent[], s: GameState): [GameEvent, number] {
  let pool = pack.filter(e => available(e, s));
  if (!pool.some(e => !SPECIAL.has(e.kind ?? 'normal'))) {
    pool = pack.filter(e => available(e, s, true)); // mazo agotado: relajamos el cooldown
  }
  if (!pool.length) {
    // último recurso: cualquier carta repetible de la etapa, aunque se haya visto hace poco
    pool = pack.filter(e => (e.cooldown ?? 40) < 999 && !SPECIAL.has(e.kind ?? 'normal')
      && s.stage >= e.stage[0] && s.stage <= e.stage[1] && meets(e.requires, s) && visibleOptions(e, s).length >= 2);
  }

  const debt = pool.filter(e => e.kind === 'debt');
  if (debt.length) return pick(debt, s);

  const fresh = dangers(s).find(d => !s.warned.includes(d));
  if (fresh) {
    const warn = pool.filter(e => e.kind === 'warning' && e.warnsFor === fresh);
    if (warn.length) return pick(warn, s);
  }

  // el ascenso no llega en cuanto se puede: compite con el día a día
  const promo = pool.filter(e => e.kind === 'promotion');
  const [r, rng] = weightedPick([true, false], [1, 2], s.rngState);
  const next = { ...s, rngState: rng };
  if (promo.length && r) return pick(promo, next);

  const chain = pool.filter(e => e.kind === 'chain' && (e.step ?? 1) > 1);
  const rest = pool.filter(e => !SPECIAL.has(e.kind ?? 'normal'));
  if (!rest.length) return pick(promo.length ? promo : pool, next);
  return pick(chain.length ? [...chain, ...chain, ...rest] : rest, next);
}

function pick(events: GameEvent[], s: GameState): [GameEvent, number] {
  const weights = events.map(e => {
    let w = e.weight;
    const repeats = e.tags.filter(t => s.recentTags.includes(t)).length;
    w *= Math.pow(0.4, repeats);
    if (e.requires?.via) w *= 1.6;      // lo propio de tu vía sale más
    if (e.requires?.origin) w *= 1.4;   // y lo de tu origen también
    return Math.max(w, 0.01);
  });
  return weightedPick(events, weights, s.rngState);
}
