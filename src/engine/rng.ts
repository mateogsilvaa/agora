// mulberry32: determinista, para que una semilla reproduzca la legislatura entera.
export function next(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t];
}

export function weightedPick<T>(items: T[], weights: number[], state: number): [T, number] {
  const total = weights.reduce((a, b) => a + b, 0);
  const [r, s] = next(state);
  let x = r * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return [items[i], s];
  }
  return [items[items.length - 1], s];
}

export function intBetween(min: number, max: number, state: number): [number, number] {
  const [r, s] = next(state);
  return [min + Math.floor(r * (max - min + 1)), s];
}
