// Generates the 440×280 Chrome Web Store small promo tile with zero deps,
// reusing the manual PNG encode approach from make-icons.mjs.
// Navy brand gradient + teal/gold sparkle mark + pixel wordmark.
// Output: store/assets/promo-tile-440x280.png
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- minimal PNG encoder (same as make-icons.mjs) ------------------------
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
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// --- 4-point sparkle (concave superellipse), as in the icon --------------
const inStar = (dx, dy, R, p = 0.55) =>
  Math.pow(Math.abs(dx) / R, p) + Math.pow(Math.abs(dy) / R, p) <= 1;
const lerp = (a, b, t) => a + (b - a) * t;

// --- tiny 5×7 pixel font (only the glyphs the wordmark needs) ------------
const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

const W = 440;
const H = 280;
// overlay: 0 none, 1 cream, 2 gold
const overlay = new Uint8Array(W * H);

function stampText(text, scale, centerX, topY, colorIdx) {
  const cw = 5 * scale;
  const gap = 1 * scale;
  const total = text.length * cw + (text.length - 1) * gap;
  let x0 = Math.round(centerX - total / 2);
  for (const ch of text) {
    const glyph = FONT[ch];
    if (!glyph) throw new Error(`missing glyph: ${ch}`);
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (glyph[r][c] !== '#') continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const x = x0 + c * scale + dx;
            const y = topY + r * scale + dy;
            if (x >= 0 && x < W && y >= 0 && y < H) overlay[y * W + x] = colorIdx;
          }
        }
      }
    }
    x0 += cw + gap;
  }
}

stampText('ONBOARDAI', 6, W / 2, 158, 1); // cream, 42px tall
stampText('BY SHOOFLY', 3, W / 2, 222, 2); // gold, 21px tall

// --- render with 2×2 supersampling for the sparkle edges -----------------
const px = Buffer.alloc(W * H * 4);
const SUB = [0.25, 0.75];
const iconCx = W / 2;
const iconCy = 84;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const ov = overlay[y * W + x];
    if (ov === 1) {
      px[i] = 255; px[i + 1] = 254; px[i + 2] = 245; px[i + 3] = 255; // #fffef5
      continue;
    }
    if (ov === 2) {
      px[i] = 232; px[i + 1] = 184; px[i + 2] = 72; px[i + 3] = 255; // #e8b848
      continue;
    }
    // supersample sparkle over the gradient
    let r = 0, g = 0, b = 0;
    for (const sy of SUB) {
      for (const sx of SUB) {
        const dx = x + sx - iconCx;
        const dy = y + sy - iconCy;
        let c;
        if (inStar(dx, dy + 2, 44)) c = [62, 184, 208]; // teal main
        else if (inStar(dx - 31, dy + 31, 17)) c = [232, 184, 72]; // gold accent
        else {
          const t = (y + sy) / H;
          c = [Math.round(lerp(13, 10, t)), Math.round(lerp(32, 22, t)), Math.round(lerp(53, 40, t))];
        }
        r += c[0]; g += c[1]; b += c[2];
      }
    }
    px[i] = Math.round(r / 4);
    px[i + 1] = Math.round(g / 4);
    px[i + 2] = Math.round(b / 4);
    px[i + 3] = 255;
  }
}

mkdirSync(join(root, 'store/assets'), { recursive: true });
const out = join(root, 'store/assets/promo-tile-440x280.png');
writeFileSync(out, encodePng(W, H, px));
console.log('promo tile written →', out);
