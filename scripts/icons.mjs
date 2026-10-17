// Genera los iconos de la web-app (PNG) sin dependencias: un hemiciclo de puntos sobre tinta.
// Uso: node scripts/icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const INK = [20, 24, 31], PAPER = [250, 249, 247], ACCENT = [184, 115, 11], RED = [168, 50, 31];

function crc32(buf) {
    let c, crc = 0xffffffff;
    for (let n = 0; n < buf.length; n++) {
        c = (crc ^ buf[n]) & 0xff;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function png(w, h, rgb) {
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
        return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
        raw[y * (w * 3 + 1)] = 0;
        for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) raw[y * (w * 3 + 1) + 1 + x * 3 + c] = rgb[(y * w + x) * 3 + c];
    }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// Escena en coordenadas 0..1 (con margen para iconos "maskable")
function scene() {
    const dots = [];
    const rows = [[0.36, 7], [0.27, 5], [0.18, 3]];
    rows.forEach(([r, k], ri) => {
        if (ri === 2) k = 4;
        for (let j = 0; j < k; j++) {
            const a = Math.PI - (Math.PI * j) / (k - 1);
            const color = a > (Math.PI * 0.62) ? RED : a > (Math.PI * 0.38) ? ACCENT : PAPER;
            dots.push({ x: 0.5 + r * Math.cos(a), y: 0.62 - r * Math.sin(a), r: 0.036 - ri * 0.002, color });
        }
    });
    return dots;
}

function render(size) {
    const ss = 4, rgb = new Uint8Array(size * size * 3), dots = scene();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const acc = [0, 0, 0];
        for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
            const u = (x + (sx + 0.5) / ss) / size, v = (y + (sy + 0.5) / ss) / size;
            let c = INK;
            for (const d of dots) if ((u - d.x) ** 2 + (v - d.y) ** 2 < d.r ** 2) { c = d.color; break; }
            // Línea base del hemiciclo
            if (Math.abs(v - 0.675) < 0.006 && u > 0.1 && u < 0.9) c = PAPER;
            for (let i = 0; i < 3; i++) acc[i] += c[i];
        }
        for (let i = 0; i < 3; i++) rgb[(y * size + x) * 3 + i] = Math.round(acc[i] / (ss * ss));
    }
    return png(size, size, rgb);
}

mkdirSync('public/icons', { recursive: true });
for (const s of [180, 192, 512]) writeFileSync(`public/icons/icon-${s}.png`, render(s));
console.log('icons ok');
