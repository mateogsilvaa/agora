import type { Answer, QuizTest, Ranked } from './types';

const PRIOR = 3;

/**
 * Afinidad con cada perfil, de 0 a 100.
 * Para cada perfil: lo que suma tu respuesta frente a lo máximo que podría sumar.
 * Responder "paso" no cuenta ni a favor ni en contra.
 */
export function rank(test: QuizTest, answers: Answer[]): Ranked[] {
  return test.profiles
    .map(profile => {
      let got = 0, max = 0;
      test.questions.forEach((q, i) => {
        const w = q.w[profile.id] ?? 0;
        if (!w || !answers[i]) return;
        got += w * answers[i];
        max += Math.abs(w);
      });
      // PRIOR acerca el resultado al 50 % cuando hay pocas pruebas:
      // un perfil que solo pesa en cinco tarjetas no puede salir al 100 % por cinco "sí".
      const pct = Math.round(((got + max + PRIOR) / (2 * max + 2 * PRIOR)) * 100);
      return { profile, pct };
    })
    .sort((a, b) => b.pct - a.pct);
}

/** Respuestas en la URL: "a" de acuerdo, "d" en desacuerdo, "p" paso. Siempre en el orden original. */
export const encode = (answers: Answer[]) => answers.map(a => (a === 1 ? 'a' : a === -1 ? 'd' : 'p')).join('');
export const decode = (s: string): Answer[] => [...s].map(c => (c === 'a' ? 1 : c === 'd' ? -1 : 0));

/** Cuánto os parecéis: % de tarjetas respondidas igual, entre las que los dos contestasteis. */
export function similarity(a: Answer[], b: Answer[]): number {
  let same = 0, both = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (!a[i] || !b[i]) continue;
    both++;
    if (a[i] === b[i]) same++;
  }
  return both ? Math.round((100 * same) / both) : 0;
}

/** Las tarjetas en las que más chocáis, para enseñarlas al comparar. */
export function clashes(test: QuizTest, a: Answer[], b: Answer[], n = 3) {
  return test.questions
    .map((q, i) => ({ q, i, mine: a[i], theirs: b[i] }))
    .filter(x => x.mine && x.theirs && x.mine !== x.theirs)
    .slice(0, n);
}

/** Orden de las tarjetas: barajado con semilla para que en una sala todos vean el mismo. */
export function order(n: number, seed: number): number[] {
  const idx = [...Array(n).keys()];
  let s = seed >>> 0 || 1;
  for (let i = n - 1; i > 0; i--) {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    const j = s % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

export const headline = (test: QuizTest, r: Ranked) =>
  test.headline.replace('{pct}', String(r.pct)).replace('{name}', r.profile.name);

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
