// Bots que juegan miles de carreras para ver hasta dónde llega la gente y de qué cae.
// npm run simulate
import { ENDINGS, PACK } from '../src/content';
import { STAGES, choose, draw, newCareer } from '../src/engine/game';
import { visibleOptions } from '../src/engine/director';
import { next } from '../src/engine/rng';
import type { GameEvent, GameState, Stat } from '../src/engine/types';

const N = 4000;
type Bot = (s: GameState, e: GameEvent, opts: number[], r: number) => number;

const centered = (s: GameState, e: GameEvent, i: number) => {
  let score = 0;
  for (const k of Object.keys(s.stats) as Stat[]) {
    const v = s.stats[k] + (e.options[i].effects[k] ?? 0);
    score += k === 'judicial' ? v : Math.abs(v - 50);
  }
  return score;
};

// los bots no se retiran por su cuenta: solo cuentan los finales forzados y la investidura
const stays = (e: GameEvent, opts: number[]) => {
  const keep = opts.filter(i => !e.options[i].end || e.options[i].end === "presidencia");
  return keep.length ? keep : opts;
};

const bots: Record<string, Bot> = {
  azar: (_s, _e, opts, r) => opts[Math.floor(r * opts.length)],
  // mantiene las barras cerca del centro, sin mirar nada más
  prudente: (s, e, opts) => opts.reduce((a, b) => (centered(s, e, b) < centered(s, e, a) ? b : a)),
  // siempre lo que da más influencia: el trepa
  trepa: (_s, e, opts) => opts.reduce((a, b) => ((e.options[b].effects.influencia ?? 0) > (e.options[a].effects.influencia ?? 0) ? b : a)),
  // siempre la opción con más convicción
  integro: (_s, e, opts) => opts.reduce((a, b) => ((e.options[b].conviccion ?? 0) > (e.options[a].conviccion ?? 0) ? b : a)),
};

for (const [name, bot] of Object.entries(bots)) {
  const endings: Record<string, number> = {};
  const reached = new Array(8).fill(0);
  let turns = 0, conv = 0, rng = 7;
  for (let g = 0; g < N; g++) {
    const s = newCareer(g + 1);
    let end = null;
    while (!end && s.turn < 400) {
      const e = draw(PACK, s);
      const [r, n] = next(rng); rng = n;
      end = choose(s, e, bot(s, e, stays(e, visibleOptions(e, s)), r), ENDINGS);
    }
    endings[end?.key ?? 'sin-final'] = (endings[end?.key ?? 'sin-final'] ?? 0) + 1;
    reached[s.stage]++;
    turns += s.turn;
    conv += s.conviccion;
  }
  console.log(`\n${name}: ${(turns / N).toFixed(0)} meses de media · convicción final ${(conv / N).toFixed(0)}`);
  console.log('  etapa final: ' + STAGES.map((st, i) => `${st.name} ${(100 * reached[i + 1] / N).toFixed(0)}%`).join(' · '));
  for (const [k, v] of Object.entries(endings).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(16)} ${(100 * v / N).toFixed(1)}%`);
}
