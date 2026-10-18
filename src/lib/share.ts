import type { Ending, GameState } from '../engine/types';

// Portada de periódico 1080x1350 con tu caída (o tu gloria).
export async function shareCard(s: GameState, end: Ending, causes: string[]) {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1350;
  const g = c.getContext('2d')!;
  await document.fonts.ready;
  g.fillStyle = '#F2EAD8'; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = '#1C1A17';
  g.textAlign = 'center';
  g.font = '900 96px "Playfair Display", Georgia, serif';
  g.fillText('EL VOTÁGORA', 540, 140);
  g.fillRect(60, 170, 960, 6); g.fillRect(60, 184, 960, 2);
  g.font = '500 26px "IBM Plex Mono", monospace';
  g.fillText(`EDICIÓN ESPECIAL · TURNO ${s.turn - 1} · PARTIDO ${s.party}`, 540, 228);

  g.font = '900 104px "Playfair Display", Georgia, serif';
  wrap(g, end.title.toUpperCase(), 540, 380, 940, 110);
  g.font = '400 40px "Source Serif 4", Georgia, serif';
  const y = wrap(g, end.text, 540, 560, 900, 54);

  g.textAlign = 'left';
  g.font = '600 34px "Source Serif 4", Georgia, serif';
  let yy = y + 60;
  if (causes.length) { g.fillText('Las pruebas:', 90, yy); yy += 56; }
  g.font = '400 32px "Source Serif 4", Georgia, serif';
  for (const line of causes) yy = wrap(g, '· ' + line, 90, yy, 900, 44, 'left') + 18;

  g.save();
  g.translate(800, 1180); g.rotate(-0.12);
  g.strokeStyle = '#B3261E'; g.lineWidth = 8; g.strokeRect(-200, -60, 400, 110);
  g.fillStyle = '#B3261E'; g.textAlign = 'center';
  g.font = '900 64px "Playfair Display", Georgia, serif';
  g.fillText(end.win ? 'APROBADO' : 'CESADO', 0, 20);
  g.restore();

  g.fillStyle = '#5B544A'; g.textAlign = 'center';
  g.font = '400 24px Inter, sans-serif';
  g.fillText(`votagora.es · semilla ${s.seed} · Ficción satírica: ningún político real ha sido dañado`, 540, 1310);

  const blob: Blob = await new Promise(r => c.toBlob(b => r(b!), 'image/png'));
  const file = new File([blob], 'votagora.png', { type: 'image/png' });
  const url = `${location.origin}/#s=${s.seed}&p=${s.party}`;
  const text = `${end.title} en el turno ${s.turn - 1}. ¿Duras tú más con mi misma legislatura? ${url}`;
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return; } catch { /* cancelado */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'votagora.png'; a.click();
  navigator.clipboard?.writeText(text).catch(() => {});
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number, align: CanvasTextAlign = 'center') {
  g.textAlign = align;
  let line = '';
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > max && line) { g.fillText(line, x, y); y += lh; line = w; }
    else line = t;
  }
  g.fillText(line, x, y);
  return y + lh;
}
