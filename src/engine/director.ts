import type { Danger, GameEvent, GameState, Requires, Stat } from './types';
import { weightedPick } from './rng';

export const RED_ZONE: Record<Stat, [number, number]> = {
  influencia: [15, 85],
  aprobacion: [15, 85],
  medios: [15, 85],
  alerta: [-1, 70], // la alerta solo mata por arriba
};

export const SAFE_TURNS = 10; // nada letal al principio

export function meets(req: Requires | undefined, s: GameState): boolean {
  if (!req) return true;
  if (req.flagsAll?.some(f => !s.flags.includes(f))) return false;
  if (req.flagsNone?.some(f => s.flags.includes(f))) return false;
  if (req.dirt?.some(d => !s.dirt.includes(d))) return false;
  if (req.party && !req.party.includes(s.party)) return false;
  for (const [k, [lo, hi]] of Object.entries(req.stats ?? {})) {
    const v = s.stats[k as Stat];
    if (v < lo || v > hi) return false;
  }
  for (const [npc, [lo, hi]] of Object.entries(req.relations ?? {})) {
    const v = s.relations[npc] ?? 0;
    if (v < lo || v > hi) return false;
  }
  if (req.debtDue && !s.debts.some(d => d.id === req.debtDue && d.dueTurn <= s.turn)) return false;
  return true;
}

function available(e: GameEvent, s: GameState, ignoreCooldown = false): boolean {
  if (s.act < e.act[0] || s.act > e.act[1]) return false;
  const seen = s.lastSeen[e.id];
  const cd = e.cooldown ?? 25;
  if (seen !== undefined && (cd >= 999 || (!ignoreCooldown && s.turn - seen < cd))) return false;
  // las cadenas avanzan en orden: el paso n exige haber visto el n-1
  if (e.chain && e.step && e.step > 1 && !s.flags.includes(`chain:${e.chain}:${e.step - 1}`)) return false;
  if (s.turn <= SAFE_TURNS && e.tags.includes('peligro')) return false;
  if (!meets(e.requires, s)) return false;
  return visibleOptions(e, s).length >= 2;
}

export function visibleOptions(e: GameEvent, s: GameState): number[] {
  return e.options.map((o, i) => (meets(o.requires, s) ? i : -1)).filter(i => i >= 0);
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

/**
 * El director: prioridades fijas y luego sorteo con pesos.
 * deuda vencida > aviso > hito > cadena abierta > relleno
 */
export function nextEvent(pack: GameEvent[], s: GameState): [GameEvent, number] {
  let pool = pack.filter(e => available(e, s));
  if (!pool.some(e => e.kind !== 'warning' && e.kind !== 'debt' && e.kind !== 'milestone')) {
    pool = pack.filter(e => available(e, s, true)); // mazo agotado: relajamos el cooldown
  }

  const debt = pool.filter(e => e.kind === 'debt');
  if (debt.length) return pick(debt, s);

  const fresh = dangers(s).find(d => !s.warned.includes(d));
  if (fresh) {
    const warn = pool.filter(e => e.kind === 'warning' && e.warnsFor === fresh);
    if (warn.length) return pick(warn, s);
  }

  const milestone = pool.filter(e => e.kind === 'milestone');
  if (milestone.length) return pick(milestone, s);

  const chain = pool.filter(e => e.kind === 'chain' && (e.step ?? 1) > 1);
  const rest = pool.filter(e => e.kind !== 'warning' && e.kind !== 'debt' && e.kind !== 'milestone');
  // las cadenas abiertas tienen ventaja, pero no monopolio
  return pick(chain.length ? [...chain, ...chain, ...rest] : rest, s);
}

function pick(events: GameEvent[], s: GameState): [GameEvent, number] {
  const comfort = comfortLevel(s);
  const weights = events.map(e => {
    let w = e.weight * (e.ideology?.[s.party] ?? 1);
    const repeats = e.tags.filter(t => s.recentTags.includes(t)).length;
    w *= Math.pow(0.35, repeats);                      // nada de tres sobres seguidos
    if (comfort > 0.7 && e.tags.includes('peligro')) w *= 2; // si vas sobrado, aprieta
    return Math.max(w, 0.01);
  });
  return weightedPick(events, weights, s.rngState);
}

/** 0 = al borde del abismo, 1 = demasiado cómodo. */
function comfortLevel(s: GameState): number {
  const d = (v: number) => Math.min(v, 100 - v) / 50;
  return (d(s.stats.influencia) + d(s.stats.aprobacion) + d(s.stats.medios) + (1 - s.stats.alerta / 100)) / 4;
}
