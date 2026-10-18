import { blit, dither, rect, PAL } from './palette';

// Escenarios de 96x40 píxeles. Cada uno se compone de cielo/pared, suelo y uno o dos decorados.
export const SCENE_W = 96;
export const SCENE_H = 40;

const FACADE = [
  '..........kkkkkkkkkkkkkkkkkkkkkkkkkkkk..........',
  '.......kkkpppppppppppppppppppppppppppppkkk.......',
  '....kkkppppppppppppppppppppppppppppppppppppkkk....',
  '..kkppppppppppppppppppppppppppppppppppppppppppkk..',
  '.kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.',
  '.kpppppppppppppppppppppppppppppppppppppppppppppk.',
  '..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw...',
  '..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw...',
  '..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw...',
  '..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw...',
  '..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw...',
  '..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw...',
  '..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw...',
  '..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw...',
  '..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw..wpw...',
  '.kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk.',
  'kppppppppppppppppppppppppppppppppppppppppppppppppk',
  'kllllllllllllllllllllllllllllllllllllllllllllllllk',
];

const LION = [
  '..kk...',
  '.kppk..',
  'kpppppk',
  'kpkpppk',
  '.kkkkk.',
  'kpppppk',
  'kkkkkkk',
];

const LAMP = [
  '.kyk.',
  'kYYYk',
  '.kyk.',
  '..k..',
  '..k..',
  '..k..',
  '..k..',
  '..k..',
  '..k..',
  '..k..',
  '..k..',
  '..k..',
  '.kkk.',
];

const BLOCK = [
  'gggggggggggggggggggggg',
  'gmmmmmmmmmmmmmmmmmmmmg',
  'gm.yy..dd..yy..dd..ymg',
  'gm.yy..dd..yy..dd..ymg',
  'gmmmmmmmmmmmmmmmmmmmmg',
  'gm.dd..yy..dd..dd..dmg',
  'gm.dd..yy..dd..dd..dmg',
  'gmmmmmmmmmmmmmmmmmmmmg',
  'gm.yy..dd..dd..yy..ymg',
  'gm.yy..dd..dd..yy..ymg',
  'gmmmmmmmmmmmmmmmmmmmmg',
  'gm.dd..dd..yy..dd..dmg',
  'gm.dd..dd..yy..dd..dmg',
  'gmmmmmmmmmmmmmmmmmmmmg',
  'gmmmmmmmkkkkkkmmmmmmmg',
  'gmmmmmmmkoookkmmmmmmmg',
  'gmmmmmmmkoookkmmmmmmmg',
  'gmmmmmmmkooOokmmmmmmmg',
  'gmmmmmmmkoookkmmmmmmmg',
];

const DESK = [
  '......kkkkkkkkkk........................',
  '......kbbbbbbbbk........................',
  '......kbBBBBBBbk........................',
  '......kbBBBBBBbk..........kkk...........',
  '......kbbbbbbbbk.........kyyyk..........',
  '......kkkkkkkkkk..........kyk...........',
  '..........kk...............k............',
  '........kkkkkk...wwww.....kkk...........',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOk',
  'kooooooooooooooooooooooooooooooooooooook',
  '.ko..................................ok.',
  '.ko..................................ok.',
  '.ko..................................ok.',
  '.ko..................................ok.',
];

const WINDOW = [
  'kkkkkkkkkkkkkkkkkk',
  'kmmmmmmmmmmmmmmmmk',
  'kgggggggggggggggk.',
  'kmmmmmmmmmmmmmmmmk',
  'kgggggggggggggggk.',
  'kmmmmmmmmmmmmmmmmk',
  'kgggggggggggggggk.',
  'kmmmmmmmmmmmmmmmmk',
  'kgggggggggggggggk.',
  'kmmmmmmmmmmmmmmmmk',
  'kkkkkkkkkkkkkkkkkk',
];

const FLAG = [
  'kRRRRRRR',
  'kRRRRRRR',
  'kyyyyyyy',
  'kyyyyyyy',
  'kRRRRRRR',
  'kRRRRRRR',
  'k.......',
  'k.......',
  'k.......',
  'k.......',
  'k.......',
  'k.......',
  'k.......',
  'k.......',
  'k.......',
  'k.......',
  'k.......',
  'k.......',
  'kk......',
];

const TRACTOR = [
  '......kkkk.......',
  '......kwwk.......',
  '......kwwk.......',
  '..kkkkkkkkkkkk...',
  '..kRRRRRRRRRRRk..',
  '.kRRRRRRRRRRRRRk.',
  'kkkkRRRRRRRkkkkk.',
  'kgggkRRRRRkgggggk',
  'kgkgkkkkkkkgkkkgk',
  'kgggk.....kgggggk',
  '.kkk.......kkkkk.',
];

const CAMERA = [
  '..kkkkkkkkk....',
  '.kmmmmmmmmmkkk.',
  '.kmllllllmmkyk.',
  '.kmmmmmmmmmkkk.',
  '..kkkkkkkkk....',
  '.....kkk.......',
  '.....kmk.......',
  '....kkkkk......',
  '...k..k..k.....',
  '..k...k...k....',
  '.k....k....k...',
];

const COUNTER = [
  '..kk..kk...kk..kk....kk......',
  '..kn..kr...kn..ky....kr......',
  '..kn..kr...kn..ky....kr......',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  'kOOOOOOOOOOOOOOOOOOOOOOOOOOOk',
  'kooooooooooooooooooooooooooook',
  'koooooooooooooooooooooooooooo.',
  'koooooooooooooooooooooooooooo.',
];

const MOON = [
  '..kkk.',
  '.kwwk.',
  'kwwk..',
  'kwwk..',
  '.kwwk.',
  '..kkk.',
];

type Painter = (g: CanvasRenderingContext2D) => void;

const sky = (top: string, bottom: string): Painter => g => {
  rect(g, 0, 0, SCENE_W, 14, top);
  dither(g, 0, 14, SCENE_W, 6, top, bottom, 0.5);
  rect(g, 0, 20, SCENE_W, 20, bottom);
};
const floor = (ch: string, y = 33): Painter => g => { rect(g, 0, y, SCENE_W, SCENE_H - y, ch); };
const stars: Painter = g => {
  for (const [x, y] of [[8, 3], [21, 7], [37, 2], [52, 6], [66, 3], [79, 9], [90, 4], [14, 12], [45, 11]]) rect(g, x, y, 1, 1, 'p');
};
const wall = (ch: string, base: string): Painter => g => {
  rect(g, 0, 0, SCENE_W, SCENE_H, ch);
  rect(g, 0, 30, SCENE_W, 1, 'k');
  rect(g, 0, 31, SCENE_W, 9, base);
};

const at = (rows: string[], x: number, y: number, remap?: Record<string, string>): Painter => g => blit(g, rows, x, y, remap);

const institution = (remap?: Record<string, string>): Painter[] => [
  sky('g', 'm'), floor('l', 34), at(FACADE, 23, 16, remap), at(LION, 14, 27), at(LION, 75, 27),
];

export const SCENES: Record<string, Painter[]> = {
  congreso: institution(),
  parlamento: institution({ p: 'l', w: 'p' }),
  ayuntamiento: [...institution({ p: 'O', w: 'p' }), at(FLAG, 44, 0)],
  juzgado: [sky('d', 'g'), floor('m', 34), at(FACADE, 23, 16, { p: 'm', w: 'l' })],
  facultad: [sky('b', 'B'), floor('n', 34), at(FACADE, 23, 16, { p: 'O', w: 'p', l: 'o' }), at(LAMP, 10, 21), at(LAMP, 82, 21)],
  moncloa: [sky('B', 'b'), floor('N', 32), at(BLOCK, 37, 13, { m: 'p', g: 'l', y: 'w', d: 'm' }), at(FLAG, 64, 13)],
  sede: [wall('g', 'd'), at(WINDOW, 8, 6), at(WINDOW, 70, 6), at(FLAG, 46, 10, { y: 'p' })],
  oficina: [wall('d', 'k'), at(WINDOW, 70, 6), at(DESK, 6, 18)],
  redaccion: [wall('g', 'k'), at(DESK, 2, 18), at(DESK, 50, 18, { b: 'n', B: 'N' })],
  casa: [wall('o', 'k'), at(WINDOW, 40, 5, { m: 'b', g: 'B' }), at(LAMP, 18, 18), at(COUNTER, 60, 26, { n: '.', r: '.', y: '.' })],
  bar: [wall('T', 'k'), at(COUNTER, 6, 24), at(COUNTER, 52, 24)],
  calle: [sky('m', 'l'), floor('g', 34), at(BLOCK, 4, 15), at(BLOCK, 66, 15), at(LAMP, 44, 21)],
  portal: [sky('g', 'm'), floor('d', 34), at(BLOCK, 30, 15), at(LAMP, 14, 21), at(LAMP, 78, 21)],
  asamblea: [wall('g', 'd'), at(WINDOW, 8, 5), at(WINDOW, 38, 5), at(WINDOW, 68, 5)],
  campo: [sky('B', 'p'), floor('N', 30), floor('n', 35), at(TRACTOR, 40, 20)],
  carretera: [sky('m', 'l'), floor('n', 30), g => { rect(g, 0, 33, SCENE_W, 7, 'g'); for (let x = 2; x < SCENE_W; x += 10) rect(g, x, 36, 5, 1, 'p'); }, at(LAMP, 76, 18)],
  noche: [sky('k', 'd'), stars, at(MOON, 80, 4), floor('k', 32), at(BLOCK, 6, 16, { m: 'd', g: 'g' }), at(BLOCK, 62, 16, { m: 'd', g: 'g' })],
  plato: [wall('k', 'd'), g => { for (let x = 8; x < SCENE_W; x += 20) rect(g, x, 0, 3, 2, 'Y'); }, at(CAMERA, 8, 20), at(CAMERA, 72, 20), g => rect(g, 30, 25, 36, 3, 'r')],
};

export function paintScene(canvas: HTMLCanvasElement, id: string | undefined) {
  const g = canvas.getContext('2d')!;
  canvas.width = SCENE_W;
  canvas.height = SCENE_H;
  g.clearRect(0, 0, SCENE_W, SCENE_H);
  for (const p of SCENES[id ?? 'oficina'] ?? SCENES.oficina) p(g);
  // viñeta: los bordes se apagan como en un monitor viejo
  g.fillStyle = PAL.k;
  g.globalAlpha = 0.35;
  for (let x = 0; x < SCENE_W; x++) { g.fillRect(x, 0, 1, 1); g.fillRect(x, SCENE_H - 1, 1, 1); }
  for (let y = 0; y < SCENE_H; y++) { g.fillRect(0, y, 1, 1); g.fillRect(SCENE_W - 1, y, 1, 1); }
  g.globalAlpha = 1;
}
