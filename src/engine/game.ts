import type { Dirt, Ending, GameEvent, GameState, Party, Stat, Stats } from './types';
import { intBetween } from './rng';
import { dangers, nextEvent } from './director';

export const TURNS_PER_ACT = 15;
export const LAST_TURN = TURNS_PER_ACT * 4;
export const ACTS = ['Diputado raso', 'Portavoz', 'Ministro', 'Candidato'];
const clamp = (v: number) => Math.max(0, Math.min(100, v));
// Cada turno el ciclo de noticias te olvida un poco y el partido también.
const DRIFT: Partial<Stats> = { medios: -1 };

export function newGame(seed: number, party: Party): GameState {
  return {
    seed, rngState: seed, party, turn: 1, act: 1,
    stats: { influencia: 50, aprobacion: 50, medios: 50, alerta: 10 },
    flags: [], debts: [], relations: {}, dirt: [],
    lastSeen: {}, recentTags: [], history: [], warned: [],
  };
}

export function draw(pack: GameEvent[], s: GameState): GameEvent {
  const [event, rng] = nextEvent(pack, s);
  s.rngState = rng;
  if (event.kind === 'warning' && event.warnsFor) s.warned.push(event.warnsFor);
  return event;
}

/** Para la UI: tamaño del punto sobre cada barra, sin revelar el número. */
export function previewOption(e: GameEvent, i: number): Partial<Record<Stat, 'small' | 'big'>> {
  const out: Partial<Record<Stat, 'small' | 'big'>> = {};
  for (const [k, v] of Object.entries(e.options[i].effects)) {
    if (v) out[k as Stat] = Math.abs(v) >= 10 ? 'big' : 'small';
  }
  return out;
}

function applyEffects(s: GameState, effects: Partial<Stats>): Partial<Stats> {
  const deltas: Partial<Stats> = {};
  for (const [k, v] of Object.entries(effects) as [Stat, number][]) {
    s.stats[k] = clamp(s.stats[k] + v);
    deltas[k] = v;
  }
  return deltas;
}

function makeEnemy(s: GameState, dirtId: string) {
  s.dirt = s.dirt.filter(d => d !== dirtId);
  const npc = dirtId.split('_')[1];
  if (!s.flags.includes(`enemigo:${npc}`)) s.flags.push(`enemigo:${npc}`);
  s.relations[npc] = -3;
}

export function choose(s: GameState, e: GameEvent, i: number): Ending | null {
  const o = e.options[i];
  const deltas = applyEffects(s, o.effects);
  applyEffects(s, DRIFT);

  for (const f of o.setFlags ?? []) if (!s.flags.includes(f)) s.flags.push(f);
  if (o.clearFlags) s.flags = s.flags.filter(f => !o.clearFlags!.includes(f));
  if (e.chain && e.step) s.flags.push(`chain:${e.chain}:${e.step}`);

  if (o.addDebt) {
    const [due, rng] = intBetween(s.turn + o.addDebt.in[0], s.turn + o.addDebt.in[1], s.rngState);
    s.rngState = rng;
    s.debts.push({ id: o.addDebt.id, createdTurn: s.turn, dueTurn: due, severity: o.addDebt.severity });
  }
  if (o.delayDebt) {
    const d = s.debts.find(d => d.id === o.delayDebt!.id);
    if (d) { d.dueTurn = s.turn + o.delayDebt.turns; d.severity++; } // vuelve peor
  }
  if (o.clearDebt) s.debts = s.debts.filter(d => d.id !== o.clearDebt);

  if (o.gainDirt && !s.dirt.includes(o.gainDirt)) s.dirt.push(o.gainDirt);
  if (o.useDirt) makeEnemy(s, o.useDirt);
  for (const [npc, v] of Object.entries(o.relations ?? {})) {
    s.relations[npc] = Math.max(-3, Math.min(3, (s.relations[npc] ?? 0) + v));
  }

  s.history.push({ turn: s.turn, eventId: e.id, option: i, deltas, headline: o.headline });
  s.lastSeen[e.id] = s.turn;
  s.recentTags = [...e.tags, ...s.recentTags].slice(0, 6);
  const now = dangers(s);
  s.warned = s.warned.filter(d => now.includes(d)); // si sales del peligro, el próximo aviso vuelve a llegar

  s.turn++;
  s.act = Math.min(4, 1 + Math.floor((s.turn - 1) / TURNS_PER_ACT));

  return checkEnd(s);
}

/** Jugar un trapo sucio desde el inventario: uno por turno, y te ganas un enemigo. */
export function playDirt(s: GameState, d: Dirt): boolean {
  if (!s.dirt.includes(d.id) || s.dirtUsedTurn === s.turn) return false;
  const deltas = applyEffects(s, d.effects);
  makeEnemy(s, d.id);
  s.dirtUsedTurn = s.turn;
  s.history.push({ turn: s.turn, eventId: `trapo:${d.id}`, option: 0, deltas, headline: `Sale a la luz: ${d.title}` });
  return true;
}

const DEATHS: Record<string, [string, string]> = {
  'influencia-low': ['Purgado', 'Te mandan de senador a una provincia que no sale en los mapas.'],
  'influencia-high': ['Demasiado peligroso', 'El aparato te apuñala antes de que lo hagas tú. Con cariño y por la espalda.'],
  'aprobacion-low': ['Abucheado', 'Un vídeo tuyo tropezando con una urna tiene más visitas que tu partido votos. Fuera de las listas.'],
  'aprobacion-high': ['Cabeza de turco', 'Eres tan querido que el partido te sacrifica para tapar lo suyo.'],
  'medios-low': ['Irrelevante', 'Ni la tertulia de las tres de la madrugada te llama. Políticamente, no existes.'],
  'medios-high': ['Las cloacas', 'Controlabas tanto la prensa que la prensa ha sacado cómo la controlabas. Con audios.'],
  'alerta-high': ['Las siete de la mañana', 'La UCU en tu puerta, las cámaras montadas desde las seis. Alguien les avisó antes que a ti.'],
};

export function checkEnd(s: GameState): Ending | null {
  for (const stat of Object.keys(s.stats) as Stat[]) {
    const v = s.stats[stat];
    const edge = v <= 0 && stat !== 'alerta' ? 'low' : v >= 100 ? 'high' : null;
    if (!edge) continue;
    const key = `${stat}-${edge}`;
    const [title, text] = DEATHS[key];
    return { win: false, key, title, text, causes: causesFor(s, stat, edge === 'high' ? 1 : -1) };
  }
  if (s.turn > LAST_TURN) {
    const { influencia, aprobacion, alerta } = s.stats;
    if (influencia >= 50 && aprobacion >= 40 && alerta < 55) {
      return { win: true, key: 'presidente', title: 'Presidente del Gobierno', text: 'Lo has conseguido. Jurarás el cargo sobre una Constitución que no has leído, rodeado de gente que te odia y te aplaude a la vez.', causes: [] };
    }
    return { win: true, key: 'superviviente', title: 'Superviviente', text: 'No llegas a presidente, pero sigues en el escaño. En Hispalia, eso ya es una carrera de éxito.', causes: [] };
  }
  return null;
}

/** Que nadie muera sin saber por qué: las 3 decisiones que más empujaron esa barra. */
function causesFor(s: GameState, stat: Stat, sign: number) {
  return s.history
    .filter(h => (h.deltas[stat] ?? 0) * sign > 0)
    .map(h => ({ h, score: Math.abs(h.deltas[stat]!) * (1 + h.turn / s.turn) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.h)
    .sort((a, b) => a.turn - b.turn);
}
