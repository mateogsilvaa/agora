import { describe, expect, it } from 'vitest';
import { CARGOS, ENDINGS, PACK } from '../src/content';
import { choose, draw, newCareer } from '../src/engine/game';
import { visibleOptions } from '../src/engine/director';
import { SCENES } from '../src/ui/pixel/scenes';

// Lista negra: si aparece un nombre real, falla el build.
const BLACKLIST = [
  'rajoy', 'sánchez', 'sanchez', 'iglesias', 'rivera', 'abascal', 'feijóo', 'feijoo', 'aznar', 'zapatero',
  'bárcenas', 'barcenas', 'gürtel', 'gurtel', 'psoe', 'pp', 'podemos', 'vox', 'ciudadanos', 'sumar', 'génova', 'genova', 'ferraz',
  'iberdrola', 'endesa', 'naturgy', 'blackstone', 'florentino', 'cifuentes', 'casado', 'ayuso', 'puigdemont', 'uco',
];
const CHANNELS = ['mensaje', 'despacho', 'correo', 'pleno', 'calle', 'llamada'];

describe('mazo', () => {
  it('ids únicos, canales válidos y al menos dos opciones', () => {
    const ids = PACK.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of PACK) {
      expect(e.options.length, e.id).toBeGreaterThanOrEqual(2);
      expect(CHANNELS, e.id).toContain(e.channel);
    }
  });

  it('cada cargo, escenario y final existe', () => {
    for (const e of PACK) {
      expect(CARGOS[e.from], `${e.id}: ${e.from}`).toBeTruthy();
      if (e.scene) expect(SCENES[e.scene], `${e.id}: ${e.scene}`).toBeTruthy();
      for (const o of e.options) if (o.end) expect(ENDINGS[o.end], o.end).toBeTruthy();
    }
  });

  it('hay aviso para cada forma de caer', () => {
    const warned = new Set(PACK.filter(e => e.kind === 'warning').map(e => e.warnsFor));
    for (const d of ['influencia-low', 'influencia-high', 'opinion-low', 'opinion-high', 'prensa-low', 'prensa-high', 'judicial-high']) {
      expect(warned.has(d as never), d).toBe(true);
    }
  });

  it('hay un ascenso por etapa', () => {
    for (let stage = 1; stage <= 7; stage++) {
      expect(PACK.some(e => e.kind === 'promotion' && e.stage[0] <= stage && e.stage[1] >= stage), `etapa ${stage}`).toBe(true);
    }
  });

  it('ningún nombre real', () => {
    const text = JSON.stringify([PACK, CARGOS, ENDINGS]).toLowerCase();
    for (const w of BLACKLIST) expect(new RegExp(`\\b${w}\\b`).test(text), w).toBe(false);
  });

  it('mil carreras sin romperse y deterministas', () => {
    const play = (seed: number) => {
      const s = newCareer(seed);
      for (let i = 0; i < 400; i++) {
        const e = draw(PACK, s);
        expect(e, `carrera ${seed}, mes ${s.turn}`).toBeTruthy();
        const opts = visibleOptions(e, s);
        if (choose(s, e, opts[(seed + i) % opts.length], ENDINGS)) break;
      }
      return s.history.map(h => h.eventId).join();
    };
    for (let seed = 1; seed <= 1000; seed++) play(seed);
    expect(play(42)).toBe(play(42));
  });
});
