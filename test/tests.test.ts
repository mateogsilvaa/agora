import { describe, expect, it } from 'vitest';
import { TESTS } from '../src/tests';
import { decode, encode, order, rank, similarity } from '../src/quiz/score';
import type { Answer } from '../src/quiz/types';

const BLACKLIST = ['psoe', 'pp', 'vox', 'sumar', 'podemos', 'ciudadanos', 'junts', 'erc', 'bildu', 'pnv', 'sánchez', 'feijóo', 'abascal', 'díaz'];

describe('contenido de los tests', () => {
  it('slugs únicos y válidos', () => {
    const slugs = TESTS.map(t => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  for (const t of TESTS) {
    describe(t.slug, () => {
      it('pesos solo hacia perfiles que existen', () => {
        const ids = new Set(t.profiles.map(p => p.id));
        for (const q of t.questions) for (const k of Object.keys(q.w)) expect(ids.has(k), `${q.id} → ${k}`).toBe(true);
      });

      it('SEO completo', () => {
        expect(t.seoTitle.length).toBeLessThanOrEqual(90);
        expect(t.description.length).toBeGreaterThan(80);
        expect(t.description.length).toBeLessThanOrEqual(170);
        expect(t.faq.length).toBeGreaterThan(0);
      });

      it('todos los perfiles pueden salir', () => {
        const won = new Set<string>();
        let s = 7;
        for (let n = 0; n < 4000; n++) {
          const answers = t.questions.map(() => {
            s = (Math.imul(s, 1103515245) + 12345) >>> 0;
            return ([1, -1, 1, -1, 0] as Answer[])[s % 5];
          });
          won.add(rank(t, answers)[0].profile.id);
        }
        for (const p of t.profiles) expect(won.has(p.id), `${p.id} nunca gana`).toBe(true);
      });

      it('sin siglas ni nombres de políticos reales', () => {
        const text = JSON.stringify(t).toLowerCase();
        for (const w of BLACKLIST) expect(new RegExp(`\\b${w}\\b`).test(text), w).toBe(false);
      });
    });
  }
});

describe('puntuación', () => {
  it('codifica y decodifica', () => {
    const a: Answer[] = [1, -1, 0, 1];
    expect(decode(encode(a))).toEqual(a);
  });
  it('similitud ignora los "paso"', () => {
    expect(similarity([1, -1, 0], [1, 1, 1])).toBe(50);
  });
  it('el orden con la misma semilla es el mismo', () => {
    expect(order(20, 42)).toEqual(order(20, 42));
    expect([...order(20, 42)].sort((a, b) => a - b)).toEqual([...Array(20).keys()]);
  });
});
