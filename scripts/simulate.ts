// Bots que juegan miles de legislaturas para ver de qué se muere la gente.
// npm run simulate
import { PACK } from '../src/content';
import { choose, draw, newGame } from '../src/engine/game';
import { visibleOptions } from '../src/engine/director';
import { next } from '../src/engine/rng';
import type { Stat } from '../src/engine/types';

const N = 5000;
const bots = {
  azar: (_s: any, _e: any, opts: number[], r: number) => opts[Math.floor(r * opts.length)],
  // elige la opción que deja las barras más cerca del centro
  prudente: (s: any, e: any, opts: number[]) => {
    let best = opts[0], bestScore = Infinity;
    for (const i of opts) {
      let score = 0;
      for (const k of Object.keys(s.stats) as Stat[]) {
        const v = s.stats[k] + (e.options[i].effects[k] ?? 0);
        score += k === 'alerta' ? v : Math.abs(v - 50);
      }
      if (score < bestScore) { bestScore = score; best = i; }
    }
    return best;
  },
};

for (const [name, bot] of Object.entries(bots)) {
  const endings: Record<string, number> = {};
  let turns = 0, rng = 7;
  for (let g = 0; g < N; g++) {
    const s = newGame(g + 1, (['PTC', 'PSTV', 'AI', 'CNC', 'VP'] as const)[g % 5]);
    let end = null;
    while (!end) {
      const e = draw(PACK, s);
      const [r, n] = next(rng); rng = n;
      end = choose(s, e, bot(s, e, visibleOptions(e, s), r));
    }
    endings[end.key] = (endings[end.key] ?? 0) + 1;
    turns += s.turn;
  }
  console.log(`\n${name}: turnos medios ${(turns / N).toFixed(1)}`);
  for (const [k, v] of Object.entries(endings).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(18)} ${(100 * v / N).toFixed(1)}%`);
}
