import type { QuizTest, Ranked } from '../quiz/types';
import { headline } from '../quiz/score';
import { SITE } from '../tests';
import { track } from './firebase';

const NAME_KEY = 'votagora:nombre';
export function getName(): string {
  try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; }
}
export function setName(n: string) {
  try { localStorage.setItem(NAME_KEY, n.trim().slice(0, 24)); } catch { /* nada */ }
}

/** Enlace de reto: quien lo abra hace el test y ve en qué coincidís. */
export function challengeUrl(test: QuizTest, answers: string, name: string, src: string) {
  const p = new URLSearchParams({ vs: answers });
  if (name) p.set('n', name);
  p.set('utm_source', src);
  return `${SITE}/test/${test.slug}/?${p}`;
}

export function shareText(test: QuizTest, top: Ranked) {
  const tail = top.profile.tagline ? `, ${top.profile.tagline}` : '';
  return `${headline(test, top)}${tail}. ¿Tú qué eres?`;
}

// ── Imagen cuadrada 1080x1080 ──────────────────────────────────

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > max && line) { lines.push(line); line = w; } else line = t;
  }
  lines.push(line);
  lines.forEach((l, i) => g.fillText(l, x, y + i * lh));
  return y + lines.length * lh;
}

function countLines(g: CanvasRenderingContext2D, text: string, max: number) {
  let lines = 1, line = '';
  for (const w of text.split(' ')) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > max && line) { lines++; line = w; } else line = t;
  }
  return lines;
}

/** Ajusta el tamaño de letra hasta que el texto quepa en `maxLines` líneas. */
function fit(g: CanvasRenderingContext2D, text: string, max: number, maxLines: number, size: number, weight: number, min = 40) {
  for (let s = size; s >= min; s -= 4) {
    g.font = `${weight} ${s}px "Bricolage Grotesque", Inter, sans-serif`;
    let lines = 1, line = '';
    for (const w of text.split(' ')) {
      const t = line ? `${line} ${w}` : w;
      if (g.measureText(t).width > max && line) { lines++; line = w; } else line = t;
    }
    if (lines <= maxLines) return s;
  }
  return min;
}

export async function resultImage(test: QuizTest, top: Ranked): Promise<Blob> {
  await document.fonts.ready;
  const S = 1080;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d')!;

  g.fillStyle = test.color;
  g.fillRect(0, 0, S, S);
  // bloque de color del perfil, inclinado
  g.save();
  g.translate(S / 2, S * 0.56);
  g.rotate(-0.06);
  g.fillStyle = top.profile.color;
  g.fillRect(-S, -200, S * 2, 400);
  g.restore();

  g.fillStyle = test.ink;
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.font = '800 44px "Bricolage Grotesque", Inter, sans-serif';
  g.fillText('VOTÁGORA', 80, 120);
  g.font = '500 30px Inter, sans-serif';
  g.globalAlpha = 0.75;
  g.fillText(test.title, 80, 168);
  g.globalAlpha = 1;

  // Se mide antes el bloque nombre + remate para que nunca pise el pie
  const size = fit(g, top.profile.name, S - 160, 2, 104, 800);
  g.font = `800 ${size}px "Bricolage Grotesque", Inter, sans-serif`;
  const nameLines = countLines(g, top.profile.name, S - 160);
  g.font = 'italic 500 38px Inter, sans-serif';
  const tagLines = countLines(g, top.profile.tagline, S - 160);
  const lh = size * 1.02;
  // baseline de la última línea del remate a 200 px del borde
  const tagLast = S - 200;
  const tagFirst = tagLast - (tagLines - 1) * 48;
  const nameFirst = Math.min(680, tagFirst - 58 - (nameLines - 1) * lh);

  g.font = '800 250px "Bricolage Grotesque", Inter, sans-serif';
  g.fillText(`${top.pct}%`, 70, nameFirst - size - 20);

  g.font = `800 ${size}px "Bricolage Grotesque", Inter, sans-serif`;
  wrap(g, top.profile.name, 80, nameFirst, S - 160, lh);

  g.font = 'italic 500 38px Inter, sans-serif';
  wrap(g, top.profile.tagline, 80, nameFirst + (nameLines - 1) * lh + 58, S - 160, 48);

  g.font = '800 46px "Bricolage Grotesque", Inter, sans-serif';
  g.fillText('¿Tú qué eres?', 80, S - 120);
  g.font = '500 32px Inter, sans-serif';
  g.globalAlpha = 0.8;
  g.fillText(`votagora.es/test/${test.slug}`, 80, S - 70);
  g.globalAlpha = 1;

  return new Promise(r => c.toBlob(b => r(b!), 'image/png'));
}

export async function shareImage(test: QuizTest, top: Ranked, url: string) {
  const blob = await resultImage(test, top);
  const file = new File([blob], `votagora-${test.slug}.png`, { type: 'image/png' });
  const text = shareText(test, top);
  track({ type: 'share', slug: test.slug, channel: 'imagen' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: `${text} ${url}` }); return 'compartido'; } catch { return 'cancelado'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'descargado';
}

export function openShare(channel: 'whatsapp' | 'x', text: string, url: string, slug: string) {
  track({ type: 'share', slug, channel });
  const href = channel === 'whatsapp'
    ? `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
    : `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  window.open(href, '_blank', 'noopener');
}

export async function copyLink(url: string, slug: string) {
  track({ type: 'share', slug, channel: 'copiar' });
  try { await navigator.clipboard.writeText(url); return true; } catch { return false; }
}
