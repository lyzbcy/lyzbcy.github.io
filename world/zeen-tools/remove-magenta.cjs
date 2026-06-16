/**
 * One-off: remove the magenta chroma-key background from face images.
 * Only touches files under public/faces/ (the project's own copy).
 *
 * - Key color: (250, 0, 250) pure magenta
 * - Tolerance band: pixels close to magenta get partial alpha (anti-aliased edge)
 * - Also cleans stray magenta fringe on character edges by desaturating it.
 */
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const FACES_DIR = path.resolve(__dirname, '..', 'public', 'faces');

// Key color
const KR = 250, KG = 0, KB = 250;
// Max color distance that counts as background
const HARD_DIST = 60;   // within this -> fully transparent
const SOFT_DIST = 110;  // between HARD and SOFT -> gradient alpha

function dist2(r, g, b) {
  const dr = r - KR, dg = g - KG, db = b - KB;
  return dr * dr + dg * dg + db * db;
}

function process(file) {
  const src = path.join(FACES_DIR, file);
  if (!fs.existsSync(src)) { console.log('skip (missing):', file); return; }

  const buf = fs.readFileSync(src);
  const png = PNG.sync.read(buf);
  const d = png.data;
  let removed = 0;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const dd = Math.sqrt(dist2(r, g, b));

    if (dd <= HARD_DIST) {
      d[i + 3] = 0;            // fully transparent background
      removed++;
    } else if (dd <= SOFT_DIST) {
      // soft edge: interpolate alpha, and suppress magenta fringe
      const t = (dd - HARD_DIST) / (SOFT_DIST - HARD_DIST); // 0..1
      let alpha = Math.round(255 * t);
      // fringe suppression: pull green up toward average so leftover magenta
      // near the character doesn't look pinkish
      const avg = (r + g + b) / 3;
      d[i]     = Math.round(r * t + avg * (1 - t));
      d[i + 1] = Math.round(g * t + avg * (1 - t));
      d[i + 2] = Math.round(b * t + avg * (1 - t));
      d[i + 3] = alpha;
      removed++;
    }
  }

  const out = PNG.sync.write(png);
  fs.writeFileSync(src, out);
  const pct = ((removed / (d.length / 4)) * 100).toFixed(1);
  console.log(`processed ${file}: ${removed} px made transparent (${pct}%)`);
}

const files = ['xingxing.png', 'zhouhan.png', 'laoyu.png', 'laoyu2.png', 'zhouhanFri.png'];
files.forEach(process);
console.log('done');
