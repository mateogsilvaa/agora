import { describe, expect, it } from 'vitest';
import { DIRT, PACK, SPEAKERS } from '../src/content';
import { newGame, draw, choose } from '../src/engine/game';
import { visibleOptions } from '../src/engine/director';

// Lista negra: si aparece un nombre real, falla el build.
const BLACKLIST = [
  'rajoy', 'sánchez', 'sanchez', 'iglesias', 'rivera', 'abascal', 'feijóo', 'feijoo', 'aznar', 'zapatero',
  'bárcenas', 'barcenas', 'gürtel', 'gurtel', 'psoe', 'podemos', 'vox', 'ciudadanos', 'génova', 'genova', 'ferraz',
  'iberdrola', 'endesa', 'acs', 'florentino', 'cifuentes', 'casado', 'ayuso', 'puigdemont', 'uco',
];

describe('pack', () => {
  it('ids únicos y al menos dos opciones', () => {
    const ids = PACK.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of PACK) expect(e.options.length, e.id).toBeGreaterThanOrEqual(2);
  });

  it('hay aviso para cada forma de morir', () => {
    const warned = new Set(PACK.filter(e => e.kind === 'warning').map(e => e.warnsFor));
    for (const d of ['influencia-low', 'influencia-high', 'aprobacion-low', 'aprobacion-high', 'medios-low', 'medios-high', 'alerta-high']) {
      expect(warned.has(d as never), d).toBe(true);
    }
  });

  it('trapos y personajes existen', () => {
    const dirtIds = new Set(DIRT.map(d => d.id));
    for (const e of PACK) {
      expect(SPEAKERS[e.speaker], e.speaker).toBeTruthy();
      for (const o of e.options) {
        if (o.gainDirt) expect(dirtIds.has(o.gainDirt), o.gainDirt).toBe(true);
        if (o.useDirt) expect(dirtIds.has(o.useDirt), o.useDirt).toBe(true);
      }
    }
  });

  it('ningún nombre real', () => {
    const text = JSON.stringify([PACK, DIRT]).toLowerCase();
    for (const w of BLACKLIST) expect(new RegExp(`\b${w}\b`).test(text), w).toBe(false);
  });

  it('mil partidas sin romperse y deterministas', () => {
    const play = (seed: number) => {
      const s = newGame(seed, 'PTC');
      for (let i = 0; i < 100; i++) {
        const e = draw(PACK, s);
        const opts = visibleOptions(e, s);
        if (choose(s, e, opts[(seed + i) % opts.length])) break;
      }
      return s.history.map(h => h.eventId).join();
    };
    for (let seed = 1; seed <= 1000; seed++) play(seed);
    expect(play(42)).toBe(play(42));
  });
});
