// Movie-frames / sampling illustration -> sampling.png
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const OUT = path.join(__dirname, "assets");

const W = 2400, H = 560;
const x0 = 90, x1 = 2310, span = x1 - x0;
const N = 9;                       // number of samples / frames
const waveMid = 150, amp = 95;
const stripY0 = 380, stripY1 = 540;
const dotY0 = stripY1 - 30;         // frame baseline
const fw = span / N;

// organic wave value in [-1,1]
const f = (t) => 0.6 * Math.sin(2 * Math.PI * 1.5 * t) + 0.4 * Math.sin(2 * Math.PI * 3 * t + 1);
const sampleT = (i) => (i + 0.5) / N;
const waveX = (t) => x0 + t * span;
const waveY = (t) => waveMid - amp * f(t);

// smooth wave polyline
let wpts = [];
for (let k = 0; k <= 240; k++) { const t = k / 240; wpts.push(`${waveX(t).toFixed(1)},${waveY(t).toFixed(1)}`); }

let el = "";
// drop lines + wave dots
for (let i = 0; i < N; i++) {
  const t = sampleT(i), x = waveX(t), y = waveY(t);
  el += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${stripY0 - 6}" stroke="#FBBF24" stroke-width="3" stroke-dasharray="7 7" opacity="0.7"/>`;
}
// the wave
el += `<polyline points="${wpts.join(" ")}" fill="none" stroke="#22D3EE" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
for (let i = 0; i < N; i++) {
  const t = sampleT(i), x = waveX(t), y = waveY(t);
  el += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="#FBBF24" stroke="#7A4E05" stroke-width="2"/>`;
}

// film strip body
el += `<rect x="${x0}" y="${stripY0}" width="${span}" height="${stripY1 - stripY0}" rx="14" fill="#16112E"/>`;
// sprocket holes
for (let sx = x0 + 26; sx < x1 - 10; sx += 74) {
  el += `<rect x="${sx}" y="${stripY0 + 6}" width="26" height="13" rx="3" fill="#E7E3FA" opacity="0.85"/>`;
  el += `<rect x="${sx}" y="${stripY1 - 19}" width="26" height="13" rx="3" fill="#E7E3FA" opacity="0.85"/>`;
}
// frame dividers + per-frame captured dot (traces the wave)
for (let i = 0; i < N; i++) {
  const fx = x0 + i * fw;
  if (i > 0) el += `<line x1="${fx.toFixed(1)}" y1="${stripY0 + 24}" x2="${fx.toFixed(1)}" y2="${stripY1 - 24}" stroke="#3A2F63" stroke-width="2"/>`;
  const cx = x0 + (i + 0.5) * fw;
  const t = sampleT(i);
  const dy = ((dotY0 + (stripY0 + 34)) / 2) - 34 * f(t); // map value into frame inner band
  // faint frame baseline
  el += `<line x1="${(fx + 12).toFixed(1)}" y1="${((dotY0 + stripY0 + 34) / 2).toFixed(1)}" x2="${(fx + fw - 12).toFixed(1)}" y2="${((dotY0 + stripY0 + 34) / 2).toFixed(1)}" stroke="#4A3E77" stroke-width="2"/>`;
  el += `<circle cx="${cx.toFixed(1)}" cy="${dy.toFixed(1)}" r="9" fill="#FBBF24"/>`;
  el += `<text x="${cx.toFixed(1)}" y="${stripY1 - 6}" font-family="Arial" font-size="17" fill="#9C93C9" text-anchor="middle">#${i + 1}</text>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  ${el}
</svg>`;

sharp(Buffer.from(svg)).png().toBuffer().then((b) => {
  fs.writeFileSync(path.join(OUT, "sampling.png"), b);
  console.log("wrote sampling.png");
});
