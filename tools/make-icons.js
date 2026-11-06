// Generates PNG launcher icons (no dependencies): node tools/make-icons.js
"use strict";

const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const BG = [180, 35, 24]; // #b42318
const WHITE = [255, 255, 255];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// Shield outline in 512-space, matching icon.svg
function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
  ];
}

function shieldPolygon(scale = 1) {
  const c = 256;
  const s = (p) => [c + (p[0] - c) * scale, c + (p[1] - c) * scale];
  const pts = [s([112, 120]), s([400, 120]), s([400, 250])];
  for (let t = 0.05; t <= 1; t += 0.05) pts.push(s(cubic([400, 250], [400, 340], [340, 410], [256, 448], t)));
  for (let t = 0.05; t <= 1; t += 0.05) pts.push(s(cubic([256, 448], [172, 410], [112, 340], [112, 250], t)));
  return pts;
}

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function inCheck(x, y, scale = 1) {
  const c = 256;
  const s = (p) => [c + (p[0] - c) * scale, c + (p[1] - c) * scale];
  const a = s([180, 250]);
  const b = s([236, 306]);
  const d = s([336, 196]);
  const w = 18 * scale;
  return distToSegment(x, y, a[0], a[1], b[0], b[1]) <= w || distToSegment(x, y, b[0], b[1], d[0], d[1]) <= w;
}

function inRoundedRect(x, y, size, radius) {
  const r = radius;
  if (x >= r && x < size - r) return true;
  if (y >= r && y < size - r) return true;
  const cx = x < r ? r : size - r;
  const cy = y < r ? r : size - r;
  return Math.hypot(x - cx, y - cy) <= r;
}

function render(size, { maskable }) {
  const scale = size / 512;
  const glyphScale = maskable ? 0.8 : 1;
  const shield = shieldPolygon(glyphScale);
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const sx = (x + 0.5) / scale;
      const sy = (y + 0.5) / scale;
      let color = null;
      if (maskable || inRoundedRect(x + 0.5, y + 0.5, size, 96 * scale)) {
        color = BG;
        if (pointInPolygon(sx, sy, shield)) {
          color = inCheck(sx, sy, glyphScale) ? BG : WHITE;
        }
      }
      if (color) {
        rgba[i] = color[0];
        rgba[i + 1] = color[1];
        rgba[i + 2] = color[2];
        rgba[i + 3] = 255;
      }
    }
  }
  return encodePng(size, size, rgba);
}

const outDir = path.join(__dirname, "..", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const [name, size, maskable] of [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true]
]) {
  fs.writeFileSync(path.join(outDir, name), render(size, { maskable }));
  console.log("wrote", name);
}
