// Builds "Brain Waves & AI — Tutorial #2: The Shape of Brain Data".
// A 14-year-old-friendly deck on the MATH behind the BCI IV 2a data shape:
//   576 clips × 22 channels × 1125 samples · 250 Hz · 4.50 s per clip.
// Same palette, helpers, and generated assets as build.js (Tutorial #1).
const path = require("path");
const pptxgen = require("pptxgenjs");
const A = (f) => path.join(__dirname, "assets", f);

// ---- Palette (matches Tutorial #1) ----
const INK = "1E1B34";
const SLATE = "5B6472";
const CYAN = "22D3EE";
const TEAL = "2DD4BF";
const AMBER = "FBBF24";
const VIOLET = "5B2A9D";
const INDIGO = "241356";
const CORAL = "FB7185";
const MIST = "F2F3FA";
const LINE = "E2E4F1";
const WHITE = "FFFFFF";
const HF = "Cambria";       // headers
const BF = "Calibri";       // body
const MONO = "Courier New"; // numbers / equations

const W = 13.33, H = 7.5, M = 0.62;

const pres = new pptxgen();
pres.defineLayout({ name: "W", width: W, height: H });
pres.layout = "W";
pres.author = "BrainWerks";
pres.title = "Brain Waves & AI — Tutorial #2";

// ---- helpers (copied from build.js so this file stands alone) ----
function shadow(o = {}) {
  return Object.assign({ type: "outer", color: "1A1636", opacity: 0.22, blur: 7, offset: 3, angle: 90 }, o);
}
function darkBg(slide) {
  slide.background = { color: INDIGO };
  slide.addImage({ path: A("bg_dark.png"), x: 0, y: 0, w: W, h: H });
}
function badge(slide, x, y, d, color, iconWhite) {
  slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color }, line: { type: "none" }, shadow: shadow({ blur: 6, offset: 2 }) });
  const ins = d * 0.27;
  const f = iconWhite.endsWith(".png") ? iconWhite : iconWhite + ".png";
  slide.addImage({ path: A(f), x: x + ins, y: y + ins, w: d - 2 * ins, h: d - 2 * ins });
}
function kicker(slide, x, y, text, color = TEAL) {
  slide.addText(text.toUpperCase(), { x, y, w: 10, h: 0.3, fontFace: BF, fontSize: 12.5, bold: true, color, charSpacing: 2, margin: 0 });
}
function title(slide, x, y, w, text, color = INK, size = 34) {
  slide.addText(text, { x, y, w, h: 1.0, fontFace: HF, fontSize: size, bold: true, color, margin: 0, lineSpacingMultiple: 0.98 });
}
function bullets(slide, x, y, w, h, items, opt = {}) {
  const fs = opt.fontSize || 15.5;
  const runs = items.map((it) => ({
    text: typeof it === "string" ? it : it.t,
    options: {
      bullet: { code: "2022", indent: 16 },
      color: opt.color || INK, fontFace: BF, fontSize: fs,
      paraSpaceAfter: opt.gap != null ? opt.gap : 10, paraSpaceBefore: 0, breakLine: true,
    },
  }));
  slide.addText(runs, { x, y, w, h, valign: "top", margin: 0 });
}
function card(slide, x, y, w, h, fill = MIST, lineC = LINE) {
  slide.addShape("roundRect", { x, y, w, h, rectRadius: 0.11, fill: { color: fill }, line: { color: lineC, width: 1 }, shadow: shadow({ opacity: 0.1, blur: 8, offset: 2 }) });
}
// A big equation strip: array of {t, c?} tokens rendered in mono, centered.
function equation(slide, x, y, w, tokens, size = 24) {
  slide.addText(
    tokens.map((t) => ({ text: t.t, options: { fontFace: MONO, fontSize: size, bold: true, color: t.c || INK } })),
    { x, y, w, h: 0.7, align: "center", valign: "middle", margin: 0 }
  );
}

// =========================================================
// 1. TITLE
// =========================================================
(() => {
  const s = pres.addSlide();
  darkBg(s);
  s.addImage({ path: A("wave_cyan.png"), x: 0, y: 4.55, w: W, h: 1.0, transparency: 10 });
  badge(s, M, 0.75, 1.15, TEAL, "target_w");
  s.addText("BRAIN WAVES  ×  ARTIFICIAL INTELLIGENCE  ·  TUTORIAL #2", { x: M + 1.35, y: 0.95, w: 11, h: 0.4, fontFace: BF, fontSize: 13, bold: true, color: CYAN, charSpacing: 2, margin: 0 });
  s.addText("The Shape of\nBrain Data", { x: M, y: 2.15, w: 11.5, h: 2.2, fontFace: HF, fontSize: 60, bold: true, color: WHITE, lineSpacingMultiple: 0.95, margin: 0 });
  s.addText("Where does a number like  576 × 22 × 1125  come from? Let's build it up, one piece at a time.", { x: M, y: 4.75, w: 11.4, h: 0.8, fontFace: BF, fontSize: 18, color: "D7D2F0", margin: 0 });
  s.addText([
    { text: "A lesson built from ", options: {} },
    { text: "braindecode", options: { italic: true, color: TEAL } },
    { text: "  ·  the BCI Competition IV 2a dataset", options: {} },
  ], { x: M, y: 6.5, w: 11.6, h: 0.4, fontFace: BF, fontSize: 14, color: "B9B3DE", margin: 0 });
  s.addNotes("Tutorial #2. Last time we trained a tiny AI on brain signals. Today we zoom in on ONE thing: the shape of the data — 576 clips x 22 channels x 1125 samples, at 250 Hz, 4.5 seconds per clip. It looks scary; it's really just multiplication. We'll build every number.");
})();

// =========================================================
// 2. THE TARGET NUMBER (roadmap)
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "The number we're decoding");
  title(s, M, 0.9, 12, "This one line describes the whole dataset", INK, 30);
  card(s, M, 1.95, 12.1, 1.15, INDIGO, INDIGO);
  equation(s, M, 2.16, 12.1, [
    { t: "576", c: CORAL }, { t: "  clips  ×  ", c: "CFC8F0" },
    { t: "22", c: CYAN }, { t: "  channels  ×  ", c: "CFC8F0" },
    { t: "1125", c: AMBER }, { t: "  samples", c: "CFC8F0" },
  ], 26);
  s.addText("250 Hz   ·   4.50 seconds per clip", { x: M, y: 2.66, w: 12.1, h: 0.4, align: "center", fontFace: MONO, fontSize: 14, bold: true, color: TEAL, margin: 0 });
  s.addText("Four questions unlock it:", { x: M, y: 3.35, w: 12, h: 0.4, fontFace: HF, fontSize: 17, bold: true, color: INK, margin: 0 });
  const q = [
    ["clock_w", CYAN, "How FAST?", "250 snapshots every second (250 Hz)."],
    ["ruler_w", AMBER, "How LONG?", "4.5 s per clip → 1125 samples."],
    ["columns_w", TEAL, "How MANY sensors?", "22 electrodes = 22 channels."],
    ["cut_w", CORAL, "How MANY clips?", "576 labeled trials in total."],
  ];
  const cw = 2.94, gap = 0.13;
  let x = M;
  q.forEach((r) => {
    card(s, x, 3.9, cw, 2.7, MIST);
    badge(s, x + cw / 2 - 0.55, 4.1, 1.1, r[1], r[0]);
    s.addText(r[2], { x, y: 5.25, w: cw, h: 0.4, align: "center", fontFace: HF, fontSize: 16, bold: true, color: INK, margin: 0 });
    s.addText(r[3], { x: x + 0.15, y: 5.7, w: cw - 0.3, h: 0.85, align: "center", valign: "top", fontFace: BF, fontSize: 12.5, color: SLATE, margin: 0 });
    x += cw + gap;
  });
  s.addNotes("Roadmap for the deck. The whole dataset is one line of numbers. To understand it, answer four questions: how fast we sample, how long each clip is, how many sensors, and how many clips. Each is one slide, each is simple multiplication.");
})();

// =========================================================
// 3. 250 Hz — snapshots of the brain
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "Piece 1 · How fast", CYAN);
  title(s, M, 0.9, 8.2, "250 Hz = 250 snapshots\nevery second", INK, 32);
  bullets(s, M, 2.75, 6.7, 3.4, [
    "The EEG doesn't record a smooth line — it takes super-fast snapshots of the voltage, over and over.",
    "'Hz' (hertz) means 'times per second'. 250 Hz = 250 snapshots each second.",
    "Think of a movie camera: enough snapshots per second and it looks like smooth motion.",
  ], { fontSize: 15.5, gap: 12 });
  card(s, 7.7, 2.05, 5.05, 4.55, INDIGO, INDIGO);
  badge(s, 9.55, 2.55, 1.35, CYAN, "clock_w");
  s.addText("1 second", { x: 7.9, y: 4.15, w: 4.65, h: 0.4, align: "center", fontFace: BF, fontSize: 13, color: "CFC8F0", margin: 0 });
  s.addText("÷ 250 snapshots", { x: 7.9, y: 4.5, w: 4.65, h: 0.5, align: "center", fontFace: HF, fontSize: 22, bold: true, color: WHITE, margin: 0 });
  s.addText("= one snapshot every", { x: 7.9, y: 5.25, w: 4.65, h: 0.4, align: "center", fontFace: BF, fontSize: 13, color: "CFC8F0", margin: 0 });
  s.addText("4 milliseconds", { x: 7.9, y: 5.6, w: 4.65, h: 0.5, align: "center", fontFace: MONO, fontSize: 22, bold: true, color: CYAN, margin: 0 });
  equation(s, M, 6.45, 7.6, [
    { t: "1000 ms ", c: INK }, { t: "÷ ", c: SLATE }, { t: "250 ", c: CYAN }, { t: "= ", c: SLATE }, { t: "4 ms", c: CORAL }, { t: "  between snapshots", c: SLATE },
  ], 16);
  s.addNotes("Piece 1: sampling rate. 250 Hz means 250 measurements per second. 1000 milliseconds divided by 250 = 4 ms between snapshots — that's the '4 ms per sample' you see in the app. Camera analogy: fast enough snapshots look like smooth motion.");
})();

// =========================================================
// 4. 4.5 s -> 1125 samples
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "Piece 2 · How long", AMBER);
  title(s, M, 0.9, 12, "One clip is 4.5 seconds long", INK, 32);
  bullets(s, M, 1.95, 6.7, 2.7, [
    "We don't feed the AI the whole recording — we cut it into short clips, one per 'imagine a movement' moment.",
    "Each clip starts 0.5 s before the go-cue and lasts to 4.0 s after it: that's 4.5 seconds.",
    "How many snapshots is that? Multiply the length by the speed.",
  ], { fontSize: 15, gap: 11 });
  card(s, 7.7, 1.9, 5.05, 2.75, MIST);
  badge(s, 9.55, 2.15, 1.15, AMBER, "ruler_w");
  s.addText("one clip", { x: 7.9, y: 3.35, w: 4.65, h: 0.4, align: "center", fontFace: BF, fontSize: 13, color: SLATE, margin: 0 });
  s.addText("= 4.50 seconds", { x: 7.9, y: 3.72, w: 4.65, h: 0.6, align: "center", fontFace: HF, fontSize: 24, bold: true, color: INK, margin: 0 });
  card(s, M, 5.05, 12.1, 1.15, INDIGO, INDIGO);
  equation(s, M, 5.27, 12.1, [
    { t: "4.5 s ", c: AMBER }, { t: "× ", c: "CFC8F0" }, { t: "250 samples/s ", c: CYAN }, { t: "= ", c: "CFC8F0" }, { t: "1125 samples", c: WHITE },
  ], 24);
  s.addText("That's why every clip is 1125 samples 'tall' in time.", { x: M, y: 6.4, w: 12, h: 0.4, align: "center", fontFace: BF, fontSize: 13.5, italic: true, color: SLATE, margin: 0 });
  s.addNotes("Piece 2: clip length. A clip runs from 0.5 s before the cue to 4.0 s after = 4.5 seconds. Length times speed: 4.5 s x 250 samples/s = 1125 samples. That is the 1125 in the shape — the number of time-steps in one clip.");
})();

// =========================================================
// 5. 22 channels
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "Piece 3 · How many sensors", TEAL);
  title(s, M, 0.9, 8.4, "22 channels = 22 sensors\nlistening at once", INK, 32);
  bullets(s, M, 2.75, 6.7, 3.2, [
    "The EEG cap in this dataset has 22 electrodes over the parts of the brain that plan movement.",
    "Each electrode is one 'channel' — its own stream of snapshots.",
    "So at every moment in time, we don't get one number — we get 22, one per sensor.",
  ], { fontSize: 15.5, gap: 12 });
  card(s, 7.65, 2.05, 5.1, 4.35, MIST);
  badge(s, 9.55, 2.5, 1.3, TEAL, "columns_w");
  s.addText("22 sensors", { x: 7.85, y: 4.0, w: 4.7, h: 0.45, align: "center", fontFace: HF, fontSize: 20, bold: true, color: INK, margin: 0 });
  s.addText("= 22 rows of numbers, all recorded at the same time.", { x: 7.95, y: 4.55, w: 4.5, h: 1.2, align: "center", fontFace: BF, fontSize: 13, color: SLATE, margin: 0 });
  s.addNotes("Piece 3: channels. 22 electrodes on the scalp = 22 channels. At each time-step you don't get one voltage, you get 22 — one per sensor. That is the 22 in the shape.");
})();

// =========================================================
// 6. One clip = a grid (22 × 1125)
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "Put pieces 1–3 together");
  title(s, M, 0.9, 12, "One clip is a grid of numbers", INK, 32);
  s.addText("22 channels going down  ×  1125 time-snapshots going across", { x: M, y: 1.9, w: 12, h: 0.4, fontFace: BF, fontSize: 15, color: SLATE, margin: 0 });
  // mini grid drawing
  const gx = M, gy = 2.55, gw = 7.2, gh = 3.5;
  card(s, gx, gy, gw, gh, WHITE, LINE);
  const rows = 8, cols = 16;
  const cwv = gw / cols, chv = gh / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const shade = ["EAF6FA", "D3ECF6", "BFE4F2", "E6F7F3", "F7ECD6"][(r + c) % 5];
    s.addShape("rect", { x: gx + c * cwv, y: gy + r * chv, w: cwv - 0.02, h: chv - 0.02, fill: { color: shade }, line: { type: "none" } });
  }
  s.addText("22 channels →", { x: gx - 0.02, y: gy - 0.4, w: 3, h: 0.3, fontFace: BF, fontSize: 11, bold: true, color: TEAL, margin: 0 });
  s.addText("1125 samples (time) →", { x: gx + gw - 3.1, y: gy + gh + 0.08, w: 3.1, h: 0.3, align: "right", fontFace: BF, fontSize: 11, bold: true, color: CYAN, margin: 0 });
  // right: the multiply
  card(s, 8.35, 2.55, 4.4, 3.5, INDIGO, INDIGO);
  badge(s, 10.15, 2.85, 1.05, VIOLET, "table_w");
  s.addText("numbers in ONE clip", { x: 8.5, y: 4.05, w: 4.1, h: 0.35, align: "center", fontFace: BF, fontSize: 12.5, color: "CFC8F0", margin: 0 });
  s.addText("22 × 1125", { x: 8.5, y: 4.4, w: 4.1, h: 0.5, align: "center", fontFace: MONO, fontSize: 22, bold: true, color: WHITE, margin: 0 });
  s.addText("= 24,750", { x: 8.5, y: 5.0, w: 4.1, h: 0.6, align: "center", fontFace: MONO, fontSize: 30, bold: true, color: AMBER, margin: 0 });
  s.addText("numbers, for a single 4.5-second clip.", { x: 8.5, y: 5.65, w: 4.1, h: 0.35, align: "center", fontFace: BF, fontSize: 11.5, color: "CFC8F0", margin: 0 });
  s.addText("(The app shows a slice of this exact grid when you click 'View the windows'.)", { x: M, y: 6.5, w: 12, h: 0.4, fontFace: BF, fontSize: 12.5, italic: true, color: SLATE, margin: 0 });
  s.addNotes("Combine pieces 1-3: one clip is a grid, 22 channels tall by 1125 samples wide. 22 x 1125 = 24,750 numbers in a single clip. This is exactly the table the web app shows in 'View the windows'.");
})();

// =========================================================
// 7. Where does 576 come from?
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "Piece 4 · How many clips", CORAL);
  title(s, M, 0.9, 12, "Where does 576 come from?", INK, 32);
  const steps = [
    ["tag_w", VIOLET, "4 movements", "Left hand · Right hand · Feet · Tongue — the 4 labels."],
    ["loop_w", TEAL, "72 tries each", "The person repeats each movement 72 times."],
    ["clock_w", CYAN, "2 days", "Recorded in 2 sessions on different days."],
  ];
  const cw = 3.9, gap = 0.2;
  let x = M;
  steps.forEach((r) => {
    card(s, x, 2.0, cw, 2.35, MIST);
    badge(s, x + cw / 2 - 0.5, 2.2, 1.0, r[1], r[0]);
    s.addText(r[2], { x, y: 3.28, w: cw, h: 0.4, align: "center", fontFace: HF, fontSize: 18, bold: true, color: INK, margin: 0 });
    s.addText(r[3], { x: x + 0.2, y: 3.7, w: cw - 0.4, h: 0.6, align: "center", valign: "top", fontFace: BF, fontSize: 12.5, color: SLATE, margin: 0 });
    x += cw + gap;
  });
  card(s, M, 4.75, 12.1, 1.5, INDIGO, INDIGO);
  equation(s, M, 4.95, 12.1, [
    { t: "4 ", c: VIOLET }, { t: "movements × ", c: "CFC8F0" }, { t: "72 ", c: TEAL }, { t: "tries = ", c: "CFC8F0" }, { t: "288", c: WHITE }, { t: "  per day", c: "CFC8F0" },
  ], 22);
  equation(s, M, 5.55, 12.1, [
    { t: "288 ", c: WHITE }, { t: "× ", c: "CFC8F0" }, { t: "2 ", c: CYAN }, { t: "days = ", c: "CFC8F0" }, { t: "576 clips", c: CORAL },
  ], 24);
  s.addNotes("Piece 4: how many clips. 4 movements, each imagined 72 times = 288 clips in one session. Recorded across 2 days = 288 x 2 = 576 clips total for one person. That's the 576.");
})();

// =========================================================
// 8. Stack them all -> the big box
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "The whole stack");
  title(s, M, 0.9, 12, "Stack every clip into one big box", INK, 32);
  bullets(s, M, 1.95, 6.6, 3.0, [
    "Stack all 576 clips and you get a 3-D box of numbers — scientists call it a tensor.",
    "Its shape is exactly: 576 clips × 22 channels × 1125 samples.",
    "Multiply them out to see how much data that really is.",
  ], { fontSize: 15, gap: 12 });
  card(s, 7.55, 1.95, 5.2, 3.05, INDIGO, INDIGO);
  badge(s, 9.65, 2.2, 1.0, CORAL, "database_w");
  s.addText("576 × 22 × 1125", { x: 7.65, y: 3.35, w: 5.0, h: 0.5, align: "center", fontFace: MONO, fontSize: 21, bold: true, color: WHITE, margin: 0 });
  s.addText("= 14,256,000", { x: 7.65, y: 3.95, w: 5.0, h: 0.6, align: "center", fontFace: MONO, fontSize: 28, bold: true, color: AMBER, margin: 0 });
  s.addText("numbers — over 14 million!", { x: 7.65, y: 4.6, w: 5.0, h: 0.35, align: "center", fontFace: BF, fontSize: 12.5, color: "CFC8F0", margin: 0 });
  card(s, M, 5.35, 12.1, 1.35, MIST);
  s.addText([
    { text: "X ", options: { fontFace: MONO, bold: true, color: CORAL, fontSize: 18 } },
    { text: "= the box of clips   (576, 22, 1125)          ", options: { fontFace: MONO, color: INK, fontSize: 15 } },
    { text: "y ", options: { fontFace: MONO, bold: true, color: VIOLET, fontSize: 18 } },
    { text: "= 576 labels, one movement per clip", options: { fontFace: MONO, color: INK, fontSize: 15 } },
  ], { x: M + 0.2, y: 5.5, w: 11.7, h: 1.05, valign: "middle", align: "center", margin: 0 });
  s.addNotes("Stack all 576 clips: a 3-D box (a tensor) shaped 576 x 22 x 1125. Multiply: that's 14,256,000 numbers — over 14 million — for one subject. The box is X; the 576 labels are y. Same X/y idea as Tutorial #1, just much bigger.");
})();

// =========================================================
// 9. Why it matters + try it
// =========================================================
(() => {
  const s = pres.addSlide();
  darkBg(s);
  s.addImage({ path: A("wave_amber.png"), x: 0, y: 5.7, w: W, h: 0.9, transparency: 20 });
  kicker(s, M, 0.7, "You did the math", AMBER);
  title(s, M, 1.1, 11.8, "Now the shape makes sense", WHITE, 34);
  bullets(s, M, 2.3, 12.0, 2.7, [
    { t: "250 Hz → a snapshot every 4 ms.  4.5 s × 250 = 1125 samples per clip." },
    { t: "22 sensors → 22 channels.  One clip = 22 × 1125 = 24,750 numbers." },
    { t: "4 movements × 72 tries × 2 days = 576 clips.  Whole box = 576 × 22 × 1125 = 14,256,000." },
  ], { fontSize: 16, gap: 12, color: "E8EBFF" });
  card(s, M, 5.15, 12.1, 1.35, "13224A", "2A2A6A");
  s.addText([
    { text: "▶  Try it: ", options: { bold: true, color: CORAL, fontFace: BF, fontSize: 15 } },
    { text: "open Tutorial #2 in the BrainWerks app and click ", options: { color: "E8EBFF", fontFace: BF, fontSize: 15 } },
    { text: "'View the windows'", options: { bold: true, color: CYAN, fontFace: BF, fontSize: 15 } },
    { text: " — you'll see these exact numbers.", options: { color: "E8EBFF", fontFace: BF, fontSize: 15 } },
  ], { x: M + 0.25, y: 5.45, w: 11.6, h: 0.8, valign: "middle", margin: 0 });
  s.addNotes("Recap: every number in 576 x 22 x 1125 came from simple counting and multiplication — speed, length, sensors, and how many clips. Then send them to the app's Tutorial #2 and click 'View the windows' to see the real thing.");
})();

const out = path.join(__dirname, "BrainWaves_Tutorial2.pptx");
pres.writeFile({ fileName: out }).then(() => console.log("wrote", out));
