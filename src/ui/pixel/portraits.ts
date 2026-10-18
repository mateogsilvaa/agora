import { blit, hash, rect } from './palette';

// Retratos de 16x16 generados a partir del cargo: siempre la misma cara para el mismo despacho.
// s = piel, h = pelo, c = ropa, t = corbata o cuello, e = ojos, k = contorno

const HEAD = [
  '................',
  '................',
  '.....kkkkkk.....',
  '....kssssssk....',
  '...kssssssssk...',
  '...kssssssssk...',
  '...ksekssseks...',
  '...kssssssssk...',
  '...ksssskssk....',
  '....kssssssk....',
  '.....kssssk.....',
  '......kssk......',
  '...kkkcttckkk...',
  '..kcccctcccccck.',
  '.kccccctcccccck.',
  '.kccccctcccccck.',
];

const HAIR: string[][] = [
  // corto
  ['.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hh......hh...'],
  // raya al lado
  ['.....hhhhhhh....', '....hhhhhhhhhh..', '...hhhhhhhhhhh..', '...h.......hh...'],
  // melena
  ['.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '..hhh......hhh..', '..hh........hh..', '..hh........hh..', '..hh........hh..', '..hh........hh..', '..hh........hh..'],
  // entradas
  ['................', '................', '.....k....k.....', '...hh......hh...'],
  // moño
  ['......hhhh......', '.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hh......hh...'],
];

const GLASSES = ['...kkkkkkkkkk...', '...kw.kkkk.wk...'];

const SKINS = [['s', 'S'], ['S', 'T'], ['s', 's'], ['T', 'T']];
const HAIRS = ['h', 'H', 'G', 'k'];
const CLOTHES = ['g', 'b', 'k', 'm', 'n', 'o'];
const TIES = ['r', 'w', 'b', 'y', 'p'];

// Cargos que no tienen cara: el poder que no se deja ver.
const FACELESS = new Set(['fondo', 'consejo_admin', 'anonimo', 'enlace_moncloa']);

export function paintPortrait(canvas: HTMLCanvasElement, id: string) {
  const g = canvas.getContext('2d')!;
  canvas.width = 16;
  canvas.height = 16;
  const n = hash(id);
  const bg = ['d', 'g', 'm', 'b'][n % 4];
  rect(g, 0, 0, 16, 16, bg);

  if (FACELESS.has(id)) {
    // solo traje y una sombra donde iría la cara
    const head = HEAD.map(r => r.replace(/[se]/g, 'k'));
    blit(g, head, 0, 0, { c: 'g', t: id === 'anonimo' ? 'g' : 'r' });
    if (id === 'anonimo') blit(g, ['.....kkkk.......', '........k.......', '.......k........', '................', '.......k........'], 1, 4, { k: 'l' });
    return;
  }

  const [skin, shade] = SKINS[(n >>> 3) % SKINS.length];
  const hair = HAIRS[(n >>> 5) % HAIRS.length];
  const cloth = CLOTHES[(n >>> 7) % CLOTHES.length];
  const tie = TIES[(n >>> 9) % TIES.length];
  blit(g, HEAD, 0, 0, { s: skin, c: cloth, t: tie, e: 'k' });
  // sombra en el lado derecho de la cara
  for (let y = 4; y < 11; y++) rect(g, 11, y, 1, 1, shade);
  blit(g, HAIR[(n >>> 11) % HAIR.length], 0, 1, { h: hair });
  if ((n >>> 13) % 3 === 0) blit(g, GLASSES, 0, 6);
}
