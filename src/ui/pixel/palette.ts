// Paleta apagada: todo tiene el color de un despacho a las once de la noche.
export const PAL: Record<string, string> = {
  k: '#0d0f13', // casi negro
  d: '#1a1d24',
  g: '#2b3039',
  m: '#454b57',
  l: '#6f7684',
  p: '#a7a196', // papel sucio
  w: '#d6d0c2', // papel
  y: '#c9a24b', // luz de flexo
  Y: '#e8c66a',
  r: '#8e3a33', // tampón
  R: '#b8473d',
  b: '#34506e', // azul institucional
  B: '#4d7097',
  n: '#3f5a43', // verde gastado
  N: '#5d7b55',
  o: '#6b4e36', // madera
  O: '#8a6a4a',
  s: '#c79a7a', // piel
  S: '#a87a5c',
  T: '#7d5640',
  h: '#2a211c', // pelo
  H: '#5a4433',
  G: '#8b8b8b', // canas
};

/** Pinta un sprite de texto en un canvas: cada carácter es un píxel; '.' es transparente. */
export function blit(g: CanvasRenderingContext2D, rows: string[], x: number, y: number, remap: Record<string, string> = {}) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = remap[row[i]] ?? row[i];
      if (ch === '.' || ch === ' ') continue;
      const c = PAL[ch] ?? ch;
      g.fillStyle = c;
      g.fillRect(x + i, y + j, 1, 1);
    }
  }
}

export function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ch: string) {
  g.fillStyle = PAL[ch] ?? ch;
  g.fillRect(x, y, w, h);
}

/** Trama ordenada 2x2 entre dos colores: el degradado de las pantallas viejas. */
export function dither(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: string, b: string, level: number) {
  const m = [[0, 2], [3, 1]];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    g.fillStyle = PAL[m[j % 2][i % 2] < level * 4 ? b : a];
    g.fillRect(x + i, y + j, 1, 1);
  }
}

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
