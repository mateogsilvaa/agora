// Genera las imágenes para redes (1200x630) de la portada y de cada test en public/og/.
// npm run og   (se ejecuta a mano cuando cambia un test; las imágenes se suben al repo)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { QuizTest } from '../src/quiz/types';

const W = 1200, H = 630;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Corta el texto en líneas de como mucho `max` caracteres. */
function lines(text: string, max: number) {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim();
  }
  out.push(line);
  return out;
}

function card(title: string, sub: string, bg: string, ink: string, accent: string) {
  const size = title.length > 46 ? 64 : 76;
  const tl = lines(title, size === 64 ? 26 : 22).slice(0, 4);
  const sl = lines(sub, 58).slice(0, 2);
  const titleY = 230;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <g transform="rotate(-4 600 520)"><rect x="-100" y="470" width="1400" height="220" fill="${accent}"/></g>
  <text x="70" y="110" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="40" fill="${ink}" letter-spacing="3">VOTÁGORA</text>
  ${tl.map((l, i) => `<text x="70" y="${titleY + i * size * 1.05}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${size}" fill="${ink}">${esc(l)}</text>`).join('\n  ')}
  ${sl.map((l, i) => `<text x="70" y="${560 + i * 36}" font-family="Arial, sans-serif" font-size="28" fill="${ink}">${esc(l)}</text>`).join('\n  ')}
</svg>`;
}

const out = join(process.cwd(), 'public/og');
mkdirSync(out, { recursive: true });
const render = (svg: string, file: string) => {
  const png = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
  writeFileSync(join(out, file), png);
  console.log('og/' + file);
};

render(card('¿Quién eres de verdad? Descúbrelo en un minuto', 'Tests de política, personalidad y vida para compartir y jugar con amigos', '#16130f', '#f4efe4', '#e2b13c'), 'home.png');

const dir = join(process.cwd(), 'content/tests');
for (const f of readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const t = JSON.parse(readFileSync(join(dir, f), 'utf8')) as QuizTest;
  render(card(t.title, `${t.questions.length} tarjetas · ${t.minutes} min · Desliza y comparte tu resultado`, t.color, t.ink, t.profiles[0].color), `${t.slug}.png`);
}
