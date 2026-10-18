import type { Ending, EndingDef, GameEvent, GameState, HistoryEntry, Origin, Stat, Stats } from './types';
import { intBetween, next } from './rng';
import { dangers, nextEvent } from './director';

export const STAGES = [
  { name: 'Facultad', min: 8 },
  { name: 'Agrupación local', min: 14 },
  { name: 'Ayuntamiento', min: 18 },
  { name: 'Parlamento autonómico', min: 20 },
  { name: 'Congreso', min: 22 },
  { name: 'Gobierno', min: 22 },
  { name: 'Liderazgo', min: 18 },
] as const;

export const ORIGINS: Record<Origin, { name: string; text: string; stats: Stats; conviccion: number }> = {
  cinturon: {
    name: 'Cinturón industrial',
    text: 'Tu padre estuvo en la fábrica hasta el ERE. Eres el primero de tu familia con carrera.',
    stats: { influencia: 35, opinion: 55, prensa: 40, judicial: 5 }, conviccion: 85,
  },
  provincia: {
    name: 'Capital de provincia',
    text: 'Familia de funcionarios. Sabes cómo funciona una administración por dentro, y lo que tarda.',
    stats: { influencia: 45, opinion: 50, prensa: 45, judicial: 5 }, conviccion: 70,
  },
  despacho: {
    name: 'Despacho familiar',
    text: 'El despacho de tu madre lleva tres generaciones en el centro. Conoces a gente sin haberla buscado.',
    stats: { influencia: 55, opinion: 40, prensa: 50, judicial: 10 }, conviccion: 60,
  },
  pueblo: {
    name: 'Pueblo que se vacía',
    text: 'En tu instituto erais once. Ahora el instituto es un centro de interpretación.',
    stats: { influencia: 40, opinion: 55, prensa: 35, judicial: 5 }, conviccion: 80,
  },
  precario: {
    name: 'Dos másteres y un contrato de prácticas',
    text: 'Has hecho todo lo que te dijeron que había que hacer. Cobras 700 euros.',
    stats: { influencia: 35, opinion: 50, prensa: 50, judicial: 5 }, conviccion: 75,
  },
};

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
export const dateLabel = (turn: number) => `${MONTHS[(turn - 1) % 12]} ${2016 + Math.floor((turn - 1) / 12)}`;
export const ageAt = (turn: number) => 22 + Math.floor((turn - 1) / 12);

const clamp = (v: number) => Math.max(0, Math.min(100, v));
// Cada mes la prensa te olvida un poco.
const DRIFT: Partial<Stats> = { prensa: -1 };

export function newCareer(seed: number, world: string[] = [], origin?: Origin): GameState {
  const keys = Object.keys(ORIGINS) as Origin[];
  const [r, rng] = next(seed);
  const o = origin ?? keys[Math.floor(r * keys.length)];
  return {
    version: 2, seed, rngState: rng, origin: o, via: null,
    turn: 1, stage: 1, stageTurns: 0,
    stats: { ...ORIGINS[o].stats }, conviccion: ORIGINS[o].conviccion,
    flags: [], world: [...world], debts: [], relations: {},
    lastSeen: {}, recentTags: [], history: [], warned: [],
  };
}

export function draw(pack: GameEvent[], s: GameState): GameEvent {
  const [event, rng] = nextEvent(pack, s);
  s.rngState = rng;
  if (event.kind === 'warning' && event.warnsFor) s.warned.push(event.warnsFor);
  return event;
}

/** Para la UI: qué barras se mueven y cuánto, sin dar la cifra. */
export function previewOption(e: GameEvent, i: number): Partial<Record<Stat, 1 | 2>> {
  const out: Partial<Record<Stat, 1 | 2>> = {};
  for (const [k, v] of Object.entries(e.options[i].effects)) {
    if (v) out[k as Stat] = Math.abs(v) >= 10 ? 2 : 1;
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

const addUnique = (list: string[], items?: string[]) => {
  for (const f of items ?? []) if (!list.includes(f)) list.push(f);
};

export function choose(s: GameState, e: GameEvent, i: number, endings: Record<string, EndingDef>): Ending | null {
  const o = e.options[i];
  const deltas = applyEffects(s, o.effects);
  applyEffects(s, DRIFT);
  s.conviccion = clamp(s.conviccion + (o.conviccion ?? 0));

  addUnique(s.flags, o.setFlags);
  if (o.clearFlags) s.flags = s.flags.filter(f => !o.clearFlags!.includes(f));
  if (e.chain && e.step) addUnique(s.flags, [`chain:${e.chain}:${e.step}`]);
  addUnique(s.world, o.setWorld);
  if (o.setVia && !s.via) s.via = o.setVia;

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
  for (const [npc, v] of Object.entries(o.relations ?? {})) {
    s.relations[npc] = Math.max(-3, Math.min(3, (s.relations[npc] ?? 0) + v));
  }

  s.history.push({ turn: s.turn, stage: s.stage, eventId: e.id, option: i, deltas, conviccion: o.conviccion ?? 0, outcome: o.outcome });
  s.lastSeen[e.id] = s.turn;
  s.recentTags = [...e.tags, ...s.recentTags].slice(0, 6);
  const now = dangers(s);
  s.warned = s.warned.filter(d => now.includes(d)); // si sales del peligro, el siguiente aviso vuelve a llegar

  s.turn++;
  s.stageTurns++;
  if (o.promote && s.stage < STAGES.length) {
    s.stage++;
    s.stageTurns = 0;
  }

  if (o.end) {
    const def = endings[o.end] ?? { key: o.end, title: o.end, text: '' };
    return { ...def, epilogue: epilogue(s, def.win ?? false), causes: keyMoments(s) };
  }
  return checkEnd(s);
}

const DEATHS: Record<string, EndingDef> = {
  'influencia-low': { key: 'influencia-low', title: 'Fuera de las listas', text: 'Nadie te comunica nada. Simplemente, en la reunión donde se decidían los nombres, el tuyo no estaba.' },
  'influencia-high': { key: 'influencia-high', title: 'Demasiado pronto', text: 'Acumulaste poder antes de tiempo. La dirección resolvió el problema con un congreso extraordinario y una gestora.' },
  'opinion-low': { key: 'opinion-low', title: 'Amortizado', text: 'Las encuestas internas dicen que restas. Te ofrecen un puesto en una empresa pública con un nombre muy largo.' },
  'opinion-high': { key: 'opinion-high', title: 'El cortafuegos', text: 'Eras lo único limpio que le quedaba al partido. Por eso fuiste tú quien asumió la responsabilidad política.' },
  'prensa-low': { key: 'prensa-low', title: 'Invisible', text: 'Sigues en tu escaño. Nadie sabe cómo te llamas. Tu siguiente legislatura la decide alguien que tampoco lo sabe.' },
  'prensa-high': { key: 'prensa-high', title: 'Los audios', text: 'Tanta relación con los medios dejó rastro. Un digital publica tus mensajes con tres directores. Todos coinciden en que no los conocían.' },
  'judicial-high': { key: 'judicial-high', title: 'Imputado', text: 'El auto tiene doscientas páginas. En ninguna aparece la palabra que tú usabas para todo aquello: gestión.' },
};

export function checkEnd(s: GameState): Ending | null {
  for (const stat of Object.keys(s.stats) as Stat[]) {
    const v = s.stats[stat];
    const edge = v <= 0 && stat !== 'judicial' ? 'low' : v >= 100 ? 'high' : null;
    if (!edge) continue;
    const def = DEATHS[`${stat}-${edge}`];
    return { ...def, epilogue: epilogue(s, false), causes: causesFor(s, stat, edge === 'high' ? 1 : -1) };
  }
  return null;
}

/** El epílogo no depende de cómo acabas, sino de en qué te has convertido por el camino. */
function epilogue(s: GameState, win: boolean): string {
  const c = s.conviccion;
  const years = Math.floor((s.turn - 1) / 12);
  const span = years === 1 ? 'un año' : `${years} años`;
  if (c >= 70) return win
    ? `Terminas sin haber dejado de ser quien eras. Te costó ${span} y casi todo lo demás. Nadie en tu partido se lo explica.`
    : `Duraste ${span}. Perdiste, pero lo que firmaste lo podrías leer en voz alta en tu barrio.`;
  if (c >= 40) return win
    ? `Por el camino cediste en lo que hacía falta, y algo más. Te dices que era necesario. Casi siempre lo era.`
    : `${span} de política. Hiciste concesiones razonables, una tras otra. Sumadas, no se parecen a lo que querías.`;
  return win
    ? `Si el chaval que salió de la facultad en 2016 te viera hoy, te votaría en contra. Y lo sabes.`
    : `${span} y ninguna línea roja que no movieras. No te echaron por lo que hiciste, sino por dejar de ser útil.`;
}

/** Que nadie caiga sin saber por qué: las 3 decisiones que más empujaron esa barra. */
function causesFor(s: GameState, stat: Stat, sign: number): HistoryEntry[] {
  return s.history
    .filter(h => (h.deltas[stat] ?? 0) * sign > 0)
    .map(h => ({ h, score: Math.abs(h.deltas[stat]!) * (1 + h.turn / s.turn) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.h)
    .sort((a, b) => a.turn - b.turn);
}

/** En los finales elegidos: las decisiones que más te cambiaron. */
function keyMoments(s: GameState): HistoryEntry[] {
  return [...s.history]
    .sort((a, b) => a.conviccion - b.conviccion)
    .filter(h => h.conviccion < 0)
    .slice(0, 3)
    .sort((a, b) => a.turn - b.turn);
}
