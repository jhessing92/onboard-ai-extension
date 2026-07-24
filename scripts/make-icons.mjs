// Generates the extension icons (16/48/128) and the 32px ⌘-mode cursor as
// PNGs with zero dependencies (manual PNG encode + node:zlib deflate).
// Shoofly brand: navy rounded square with a teal 4-point sparkle + gold accent.
// Cursor: transparent, teal sparkle with a navy halo so it reads on any bg.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- minimal PNG encoder -----------------------------------------------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// --- shape helpers -------------------------------------------------------
// 4-point sparkle: superellipse |x|^p + |y|^p <= R^p with p < 1 (concave).
const inStar = (dx, dy, R, p = 0.55) =>
  Math.pow(Math.abs(dx) / R, p) + Math.pow(Math.abs(dy) / R, p) <= 1;

function inRoundedSquare(x, y, size, radius) {
  const inX = x >= 0 && x <= size;
  const inY = y >= 0 && y <= size;
  if (!inX || !inY) return false;
  const cx = Math.max(radius - x, 0, x - (size - radius));
  const cy = Math.max(radius - y, 0, y - (size - radius));
  return cx * cx + cy * cy <= radius * radius;
}

const lerp = (a, b, t) => a + (b - a) * t;

// 2x2 supersampled render; shade(x, y) → [r,g,b,a] or null (transparent).
function render(size, shade) {
  const px = Buffer.alloc(size * size * 4);
  const SUB = [0.25, 0.75];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (const sy of SUB) {
        for (const sx of SUB) {
          const c = shade(x + sx, y + sy);
          if (c) {
            r += c[0] * (c[3] / 255);
            g += c[1] * (c[3] / 255);
            b += c[2] * (c[3] / 255);
            a += c[3];
          }
        }
      }
      const n = SUB.length * SUB.length;
      a /= n;
      const i = (y * size + x) * 4;
      if (a > 0) {
        // premultiplied average back to straight alpha
        px[i] = Math.min(255, Math.round((r / n) / (a / 255)));
        px[i + 1] = Math.min(255, Math.round((g / n) / (a / 255)));
        px[i + 2] = Math.min(255, Math.round((b / n) / (a / 255)));
        px[i + 3] = Math.round(a);
      }
    }
  }
  return px;
}

function icon(size) {
  const c = size / 2;
  const corner = size * 0.22;
  const R = size * 0.34;
  const R2 = size * 0.13;
  const off = size * 0.24;
  return render(size, (x, y) => {
    const dx = x - c;
    const dy = y - c;
    // sparkles on top: teal main + gold accent
    if (inStar(dx, dy + size * 0.04, R)) return [62, 184, 208, 255];
    if (inStar(dx - off, dy + off, R2)) return [232, 184, 72, 255];
    if (!inRoundedSquare(x, y, size, corner)) return null;
    // navy vertical gradient (#0d2035 → #0a1628)
    const t = y / size;
    return [Math.round(lerp(13, 10, t)), Math.round(lerp(32, 22, t)), Math.round(lerp(53, 40, t)), 255];
  });
}

function cursor(size) {
  const c = size / 2;
  return render(size, (x, y) => {
    const dx = x - c;
    const dy = y - c;
    if (inStar(dx, dy, size * 0.30)) return [62, 184, 208, 255]; // teal core
    if (inStar(dx, dy, size * 0.42)) return [10, 22, 40, 235]; // navy halo
    return null;
  });
}

mkdirSync(join(root, 'public/icons'), { recursive: true });
for (const s of [16, 48, 128]) {
  writeFileSync(join(root, `public/icons/icon${s}.png`), encodePng(s, s, icon(s)));
}
writeFileSync(join(root, 'public/cursor.png'), encodePng(32, 32, cursor(32)));
console.log('icons + cursor written');
