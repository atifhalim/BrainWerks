const path = require("path");
const pptxgen = require("pptxgenjs");
const A = (f) => path.join(__dirname, "assets", f);

// ---- Palette ----
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
const HF = "Cambria";   // headers (safe)
const BF = "Calibri";   // body (safe)
const MONO = "Courier New";

const W = 13.33, H = 7.5, M = 0.62;

const pres = new pptxgen();
pres.defineLayout({ name: "W", width: W, height: H });
pres.layout = "W";

// ---- helpers ----
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
  slide.addText(text.toUpperCase(), { x, y, w: 8, h: 0.3, fontFace: BF, fontSize: 12.5, bold: true, color, charSpacing: 2, margin: 0 });
}
function title(slide, x, y, w, text, color = INK, size = 34) {
  slide.addText(text, { x, y, w, h: 1.0, fontFace: HF, fontSize: size, bold: true, color, margin: 0, lineSpacingMultiple: 0.98 });
}
function bullets(slide, x, y, w, h, items, opt = {}) {
  const fs = opt.fontSize || 15.5;
  const runs = items.map((it, i) => ({
    text: typeof it === "string" ? it : it.t,
    options: {
      bullet: { code: "2022", indent: 16 },
      color: opt.color || INK, fontFace: BF, fontSize: fs,
      paraSpaceAfter: opt.gap != null ? opt.gap : 10, paraSpaceBefore: 0,
      breakLine: true,
    },
  }));
  slide.addText(runs, { x, y, w, h, valign: "top", margin: 0 });
}
function card(slide, x, y, w, h, fill = MIST, lineC = LINE) {
  slide.addShape("roundRect", { x, y, w, h, rectRadius: 0.11, fill: { color: fill }, line: { color: lineC, width: 1 }, shadow: shadow({ opacity: 0.1, blur: 8, offset: 2 }) });
}
function pageWave(slide, colorImg = "wave_faint.png") {
  slide.addImage({ path: A(colorImg), x: 0, y: H - 0.9, w: W, h: 0.75, transparency: 55 });
}

// =========================================================
// 1. TITLE
// =========================================================
(() => {
  const s = pres.addSlide();
  darkBg(s);
  s.addImage({ path: A("wave_cyan.png"), x: 0, y: 4.55, w: W, h: 1.0, transparency: 10 });
  badge(s, M, 0.75, 1.15, VIOLET, "brain_w");
  s.addText("BRAIN WAVES  ×  ARTIFICIAL INTELLIGENCE", { x: M + 1.35, y: 0.95, w: 9, h: 0.4, fontFace: BF, fontSize: 13, bold: true, color: CYAN, charSpacing: 2, margin: 0 });
  s.addText("Reading Minds\nwith Machines", { x: M, y: 2.25, w: 11.5, h: 2.2, fontFace: HF, fontSize: 60, bold: true, color: WHITE, lineSpacingMultiple: 0.95, margin: 0 });
  s.addText("How scientists use your brain's electricity and AI to do real science — and how you can too.", { x: M, y: 4.75, w: 10.6, h: 0.8, fontFace: BF, fontSize: 18, color: "D7D2F0", margin: 0 });
  s.addText([
    { text: "A first lesson built from ", options: {} },
    { text: "braindecode", options: { italic: true, color: TEAL } },
    { text: "  ·  Tutorial #1", options: {} },
  ], { x: M, y: 6.5, w: 11, h: 0.4, fontFace: BF, fontSize: 14, color: "B9B3DE", margin: 0 });
  s.addNotes("Welcome slide. Today we'll go from 'what is a brain wave?' all the way to training a tiny AI on brain signals — using the very first braindecode tutorial. No background needed. We'll watch a few short videos along the way.");
})();

// =========================================================
// 2. ROADMAP
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "Our journey today");
  title(s, M, 0.9, 11, "What you'll learn", INK, 36);
  const rows = [
    ["bolt_w", AMBER, "Your brain runs on electricity", "Billions of neurons firing tiny electrical sparks."],
    ["wave_w", TEAL, "Those sparks make brain waves", "Rhythms we can actually measure from outside the head."],
    ["headset_w", CYAN, "We record them with EEG", "A safe cap of sensors turns thoughts into wiggly lines."],
    ["robot_w", VIOLET, "AI finds the hidden patterns", "Machine learning reads signals humans can't eyeball."],
    ["code_w", CORAL, "You train your own model", "We'll walk through braindecode Tutorial #1, step by step."],
  ];
  let y = 2.05;
  const rh = 0.96;
  rows.forEach((r, i) => {
    card(s, M, y, 12.1, rh - 0.14, MIST);
    badge(s, M + 0.18, y + 0.1, rh - 0.34, r[1], r[0]);
    s.addText(`STEP ${i + 1}`, { x: M + 1.15, y: y + 0.13, w: 5.8, h: 0.28, fontFace: BF, fontSize: 10.5, bold: true, color: r[1], charSpacing: 1, margin: 0 });
    s.addText(r[2], { x: M + 1.15, y: y + 0.37, w: 5.9, h: 0.42, fontFace: HF, fontSize: 17, bold: true, color: INK, valign: "top", margin: 0 });
    s.addText(r[3], { x: M + 7.1, y: y + 0.06, w: 4.85, h: rh - 0.2, fontFace: BF, fontSize: 12.5, color: SLATE, valign: "middle", margin: 0 });
    y += rh;
  });
  s.addNotes("Roadmap. Five steps, bottom to none skipped: electricity -> brain waves -> EEG recording -> AI patterns -> you training a model. Keep this map in mind; each slide is one step.");
})();

// =========================================================
// 3. BRAIN ELECTRICITY
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "Step 1 · The spark", AMBER.slice(0));
  title(s, M, 0.9, 8, "Your brain runs on\nelectricity", INK, 34);
  bullets(s, M, 2.85, 6.7, 3.4, [
    "You have about 86 billion tiny cells called neurons.",
    "Neurons 'talk' by sending little electrical pulses — like tiny sparks passing a message.",
    "Every thought, movement, and feeling is really a pattern of these sparks.",
    "When many neurons spark together, the signal is strong enough to measure from outside your head.",
  ], { fontSize: 15.5, gap: 12 });
  // right visual
  card(s, 7.7, 2.05, 5.05, 4.55, INDIGO, INDIGO);
  s.addImage({ path: A("bg_dark.png"), x: 7.7, y: 2.05, w: 5.05, h: 4.55, sizing: { type: "crop", w: 5.05, h: 4.55 } });
  badge(s, 9.55, 2.7, 1.35, AMBER, "bolt_w");
  s.addText("1 neuron", { x: 7.9, y: 4.35, w: 4.65, h: 0.4, align: "center", fontFace: BF, fontSize: 13, color: "CFC8F0", margin: 0 });
  s.addText("= a tiny battery", { x: 7.9, y: 4.72, w: 4.65, h: 0.5, align: "center", fontFace: HF, fontSize: 22, bold: true, color: WHITE, margin: 0 });
  s.addText("86,000,000,000 of them = a storm of signals", { x: 7.9, y: 5.55, w: 4.65, h: 0.7, align: "center", fontFace: BF, fontSize: 12.5, color: CYAN, margin: 0 });
  s.addText([
    { text: "▶  Watch (5 min): ", options: { bold: true, color: CORAL } },
    { text: "TED-Ed — How do nerves work?", options: { color: INK, hyperlink: { url: "https://www.youtube.com/watch?v=uU_4uA6-zcE", tooltip: "TED-Ed: How do nerves work?" } } },
  ], { x: M, y: 6.55, w: 7, h: 0.4, fontFace: BF, fontSize: 13.5, margin: 0 });
  s.addNotes("Core idea: the brain is electrical. One neuron is a tiny battery; 86 billion firing together create measurable signals. The TED-Ed video shows how nerve signals travel.");
})();

// =========================================================
// 4. WHAT ARE BRAIN WAVES
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "Step 2 · The rhythm");
  title(s, M, 0.9, 11.5, "So what is a 'brain wave'?", INK, 36);
  s.addText([
    { text: "When lots of neurons fire in rhythm together, they create waves of electricity — like a stadium crowd clapping in sync. ", options: {} },
    { text: "Faster rhythms = more alert. Slower = more relaxed or asleep.", options: { bold: true, color: INK } },
  ], { x: M, y: 1.95, w: 12.1, h: 0.9, fontFace: BF, fontSize: 15.5, color: SLATE, margin: 0 });
  s.addImage({ path: A("wave_cyan.png"), x: M, y: 2.95, w: 12.1, h: 0.7 });
  const waves = [
    ["Delta", "0.5–4 Hz", "Deep sleep", VIOLET],
    ["Theta", "4–8 Hz", "Drowsy / dreamy", "3B4CC0"],
    ["Alpha", "8–12 Hz", "Calm & relaxed", TEAL],
    ["Beta", "12–30 Hz", "Awake & focused", CYAN],
    ["Gamma", "30 Hz +", "Intense thinking", AMBER],
  ];
  const cw = 2.28, gap = 0.15;
  let x = M;
  const y = 4.0;
  waves.forEach((wv) => {
    card(s, x, y, cw, 2.55, WHITE, LINE);
    s.addShape("roundRect", { x, y, w: cw, h: 0.62, rectRadius: 0.09, fill: { color: wv[3] }, line: { type: "none" } });
    s.addText(wv[0], { x, y: y + 0.02, w: cw, h: 0.58, align: "center", valign: "middle", fontFace: HF, fontSize: 19, bold: true, color: WHITE, margin: 0 });
    s.addText(wv[1], { x, y: y + 0.85, w: cw, h: 0.5, align: "center", fontFace: MONO, fontSize: 15, bold: true, color: INK, margin: 0 });
    s.addText(wv[2], { x, y: y + 1.5, w: cw, h: 0.8, align: "center", valign: "top", fontFace: BF, fontSize: 13, color: SLATE, margin: 0 });
    x += cw + gap;
  });
  s.addText("Hz = 'hertz' = how many waves per second.  Higher Hz = faster rhythm.", { x: M, y: 6.75, w: 12, h: 0.35, fontFace: BF, fontSize: 12.5, italic: true, color: SLATE, margin: 0 });
  s.addNotes("Brain waves are rhythms made by many neurons firing together. Five main bands from slow (deep sleep, Delta) to fast (intense focus, Gamma). Analogy: a crowd clapping in sync. This is what EEG measures.");
})();

// =========================================================
// 5. EEG
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "Step 3 · Listening in");
  title(s, M, 0.9, 8.2, "How do we hear the\nbrain? EEG", INK, 34);
  bullets(s, M, 2.85, 6.6, 3.2, [
    { t: "EEG = Electro-Encephalo-Graphy. Big word, simple idea: measuring the brain's electricity." },
    { t: "You wear a soft cap covered in small metal sensors called electrodes." },
    { t: "Each electrode reads the voltage at that spot on the scalp, many times per second." },
    { t: "It's completely safe and painless — nothing goes in, it only listens." },
  ], { fontSize: 15, gap: 11 });
  card(s, 7.65, 2.05, 5.1, 4.35, MIST);
  badge(s, 9.55, 2.5, 1.3, CYAN, "headset_w");
  s.addText("Each sensor = 1 'channel'", { x: 7.85, y: 4.05, w: 4.7, h: 0.4, align: "center", fontFace: HF, fontSize: 17, bold: true, color: INK, margin: 0 });
  s.addText("A research cap can have 32, 64, or 128 channels — 128 tiny microphones, all listening to your brain at once.", { x: 7.95, y: 4.5, w: 4.5, h: 1.5, align: "center", fontFace: BF, fontSize: 13, color: SLATE, margin: 0 });
  s.addText([
    { text: "▶  Watch (2 min): ", options: { bold: true, color: CORAL } },
    { text: "2-Minute Neuroscience — EEG", options: { color: INK, hyperlink: { url: "https://www.youtube.com/watch?v=tZcKT4l_JZk", tooltip: "2-Minute Neuroscience: EEG" } } },
  ], { x: M, y: 6.55, w: 7, h: 0.4, fontFace: BF, fontSize: 13.5, margin: 0 });
  s.addNotes("EEG is how we record brain waves: a cap of electrodes reading scalp voltage many times a second. Safe and non-invasive. Each electrode is a 'channel'. The 2-minute video shows exactly how it works.");
})();

// =========================================================
// 6. WHAT EEG DATA LOOKS LIKE
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "The data");
  title(s, M, 0.9, 11.5, "What the brain data looks like", INK, 34);
  s.addText("EEG is just numbers: for every channel, the voltage at every moment in time. Stack the channels and you get wiggly lines — and to a computer, a neat 3-D block of numbers.", { x: M, y: 1.9, w: 12.1, h: 0.8, fontFace: BF, fontSize: 15.5, color: SLATE, margin: 0 });
  // three-dim block explanation cards
  const items = [
    ["list_w", AMBER, "Trials", "One short clip of brain activity (e.g. one time you imagined moving)."],
    ["headset_w", CYAN, "Channels", "How many sensors were listening (e.g. 3, or 64)."],
    ["wave_w", TEAL, "Time", "How many moments were recorded in that clip (e.g. 1024)."],
  ];
  let x = M;
  const cw = 3.95, y = 2.95;
  items.forEach((it) => {
    card(s, x, y, cw, 2.35, MIST);
    badge(s, x + 0.28, y + 0.28, 1.0, it[1], it[0]);
    s.addText(it[2], { x: x + 1.45, y: y + 0.3, w: cw - 1.7, h: 1.0, fontFace: HF, fontSize: 20, bold: true, color: INK, valign: "top", margin: 0 });
    s.addText(it[3], { x: x + 0.28, y: y + 1.4, w: cw - 0.55, h: 0.85, fontFace: BF, fontSize: 12.5, color: SLATE, margin: 0 });
    x += cw + 0.13;
  });
  s.addShape("roundRect", { x: M, y: 5.55, w: 12.1, h: 1.25, rectRadius: 0.1, fill: { color: INK }, line: { type: "none" }, shadow: shadow() });
  s.addText("The shape of the data:", { x: M + 0.35, y: 5.7, w: 5, h: 0.4, fontFace: BF, fontSize: 13, color: "AAB2C8", margin: 0 });
  s.addText([
    { text: "( trials", options: { color: AMBER } },
    { text: " , ", options: { color: WHITE } },
    { text: "channels", options: { color: CYAN } },
    { text: " , ", options: { color: WHITE } },
    { text: "time )", options: { color: TEAL } },
  ], { x: M + 0.35, y: 6.02, w: 11, h: 0.7, fontFace: MONO, fontSize: 26, bold: true, margin: 0 });
  s.addNotes("Key mental model: EEG data is a 3-D block — (trials, channels, time). This exact shape shows up in the code later as (100, 3, 1024). Getting this shape is 'half the battle' in the tutorial.");
})();

// =========================================================
// 7. BCI
// =========================================================
(() => {
  const s = pres.addSlide();
  darkBg(s);
  pageWave(s, "wave_cyan.png");
  kicker(s, M, 0.6, "Why people care", CYAN);
  title(s, M, 1.0, 11.5, "Mind control is real:\nBrain–Computer Interfaces", WHITE, 34);
  const apps = [
    ["comments", "Type by thinking", "People who can't speak spell words with their mind."],
    ["wheelchair", "Move a wheelchair", "Steer devices and robotic arms with brain signals."],
    ["hand", "Play games", "Control a cursor or a game — no hands needed."],
  ];
  let x = M;
  const cw = 3.9, y = 3.15;
  apps.forEach((a) => {
    s.addShape("roundRect", { x, y, w: cw, h: 2.15, rectRadius: 0.1, fill: { color: "241A54" }, line: { color: VIOLET, width: 1 } });
    badge(s, x + 0.3, y + 0.3, 0.95, CYAN, a[0] + "_w");
    s.addText(a[1], { x: x + 0.3, y: y + 1.32, w: cw - 0.6, h: 0.4, fontFace: HF, fontSize: 16.5, bold: true, color: WHITE, margin: 0 });
    s.addText(a[2], { x: x + 0.3, y: y + 1.72, w: cw - 0.55, h: 0.6, fontFace: BF, fontSize: 12, color: "C9C3EC", margin: 0 });
    x += cw + 0.2;
  });
  s.addText([
    { text: "▶  Watch (demo): ", options: { bold: true, color: AMBER } },
    { text: "TED — Tan Le: A headset that reads your brainwaves", options: { color: "E9E6F8", hyperlink: { url: "https://www.youtube.com/watch?v=fs2GDSYYCoA", tooltip: "TED: A headset that reads your brainwaves" } } },
  ], { x: M, y: 5.75, w: 11.5, h: 0.4, fontFace: BF, fontSize: 14, margin: 0 });
  s.addNotes("Motivation: this isn't sci-fi. BCIs already let people type, move wheelchairs, and control devices with brain signals. Tan Le's TED talk has a live demo. This is where our little tutorial is heading.");
})();

// =========================================================
// 8. THE HARD PART
// =========================================================
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "The challenge");
  title(s, M, 0.9, 11.5, "The catch: the patterns are HARD", INK, 34);
  s.addText("Could you look at these squiggles and tell whether the person imagined moving their LEFT hand or their RIGHT hand?", { x: M, y: 1.95, w: 12.1, h: 0.7, fontFace: BF, fontSize: 16, color: SLATE, margin: 0 });
  card(s, M, 2.85, 12.1, 1.75, MIST);
  s.addImage({ path: A("wave_amber.png"), x: M + 0.2, y: 3.05, w: 11.7, h: 0.55 });
  s.addImage({ path: A("wave_cyan.png"), x: M + 0.2, y: 3.75, w: 11.7, h: 0.55 });
  s.addText("Left hand?                                                                                Right hand?", { x: M + 0.25, y: 4.3, w: 11.6, h: 0.3, fontFace: BF, fontSize: 12, italic: true, color: SLATE, margin: 0 });
  s.addShape("roundRect", { x: M, y: 4.95, w: 12.1, h: 1.75, rectRadius: 0.11, fill: { color: INDIGO }, line: { type: "none" }, shadow: shadow() });
  badge(s, M + 0.35, 5.3, 1.05, AMBER, "robot_w");
  s.addText("Almost nobody can — the differences are tiny and buried in noise.", { x: M + 1.7, y: 5.15, w: 10.2, h: 0.5, fontFace: HF, fontSize: 18, bold: true, color: WHITE, margin: 0 });
  s.addText("But a computer can learn to spot them. That's exactly the job we hand to Artificial Intelligence.", { x: M + 1.7, y: 5.7, w: 10.2, h: 0.8, fontFace: BF, fontSize: 14, color: CYAN, margin: 0 });
  s.addNotes("Set up the need for AI: humans can't eyeball the difference between imagined left vs right hand movement — it's subtle and noisy. Machines can learn it. Transition to what AI/ML actually is.");
})();

// ===== Slides 9+ : detailed data-pipeline deep dive =====
function tbl(slide, rows, o) {
  slide.addTable(rows, Object.assign({
    border: { type: "solid", pt: 0.75, color: "D5D8E8" },
    align: "center", valign: "middle", fontFace: MONO, fontSize: 12,
    autoPage: false,
  }, o));
}
const CLASSES = "0 = Left hand   ·   1 = Right hand   ·   2 = Feet   ·   3 = Tongue";

// 9. TOOLKIT + RECIPE ------------------------------------------------
(() => {
  const s = pres.addSlide();
  darkBg(s);
  pageWave(s, "wave_cyan.png");
  badge(s, M, 0.7, 1.1, TEAL, "code_w");
  kicker(s, M + 1.3, 0.78, "The toolkit & the recipe", TEAL);
  title(s, M + 1.3, 1.06, 11, "One tool, five steps", WHITE, 34);
  s.addText([
    { text: "braindecode", options: { italic: true, bold: true, color: TEAL } },
    { text: " is a free tool that does the hard parts for us. Every project follows the SAME five steps — and the first three are all about the ", options: { color: "D7D2F0" } },
    { text: "data", options: { bold: true, color: CYAN } },
    { text: ". Let's zoom into each one.", options: { color: "D7D2F0" } },
  ], { x: M, y: 2.35, w: 12.0, h: 0.9, fontFace: BF, fontSize: 16, margin: 0 });
  const steps = [
    ["database_w", AMBER, "1 · Get data", "Raw brain signal"],
    ["cut_w", TEAL, "2 · Make epochs", "Slice into clips"],
    ["filter_w", CYAN, "3 · Prepare it", "Clean & reshape"],
    ["loop_w", VIOLET, "4 · Train", "Learn from examples"],
    ["trophy_w", CORAL, "5 · Score it", "Measure accuracy"],
  ];
  const cw = 2.28, gap = 0.15;
  let x = M, y = 3.55;
  steps.forEach((st, i) => {
    s.addShape("roundRect", { x, y, w: cw, h: 2.35, rectRadius: 0.1, fill: { color: "241A54" }, line: { color: VIOLET, width: 1 } });
    badge(s, x + cw / 2 - 0.5, y + 0.28, 1.0, st[1], st[0]);
    s.addText(st[2], { x, y: y + 1.35, w: cw, h: 0.4, align: "center", fontFace: HF, fontSize: 15, bold: true, color: WHITE, margin: 0 });
    s.addText(st[3], { x: x + 0.1, y: y + 1.78, w: cw - 0.2, h: 0.5, align: "center", fontFace: BF, fontSize: 11.5, color: "C7C1EC", margin: 0 });
    if (i < 4) s.addText("→", { x: x + cw - 0.03, y: y + 0.85, w: gap + 0.06, h: 0.5, align: "center", valign: "middle", fontFace: BF, fontSize: 18, bold: true, color: CYAN, margin: 0 });
    x += cw + gap;
  });
  s.addText("Steps 1–3 = getting the data ready.  Steps 4–5 = the AI.", { x: M, y: 6.35, w: 12, h: 0.4, align: "center", fontFace: BF, fontSize: 13.5, italic: true, color: "B9B3DE", margin: 0 });
  s.addNotes("Overview before the deep dive: five steps, and the first three are all about data. We'll spend most time there because that's where beginners get confused and where most real work happens.");
})();

// 10. STEP 1 — RAW DATA TABLE ---------------------------------------
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.5, "Step 1 · The raw data", AMBER);
  title(s, M, 0.85, 12, "What EEG data really is: a table of numbers", INK, 28);
  s.addText("Straight from the headset, EEG is just a giant spreadsheet. Here are the first few rows from a tiny 3-sensor recording:", { x: M, y: 1.75, w: 12.1, h: 0.5, fontFace: BF, fontSize: 14.5, color: SLATE, margin: 0 });
  // table
  const hcell = (t, c) => ({ text: t, options: { fill: { color: c }, color: WHITE, bold: true, fontFace: BF, fontSize: 12.5 } });
  const tcell = (t, tint) => ({ text: t, options: { fill: { color: tint || WHITE }, color: INK, fontFace: MONO, fontSize: 12.5 } });
  const rows = [
    [hcell("Time (ms)", SLATE), hcell("C3  (µV)", CYAN), hcell("Cz  (µV)", TEAL), hcell("C4  (µV)", VIOLET)],
    [tcell("0", MIST), tcell("+2.1"), tcell("−0.4"), tcell("+1.3")],
    [tcell("4", MIST), tcell("+1.8"), tcell("−0.1"), tcell("+0.9")],
    [tcell("8", MIST), tcell("+2.4"), tcell("+0.2"), tcell("+1.1")],
    [tcell("12", MIST), tcell("+3.0"), tcell("+0.5"), tcell("+1.4")],
    [tcell("16", MIST), tcell("+2.6"), tcell("+0.1"), tcell("+1.0")],
    [tcell("⋮", MIST), tcell("⋮"), tcell("⋮"), tcell("⋮")],
  ];
  tbl(s, rows, { x: M, y: 2.4, colW: [1.45, 1.55, 1.55, 1.55], rowH: 0.42 });
  // annotations on the right
  const ann = [
    ["columns_w", CYAN, "Each COLUMN = one channel", "One electrode on the head (C3, Cz, C4 sit over the motor area)."],
    ["clock_w", TEAL, "Each ROW = one moment", "Here every 4 ms — that's 250 rows every second (250 Hz)."],
    ["ruler_w", AMBER, "Each NUMBER = a voltage", "The tiny brain signal in microvolts (µV). Millionths of a volt!"],
  ];
  let y = 2.4;
  ann.forEach((a) => {
    s.addShape("roundRect", { x: 7.05, y, w: 5.68, h: 1.28, rectRadius: 0.1, fill: { color: MIST }, line: { color: LINE, width: 1 } });
    badge(s, 7.25, y + 0.24, 0.8, a[1], a[0]);
    s.addText(a[2], { x: 8.2, y: y + 0.16, w: 4.35, h: 0.4, fontFace: HF, fontSize: 14.5, bold: true, color: INK, margin: 0 });
    s.addText(a[3], { x: 8.2, y: y + 0.56, w: 4.4, h: 0.65, fontFace: BF, fontSize: 11.5, color: SLATE, margin: 0 });
    y += 1.4;
  });
  s.addNotes("Demystify the data: EEG is literally a spreadsheet. Columns = channels (electrodes), rows = time points (samples), each cell = microvolts. Point at C3/Cz/C4 — real electrode names over the motor cortex. 250 Hz means 250 rows per second.");
})();

// 11. FOUR WORDS ----------------------------------------------------
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "The vocabulary that unlocks everything");
  title(s, M, 0.9, 12, "Four words: channel, time, trial, class", INK, 30);
  const words = [
    ["columns_w", CYAN, "CHANNEL", "One electrode = one column of numbers. More channels = more spots on the head listening at once."],
    ["clock_w", TEAL, "TIME", "Moments in a row, called samples. At 250 Hz, 250 samples = 1 second of signal."],
    ["cut_w", AMBER, "TRIAL  ( = EPOCH )", "One short, equal-length clip of signal — cut out around one thing the person did."],
    ["tag_w", CORAL, "CLASS", "The answer we want to predict for each clip. E.g. Left hand vs. Right hand vs. Feet vs. Tongue."],
  ];
  const cw = 5.95, ch = 2.15, gx = 0.2, gy = 0.22;
  let i = 0;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    const x = M + c * (cw + gx), y = 2.05 + r * (ch + gy);
    card(s, x, y, cw, ch, MIST);
    badge(s, x + 0.3, y + 0.32, 1.05, words[i][1], words[i][0]);
    s.addText(words[i][2], { x: x + 1.55, y: y + 0.34, w: cw - 1.8, h: 0.5, fontFace: HF, fontSize: 18, bold: true, color: words[i][1] === CORAL ? "C43D54" : INK, margin: 0 });
    s.addText(words[i][3], { x: x + 0.32, y: y + 1.12, w: cw - 0.6, h: 0.9, fontFace: BF, fontSize: 12.5, color: SLATE, margin: 0 });
    i++;
  }
  s.addNotes("Four words carry the whole pipeline. Channel = column (electrode). Time = rows (samples). Trial = epoch = one labeled clip. Class = the category to predict. Everything else is built from these.");
})();

// 11b. TIME & SAMPLING (movie frames) -------------------------------
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.5, "Zooming into TIME", TEAL);
  title(s, M, 0.85, 12, "Time = snapshots: the movie-frames idea", INK, 28);
  s.addText([
    { text: "A ", options: { color: SLATE } },
    { text: "sample", options: { bold: true, color: INK } },
    { text: " = one voltage measured at one exact instant — a snapshot. ", options: { color: SLATE } },
    { text: "250 Hz", options: { bold: true, color: INK } },
    { text: " = 250 of those snapshots every second.", options: { color: SLATE } },
  ], { x: M, y: 1.62, w: 12.1, h: 0.4, fontFace: BF, fontSize: 14, margin: 0 });
  s.addImage({ path: A("sampling.png"), x: M, y: 2.05, w: 12.1, h: 2.82 });
  s.addText([
    { text: "Each amber dot = one sample.  ", options: { bold: true, color: INK } },
    { text: "The film strip shows each snapshot as a frame — play them in a row and you get a movie of the wave.", options: { color: SLATE } },
  ], { x: M, y: 4.95, w: 12.1, h: 0.35, align: "center", fontFace: BF, fontSize: 12, italic: true, margin: 0 });
  card(s, M, 5.5, 6.0, 1.55, MIST);
  badge(s, M + 0.2, 5.72, 0.9, TEAL, "clock_w");
  s.addText("Like a movie", { x: M + 1.3, y: 5.62, w: 4.5, h: 0.35, fontFace: HF, fontSize: 15, bold: true, color: INK, margin: 0 });
  s.addText("Smooth motion is really many still frames shown fast. 1024 samples ÷ 250/sec ≈ 4 seconds of signal per clip.", { x: M + 1.3, y: 6.0, w: 4.55, h: 0.95, fontFace: BF, fontSize: 11.5, color: SLATE, margin: 0 });
  s.addShape("roundRect", { x: 6.75, y: 5.5, w: 5.98, h: 1.55, rectRadius: 0.1, fill: { color: INDIGO }, line: { type: "none" } });
  badge(s, 6.95, 5.72, 0.9, AMBER, "bolt_w");
  s.addText("Why does it go up & down?", { x: 8.05, y: 5.62, w: 4.5, h: 0.35, fontFace: HF, fontSize: 14.5, bold: true, color: WHITE, margin: 0 });
  s.addText("It rises and falls because your neurons keep firing in changing amounts — more firing in sync → bigger voltage, fewer → smaller. Your brain never holds still, so the number changes over time.", { x: 8.05, y: 6.0, w: 4.5, h: 0.98, fontFace: BF, fontSize: 11, color: "D7D2F0", margin: 0 });
  s.addNotes("Time deep-dive. A sample = one voltage snapshot; 250 Hz = 250 per second; movie-frames analogy. Why the voltage changes: neurons fire in constantly changing amounts, so the summed scalp voltage rises and falls — that IS the wave. 1024 samples / 250 ≈ 4s per clip.");
})();

// 11c. CLIP LENGTH = samples / Hz -----------------------------------
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.5, "A design choice · how long is a clip?", VIOLET);
  title(s, M, 0.85, 12.2, "Clip length = samples ÷ Hz", INK, 30);
  s.addShape("roundRect", { x: M, y: 1.72, w: 12.1, h: 1.02, rectRadius: 0.1, fill: { color: INDIGO }, line: { type: "none" }, shadow: shadow() });
  s.addText([
    { text: "clip length (seconds)   =   ", options: { color: WHITE } },
    { text: "samples in the clip", options: { color: AMBER } },
    { text: "   ÷   ", options: { color: WHITE } },
    { text: "sampling rate (Hz)", options: { color: CYAN } },
  ], { x: M + 0.3, y: 1.8, w: 11.5, h: 0.44, valign: "middle", fontFace: MONO, fontSize: 16, bold: true, margin: 0 });
  s.addText([
    { text: "our tutorial:   ", options: { color: "CFC9EE" } },
    { text: "1024", options: { color: AMBER, bold: true } },
    { text: "  ÷  ", options: { color: "CFC9EE" } },
    { text: "250", options: { color: CYAN, bold: true } },
    { text: "   ≈   4 seconds", options: { color: TEAL, bold: true } },
  ], { x: M + 0.3, y: 2.28, w: 11.5, h: 0.4, valign: "middle", fontFace: MONO, fontSize: 14, margin: 0 });
  const HH = (t) => ({ text: t, options: { fill: { color: SLATE }, color: WHITE, bold: true, fontFace: BF, fontSize: 12.5 } });
  const CC = (t, f, c) => ({ text: t, options: { fill: { color: f || WHITE }, color: c || INK, fontFace: MONO, fontSize: 12.5 } });
  const NN = (t, f, c) => ({ text: t, options: { fill: { color: f || WHITE }, color: c || SLATE, fontFace: BF, fontSize: 11, align: "left" } });
  const rows = [
    [HH("Samples"), HH("Rate (Hz)"), HH("Clip length"), HH("What changed")],
    [CC("1024", "D9F5EF"), CC("250", "D9F5EF"), CC("≈ 4.1 s", "D9F5EF", "0E7C6A"), NN("← the tutorial's choice", "D9F5EF", "0E7C6A")],
    [CC("1024", "FFF1D6"), CC("500", "FFF1D6", "B26A00"), CC("≈ 2.0 s", "FFF1D6", "B26A00"), NN("⚠ same samples, FASTER rate → shorter!", "FFF1D6", "8A5300")],
    [CC("2048"), CC("250"), CC("≈ 8.2 s"), NN("more samples → longer clip")],
    [CC("512"), CC("250"), CC("≈ 2.0 s"), NN("fewer samples → shorter clip")],
  ];
  tbl(s, rows, { x: 1.9, y: 3.05, colW: [1.7, 1.6, 1.9, 4.3], rowH: 0.5 });
  s.addShape("roundRect", { x: M, y: 5.85, w: 12.1, h: 1.25, rectRadius: 0.11, fill: { color: INK }, line: { type: "none" }, shadow: shadow() });
  badge(s, M + 0.3, 6.05, 0.9, AMBER, "bulb_w");
  s.addText("Think like a pipeline builder", { x: M + 1.4, y: 5.96, w: 10.4, h: 0.35, fontFace: HF, fontSize: 15, bold: true, color: WHITE, margin: 0 });
  s.addText([
    { text: "More Hz does NOT mean more seconds. ", options: { bold: true, color: AMBER } },
    { text: "Faster sampling just packs the same snapshots closer together. To capture a LONGER clip you must keep MORE samples — so every scientist building a data pipeline balances these two knobs on purpose.", options: { color: "E4E6F2" } },
  ], { x: M + 1.4, y: 6.32, w: 10.5, h: 0.75, fontFace: BF, fontSize: 12.5, valign: "top", margin: 0 });
  s.addNotes("Clip length = samples ÷ Hz. 1024 ÷ 250 ≈ 4 s. The scientist picks the window. The trap (row 2): more Hz does NOT lengthen the clip — it packs the same number of snapshots closer together; only more samples make a longer clip. This is a real decision every data-pipeline builder must make.");
})();

// 12. STEP 2 — EPOCHS ----------------------------------------------
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.5, "Step 2 · Making epochs", TEAL);
  title(s, M, 0.85, 12, "Slice the recording into ‘epochs’", INK, 30);
  s.addText("A raw recording is long and continuous. We chop it into equal-length clips — one around each moment the person did a task. Each clip is an EPOCH, and it gets a label.", { x: M, y: 1.7, w: 12.1, h: 0.7, fontFace: BF, fontSize: 14.5, color: SLATE, margin: 0 });
  // long recording
  s.addShape("roundRect", { x: M, y: 2.55, w: 12.1, h: 1.15, rectRadius: 0.1, fill: { color: "0F1F3A" }, line: { type: "none" } });
  s.addImage({ path: A("wave_cyan.png"), x: M + 0.15, y: 2.75, w: 11.8, h: 0.75 });
  // cut markers
  [3.9, 7.5, 11.0].forEach((cx) => s.addShape("line", { x: M + cx * 0 + cx, y: 2.55, w: 0, h: 1.15, line: { color: AMBER, width: 2, dashType: "dash" } }));
  s.addText("one long recording", { x: M + 0.2, y: 3.42, w: 4, h: 0.25, fontFace: BF, fontSize: 10.5, italic: true, color: "9FE9FF", margin: 0 });
  s.addText("✂  cut into equal clips", { x: 6.0, y: 3.8, w: 6, h: 0.3, fontFace: BF, fontSize: 12, bold: true, color: AMBER, margin: 0 });
  // three epochs
  const eps = [["Epoch 1", "class 0 · Left hand", CYAN], ["Epoch 2", "class 1 · Right hand", TEAL], ["Epoch 3", "class 0 · Left hand", CYAN]];
  let x = M;
  const cw = 3.93;
  eps.forEach((e) => {
    card(s, x, 4.3, cw, 1.55, MIST);
    s.addImage({ path: A("wave_amber.png"), x: x + 0.2, y: 4.5, w: cw - 0.4, h: 0.45, transparency: 15 });
    s.addText(e[0], { x: x + 0.2, y: 5.02, w: cw - 0.4, h: 0.35, fontFace: HF, fontSize: 15, bold: true, color: INK, margin: 0 });
    s.addText(e[1], { x: x + 0.2, y: 5.4, w: cw - 0.4, h: 0.35, fontFace: MONO, fontSize: 12, bold: true, color: e[2] === CYAN ? "0E7C93" : "1B8F7F", margin: 0 });
    x += cw + 0.16;
  });
  s.addShape("roundRect", { x: M, y: 6.1, w: 12.1, h: 0.85, rectRadius: 0.09, fill: { color: INDIGO }, line: { type: "none" } });
  s.addText([
    { text: "Epoch (in EEG) = ", options: { bold: true, color: AMBER } },
    { text: "one trial = one equal-length slice of brain signal, tagged with its class.", options: { color: WHITE } },
  ], { x: M + 0.3, y: 6.1, w: 11.6, h: 0.85, valign: "middle", fontFace: BF, fontSize: 14.5, margin: 0 });
  s.addNotes("An epoch = a trial = one equal-length labeled clip cut from the long recording. Equal length matters — the model needs every example the same size. Flag now: 'epoch' will mean something else in training; we'll clear that up.");
})();

// 12b. CLIP -> LABEL: markers & timing ------------------------------
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.5, "From clip to labeled example", CORAL);
  title(s, M, 0.85, 12.2, "How a clip gets its class — and stays in time", INK, 27);
  s.addText("Two questions: how does a clip get its answer (class), and how do we cut it at exactly the right spot?", { x: M, y: 1.62, w: 12.1, h: 0.4, fontFace: BF, fontSize: 14, color: SLATE, margin: 0 });
  s.addShape("roundRect", { x: M, y: 2.2, w: 12.1, h: 2.0, rectRadius: 0.1, fill: { color: "0F1F3A" }, line: { type: "none" } });
  const tlX = M + 0.25, tlY = 2.78, tlW = 11.6;
  s.addImage({ path: A("wave_cyan.png"), x: tlX, y: tlY, w: tlW, h: 0.5, transparency: 20 });
  const cueX = tlX + 2.4;
  s.addShape("line", { x: cueX, y: 2.4, w: 0, h: 1.6, line: { color: AMBER, width: 2.5 } });
  s.addText("CUE  ▶  t = 0", { x: cueX - 1.0, y: 2.36, w: 2.0, h: 0.3, align: "center", fontFace: MONO, fontSize: 11, bold: true, color: AMBER, margin: 0 });
  s.addText("screen says: “imagine LEFT hand”", { x: cueX + 0.12, y: 2.5, w: 4.3, h: 0.3, fontFace: BF, fontSize: 11, italic: true, color: "9FE9FF", margin: 0 });
  s.addShape("roundRect", { x: cueX, y: 3.42, w: 4.35, h: 0.55, rectRadius: 0.05, fill: { color: AMBER, transparency: 55 }, line: { color: AMBER, width: 1 } });
  s.addText("epoch window = next 1024 samples (≈ 4 s)", { x: cueX + 0.1, y: 3.42, w: 4.25, h: 0.55, valign: "middle", fontFace: BF, fontSize: 10.5, bold: true, color: "5A3B00", margin: 0 });
  s.addText("→ class = Left hand (0)", { x: cueX + 4.55, y: 3.5, w: 3.4, h: 0.4, valign: "middle", fontFace: BF, fontSize: 12.5, bold: true, color: TEAL, margin: 0 });
  card(s, M, 4.5, 5.95, 2.15, MIST);
  badge(s, M + 0.25, 4.78, 0.95, CORAL, "tag_w");
  s.addText("Where the label comes from", { x: M + 1.35, y: 4.8, w: 4.4, h: 0.55, fontFace: HF, fontSize: 15, bold: true, color: INK, valign: "middle", margin: 0 });
  s.addText("While recording, the computer also logs WHAT the person was told to do — an event marker (a “trigger”) stamped at that instant. The clip cut around that marker inherits the cue as its class.", { x: M + 0.3, y: 5.55, w: 5.4, h: 1.0, fontFace: BF, fontSize: 11.5, color: SLATE, margin: 0 });
  card(s, 6.78, 4.5, 5.95, 2.15, MIST);
  badge(s, 7.03, 4.78, 0.95, CYAN, "clock_w");
  s.addText("How the timing stays exact", { x: 8.13, y: 4.8, w: 4.4, h: 0.55, fontFace: HF, fontSize: 15, bold: true, color: INK, valign: "middle", margin: 0 });
  s.addText("The brain samples and the event markers share the SAME clock. Each cue lands on a known sample number, so we cut a fixed window (1024 samples) starting right at the cue — every epoch lines up and is equal length.", { x: 7.08, y: 5.55, w: 5.4, h: 1.0, fontFace: BF, fontSize: 11.5, color: SLATE, margin: 0 });
  s.addText("That shared clock is why the sampling rate (Hz) matters — it's the ruler both the brain signal and the cues are measured against.", { x: M, y: 6.8, w: 12.1, h: 0.35, align: "center", fontFace: BF, fontSize: 12, italic: true, color: SLATE, margin: 0 });
  s.addNotes("Two things. (1) Label source: during recording the machine logs the cue as an event marker/trigger at that exact moment; the epoch cut around it inherits that class. (2) Timing: EEG samples and markers share one clock, so each cue maps to a known sample index; we cut a fixed-length window from the cue, giving aligned, equal-length epochs. That shared clock is why Hz matters.");
})();

// 13. ONE EPOCH UP CLOSE + THE BLOCK --------------------------------
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.5, "Zooming into one epoch");
  title(s, M, 0.85, 12, "Inside one epoch — and the whole ‘block’", INK, 28);
  s.addText("For the AI we flip the table: each channel is a ROW, each time-sample a COLUMN. Same numbers as Step 1 — just arranged for the model.", { x: M, y: 1.7, w: 12.1, h: 0.6, fontFace: BF, fontSize: 13.5, color: SLATE, margin: 0 });
  const h = (t, c) => ({ text: t, options: { fill: { color: c || "31374A" }, color: WHITE, bold: true, fontFace: MONO, fontSize: 11.5 } });
  const ch = (t, c) => ({ text: t, options: { fill: { color: c }, color: WHITE, bold: true, fontFace: BF, fontSize: 12 } });
  const d = (t) => ({ text: t, options: { fill: { color: WHITE }, color: INK, fontFace: MONO, fontSize: 11.5 } });
  const rows = [
    [h(""), h("t0"), h("t1"), h("t2"), h("t3"), h("…"), h("t1023")],
    [ch("C3", CYAN), d("+2.1"), d("+1.8"), d("+2.4"), d("+3.0"), d("…"), d("+1.7")],
    [ch("Cz", TEAL), d("−0.4"), d("−0.1"), d("+0.2"), d("+0.5"), d("…"), d("+0.3")],
    [ch("C4", VIOLET), d("+1.3"), d("+0.9"), d("+1.1"), d("+1.4"), d("…"), d("+1.0")],
  ];
  tbl(s, rows, { x: M, y: 2.45, colW: [0.6, 0.72, 0.72, 0.72, 0.72, 0.5, 0.9], rowH: 0.44 });
  s.addText("ONE epoch = a (channels × time) grid = (3 × 1024)", { x: M, y: 4.5, w: 6.2, h: 0.4, fontFace: HF, fontSize: 14, bold: true, color: INK, margin: 0 });
  s.addText("3 channels tall, 1024 time-samples wide (about 4 seconds).", { x: M, y: 4.9, w: 6.2, h: 0.5, fontFace: BF, fontSize: 12, color: SLATE, margin: 0 });
  // right: the block + y
  s.addShape("roundRect", { x: 7.1, y: 2.45, w: 5.63, h: 4.15, rectRadius: 0.11, fill: { color: INDIGO }, line: { type: "none" }, shadow: shadow() });
  s.addText("Stack every epoch → the dataset", { x: 7.35, y: 2.62, w: 5.2, h: 0.4, fontFace: HF, fontSize: 15, bold: true, color: WHITE, margin: 0 });
  s.addText([
    { text: "X", options: { bold: true, color: AMBER } },
    { text: "  the brain clips\n", options: { color: "CFC9EE" } },
    { text: "( trials", options: { color: AMBER } },
    { text: ", channels", options: { color: CYAN } },
    { text: ", time", options: { color: TEAL } },
    { text: " )", options: { color: WHITE } },
  ], { x: 7.35, y: 3.12, w: 5.1, h: 0.8, fontFace: MONO, fontSize: 16, bold: true, margin: 0 });
  s.addText("= ( 100 , 3 , 1024 )", { x: 7.35, y: 3.95, w: 5.1, h: 0.4, fontFace: MONO, fontSize: 17, bold: true, color: WHITE, margin: 0 });
  s.addText([
    { text: "y", options: { bold: true, color: CORAL } },
    { text: "  one label per clip\n", options: { color: "CFC9EE" } },
    { text: "= [ 0, 1, 0, 3, 2, 1, … ]", options: { color: WHITE, bold: true } },
  ], { x: 7.35, y: 4.6, w: 5.1, h: 0.8, fontFace: MONO, fontSize: 15, margin: 0 });
  s.addText(CLASSES, { x: 7.35, y: 5.75, w: 5.15, h: 0.7, fontFace: BF, fontSize: 11, color: CYAN, margin: 0 });
  s.addNotes("The core mental model. One epoch is a channels×time grid (3×1024). Stack 100 of them and you get X with shape (trials, channels, time) = (100,3,1024). y holds one class label per trial. Note we transposed vs Step 1 — that's part of prep.");
})();

// 14. STEP 3 — PREPARE + WHY ----------------------------------------
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.5, "Step 3 · Preparing the data", CYAN);
  title(s, M, 0.85, 12, "Getting the data ‘AI-ready’ — and why", INK, 28);
  const items = [
    ["headset_w", CYAN, "Keep the right channels & units", "Use only the EEG sensors, all in the same units (µV)."],
    ["filter_w", TEAL, "Filter out the junk", "Keep brain rhythms (≈4–38 Hz); drop slow drift and electrical noise."],
    ["ruler_w", AMBER, "Make every epoch equal length", "Same number of time-samples in every clip — no exceptions."],
    ["table_w", VIOLET, "Arrange into (trials, channels, time)", "Reshape to the exact block the model expects."],
    ["tag_w", CORAL, "Match each epoch to its label", "Every clip in X lines up with its answer in y."],
  ];
  let y = 1.95;
  items.forEach((it) => {
    card(s, M, y, 7.0, 0.86, MIST);
    badge(s, M + 0.16, y + 0.14, 0.58, it[1], it[0]);
    s.addText(it[2], { x: M + 0.95, y: y + 0.1, w: 5.95, h: 0.34, fontFace: HF, fontSize: 13.5, bold: true, color: INK, valign: "middle", margin: 0 });
    s.addText(it[3], { x: M + 0.95, y: y + 0.44, w: 5.95, h: 0.34, fontFace: BF, fontSize: 11, color: SLATE, valign: "middle", margin: 0 });
    y += 0.96;
  });
  // why card
  s.addShape("roundRect", { x: 8.0, y: 1.95, w: 4.73, h: 4.65, rectRadius: 0.11, fill: { color: INK }, line: { type: "none" }, shadow: shadow() });
  badge(s, 8.3, 2.25, 0.95, AMBER, "bulb_w");
  s.addText("Why bother?", { x: 9.4, y: 2.35, w: 3.2, h: 0.5, fontFace: HF, fontSize: 19, bold: true, color: WHITE, valign: "middle", margin: 0 });
  bullets(s, 8.3, 3.45, 4.15, 3.0, [
    "AI needs every example the SAME shape and scale — like a form with fixed boxes.",
    "Noise that isn't brain (blinks, hums) would fool the learning.",
    "Different lengths or units = the model can't compare clips fairly.",
  ], { fontSize: 13, gap: 12, color: "E4E6F2" });
  s.addText("Garbage in → garbage out.", { x: 8.3, y: 6.15, w: 4.1, h: 0.35, fontFace: BF, fontSize: 13.5, bold: true, italic: true, color: TEAL, margin: 0 });
  s.addNotes("Preparation = clean + standardize + reshape + align. Why: models need uniform, clean, comparable inputs. Filtering removes non-brain noise; equal length and fixed units make clips comparable; reshape matches the model's expected block; X and y must line up. Garbage in, garbage out.");
})();

// 15. STEP 4 — TRAINING --------------------------------------------
(() => {
  const s = pres.addSlide();
  darkBg(s);
  pageWave(s, "wave_cyan.png");
  kicker(s, M, 0.55, "Step 4 · Training the model", TEAL);
  title(s, M, 0.95, 12, "How the AI actually learns", WHITE, 30);
  // split
  s.addShape("roundRect", { x: M, y: 2.15, w: 5.9, h: 1.5, rectRadius: 0.1, fill: { color: "241A54" }, line: { color: TEAL, width: 1 } });
  badge(s, M + 0.25, 2.42, 0.95, TEAL, "balance_w");
  s.addText("Split the epochs first", { x: M + 1.35, y: 2.32, w: 4.4, h: 0.4, fontFace: HF, fontSize: 15.5, bold: true, color: WHITE, margin: 0 });
  s.addText("Most → TRAINING (to learn from).  Some held back → VALIDATION (a practice test).", { x: M + 1.35, y: 2.72, w: 4.45, h: 0.8, fontFace: BF, fontSize: 12, color: "CFC9EE", margin: 0 });
  // loop
  s.addShape("roundRect", { x: 6.85, y: 2.15, w: 5.88, h: 1.5, rectRadius: 0.1, fill: { color: "241A54" }, line: { color: VIOLET, width: 1 } });
  badge(s, 7.1, 2.42, 0.95, VIOLET, "loop_w");
  s.addText("The learning loop", { x: 8.2, y: 2.32, w: 4.3, h: 0.4, fontFace: HF, fontSize: 15.5, bold: true, color: WHITE, margin: 0 });
  s.addText("Show a clip ▸ model guesses a class ▸ compare to the true label ▸ nudge it to be more right. Repeat!", { x: 8.2, y: 2.72, w: 4.35, h: 0.85, fontFace: BF, fontSize: 12, color: "CFC9EE", margin: 0 });
  // loop chips
  const loop = ["Show a brain clip (X)", "Model guesses a class", "Check vs. true label (y)", "Nudge the model", "Repeat, many passes"];
  let x = M;
  const cw = 2.3;
  loop.forEach((t, i) => {
    s.addShape("roundRect", { x, y: 4.05, w: cw, h: 1.0, rectRadius: 0.09, fill: { color: "1B1240" }, line: { color: CYAN, width: 1 } });
    s.addText(`${i + 1}`, { x: x + 0.12, y: 4.15, w: 0.5, h: 0.4, fontFace: HF, fontSize: 15, bold: true, color: AMBER, margin: 0 });
    s.addText(t, { x: x + 0.12, y: 4.5, w: cw - 0.24, h: 0.5, fontFace: BF, fontSize: 11.5, color: "E4E1F5", valign: "top", margin: 0 });
    if (i < 4) s.addText("→", { x: x + cw - 0.05, y: 4.35, w: 0.2, h: 0.4, align: "center", fontFace: BF, fontSize: 16, bold: true, color: CYAN, margin: 0 });
    x += cw + 0.14;
  });
  // epoch warning
  s.addShape("roundRect", { x: M, y: 5.45, w: 12.1, h: 1.2, rectRadius: 0.1, fill: { color: AMBER }, line: { type: "none" } });
  s.addText("⚠", { x: M + 0.25, y: 5.5, w: 0.7, h: 1.1, align: "center", valign: "middle", fontFace: BF, fontSize: 30, bold: true, color: "7A4E05", margin: 0 });
  s.addText([
    { text: "Careful — two meanings of ‘epoch’!  ", options: { bold: true, color: "5A3B00" } },
    { text: "In EEG, an epoch is one brain clip. In training, an ‘epoch’ means one full pass through ALL the training clips. Our run did 10 training epochs (passes).", options: { color: "5A3B00" } },
  ], { x: M + 1.05, y: 5.5, w: 10.9, h: 1.1, valign: "middle", fontFace: BF, fontSize: 13, margin: 0 });
  s.addNotes("Training: first split into train vs validation. Then the loop — show clip, guess, check against label, nudge weights — repeated over many passes. Crucial vocabulary fix: 'epoch' in training = one full pass over the data, totally different from an EEG epoch. Our table showed 10 training epochs.");
})();

// 16. STEP 5 — ACCURACY --------------------------------------------
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.5, "Step 5 · Measuring accuracy", CORAL);
  title(s, M, 0.85, 12, "How good is it? Grading on unseen clips", INK, 28);
  bullets(s, M, 1.9, 6.5, 2.5, [
    { t: "We test the trained model on the VALIDATION clips it NEVER saw during training." },
    { t: "For each clip it predicts a class; we compare to the true answer." },
    { t: "Why unseen data? To prove it LEARNED the pattern — not just MEMORIZED answers." },
  ], { fontSize: 14, gap: 11 });
  // accuracy formula
  s.addShape("roundRect", { x: M, y: 4.6, w: 6.5, h: 1.05, rectRadius: 0.1, fill: { color: INDIGO }, line: { type: "none" } });
  s.addText([
    { text: "accuracy = ", options: { color: WHITE } },
    { text: "clips it got right", options: { color: TEAL } },
    { text: "  ÷  ", options: { color: WHITE } },
    { text: "total clips", options: { color: AMBER } },
  ], { x: M + 0.25, y: 4.6, w: 6.0, h: 1.05, valign: "middle", fontFace: MONO, fontSize: 15, bold: true, margin: 0 });
  s.addText("4 classes → pure guessing ≈ 25%.  At or below that = it didn't really learn.", { x: M, y: 5.8, w: 6.5, h: 0.7, fontFace: BF, fontSize: 12.5, italic: true, color: SLATE, margin: 0 });
  // the table result
  s.addShape("roundRect", { x: 7.1, y: 1.9, w: 5.63, h: 3.35, rectRadius: 0.1, fill: { color: INK }, line: { type: "none" }, shadow: shadow() });
  s.addText("our random-noise run", { x: 7.3, y: 2.05, w: 5.2, h: 0.3, fontFace: BF, fontSize: 11, color: "9AA2C0", margin: 0 });
  const out = "  epoch   valid_acc   valid_loss\n------- ---------- ----------\n      1     0.150      72.909\n      2     0.150      72.909\n     ...\n     10     0.150      72.909\n";
  s.addText(out, { x: 7.3, y: 2.4, w: 5.25, h: 2.0, fontFace: MONO, fontSize: 12.5, color: "BFE7D8", valign: "top", lineSpacingMultiple: 1.12, margin: 0 });
  s.addText([
    { text: "valid_acc ", options: { bold: true, color: AMBER } },
    { text: "= the score. Stuck at ~0.15 → the model correctly learned NOTHING from noise.", options: { color: "E6E9F5" } },
  ], { x: 7.3, y: 4.45, w: 5.25, h: 0.75, fontFace: BF, fontSize: 12.5, valign: "top", margin: 0 });
  s.addShape("roundRect", { x: 7.1, y: 5.45, w: 5.63, h: 1.05, rectRadius: 0.1, fill: { color: MIST }, line: { color: LINE, width: 1 } });
  s.addText("On REAL brain data, this same number climbs well above 25% as the model finds real patterns.", { x: 7.35, y: 5.45, w: 5.15, h: 1.05, valign: "middle", fontFace: BF, fontSize: 12.5, color: INK, margin: 0 });
  s.addNotes("Accuracy = fraction correct on held-out validation clips the model never trained on — that's how we know it generalized, not memorized. Chance = 1/classes = 25% for 4 classes. Our noise run sits ~15% (chance), i.e., learned nothing — correct. Real data pushes it higher.");
})();

// 17. THE CODE, ANNOTATED ------------------------------------------
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.5, "All five steps together");
  title(s, M, 0.85, 12, "The whole pipeline — in a few lines", INK, 28);
  s.addText("Every step you just learned maps to one or two lines of code:", { x: M, y: 1.7, w: 12, h: 0.4, fontFace: BF, fontSize: 14, color: SLATE, margin: 0 });
  s.addShape("roundRect", { x: M, y: 2.25, w: 7.7, h: 4.3, rectRadius: 0.1, fill: { color: "16112E" }, line: { type: "none" }, shadow: shadow() });
  const code = [
    { text: "X = np.random.randn(100, 3, 1024)\n", options: { color: "FFE08A" } },
    { text: "y = np.random.randint(0, 4, 100)\n", options: { color: "FFE08A" } },
    { text: "epochs = mne.EpochsArray(X, info)\n\n", options: { color: "9CD7FF" } },
    { text: "net = EEGClassifier(\n", options: { color: "9CD7FF" } },
    { text: "        \"ShallowFBCSPNet\")\n\n", options: { color: "6FE0B0" } },
    { text: "net.fit(epochs, y)\n\n", options: { color: "9CD7FF" } },
    { text: "score = net.score(epochs, y)", options: { color: "C8CEE8" } },
  ];
  s.addText(code, { x: M + 0.25, y: 2.45, w: 7.2, h: 3.9, fontFace: MONO, fontSize: 14.5, valign: "top", lineSpacingMultiple: 1.25, margin: 0 });
  const tags = [
    ["1 · Get data", AMBER, 2.5],
    ["2 · Make epochs", TEAL, 3.35],
    ["3 · Prepare (auto)", CYAN, 3.95],
    ["4 · Train", VIOLET, 4.75],
    ["5 · Score", CORAL, 5.55],
  ];
  tags.forEach((t) => {
    s.addShape("roundRect", { x: 8.55, y: t[2], w: 4.18, h: 0.62, rectRadius: 0.08, fill: { color: MIST }, line: { color: t[1], width: 1.25 } });
    s.addShape("ellipse", { x: 8.72, y: t[2] + 0.16, w: 0.3, h: 0.3, fill: { color: t[1] }, line: { type: "none" } });
    s.addText(t[0], { x: 9.15, y: t[2], w: 3.5, h: 0.62, valign: "middle", fontFace: BF, fontSize: 13, bold: true, color: INK, margin: 0 });
  });
  s.addText("braindecode even does most of Step 3 for you automatically.", { x: M, y: 6.7, w: 12, h: 0.35, fontFace: BF, fontSize: 12.5, italic: true, color: SLATE, margin: 0 });
  s.addNotes("Tie it together: each of the 5 steps is one or two lines. Get data, make epochs, (prepare — largely automatic), fit = train, score = accuracy. ~15 lines total. This is the payoff of the whole deep dive.");
})();

// 18. THE AHA (dark) ------------------------------------------------
(() => {
  const s = pres.addSlide();
  darkBg(s);
  pageWave(s, "wave_amber.png");
  badge(s, M, 0.7, 1.15, AMBER, "bulb_w");
  kicker(s, M + 1.35, 0.8, "The big idea", AMBER);
  title(s, M + 1.35, 1.08, 11, "A low score is the RIGHT answer", WHITE, 32);
  s.addText("We fed the model pure random noise. There was no real pattern to find — so an honest model should do no better than guessing.", { x: M, y: 2.5, w: 11.8, h: 0.9, fontFace: BF, fontSize: 17, color: "E4E1F5", margin: 0 });
  s.addShape("roundRect", { x: M, y: 3.6, w: 12.1, h: 1.9, rectRadius: 0.11, fill: { color: "241A54" }, line: { color: VIOLET, width: 1 } });
  badge(s, M + 0.35, 3.95, 1.15, TEAL, "bulb_w");
  s.addText("Flashcard analogy", { x: M + 1.75, y: 3.8, w: 10, h: 0.4, fontFace: HF, fontSize: 18, bold: true, color: WHITE, margin: 0 });
  s.addText("If your flashcards have random gibberish on both sides, no amount of studying will help. 4 classes → guessing is right about 1 in 4 (~25%). Our tiny test set landed at ~15%. That's the model correctly finding… nothing.", { x: M + 1.75, y: 4.2, w: 10.2, h: 1.2, fontFace: BF, fontSize: 13.5, color: "CFC9EE", margin: 0 });
  s.addText("✔  The pipeline works. Now we just need REAL brain data with REAL patterns.", { x: M, y: 5.85, w: 12, h: 0.5, fontFace: BF, fontSize: 15.5, bold: true, color: TEAL, margin: 0 });
  s.addNotes("Reinforce: chance-level accuracy on random data is success. The model honestly reports 'no signal.' It proves the plumbing works, ready for real data.");
})();

// 19. NOISE -> REAL -------------------------------------------------
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "The payoff");
  title(s, M, 0.9, 12, "Swap in real brains → it learns", INK, 32);
  s.addText("Change ONE thing — real motor-imagery EEG instead of random noise — and the exact same 5 steps start working.", { x: M, y: 1.95, w: 12.1, h: 0.7, fontFace: BF, fontSize: 15.5, color: SLATE, margin: 0 });
  card(s, M, 2.9, 5.95, 3.4, MIST);
  s.addText("Random noise (this tutorial)", { x: M + 0.3, y: 3.1, w: 5.4, h: 0.4, fontFace: HF, fontSize: 16, bold: true, color: SLATE, margin: 0 });
  s.addImage({ path: A("wave_cyan.png"), x: M + 0.3, y: 3.6, w: 5.35, h: 0.5, transparency: 30 });
  s.addText("~25%", { x: M + 0.3, y: 4.25, w: 5.4, h: 0.8, fontFace: HF, fontSize: 46, bold: true, color: SLATE, margin: 0 });
  s.addText("score = pure guessing", { x: M + 0.3, y: 5.15, w: 5.4, h: 0.4, fontFace: BF, fontSize: 13, color: SLATE, margin: 0 });
  s.addShape("roundRect", { x: 6.78, y: 2.9, w: 5.95, h: 3.4, rectRadius: 0.11, fill: { color: INDIGO }, line: { type: "none" }, shadow: shadow() });
  s.addText("Real ‘imagine moving’ EEG", { x: 7.08, y: 3.1, w: 5.4, h: 0.4, fontFace: HF, fontSize: 16, bold: true, color: WHITE, margin: 0 });
  s.addImage({ path: A("wave_amber.png"), x: 7.08, y: 3.6, w: 5.35, h: 0.5 });
  s.addText("70–90%", { x: 7.08, y: 4.25, w: 5.4, h: 0.8, fontFace: HF, fontSize: 46, bold: true, color: AMBER, margin: 0 });
  s.addText("the model really reads intention", { x: 7.08, y: 5.15, w: 5.4, h: 0.4, fontFace: BF, fontSize: 13, color: CYAN, margin: 0 });
  s.addText("Left hand vs. right hand, just from brain waves — that's a real Brain–Computer Interface in action.", { x: M, y: 6.5, w: 12, h: 0.4, align: "center", fontFace: BF, fontSize: 14, italic: true, color: INK, margin: 0 });
  s.addNotes("Payoff: identical pipeline + real motor-imagery EEG jumps from ~25% chance to 70-90%. Reads imagined left vs right hand. That's a working BCI. Ranges are typical for the classic dataset.");
})();

// 20. GLOSSARY ------------------------------------------------------
(() => {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  kicker(s, M, 0.55, "Keep these in your pocket");
  title(s, M, 0.9, 12, "Word bank", INK, 34);
  const terms = [
    ["Channel", "One electrode = one column of readings."],
    ["Sample", "One moment in time (250 per second at 250 Hz)."],
    ["Epoch (EEG)", "One equal-length labeled clip = one trial."],
    ["Epoch (training)", "One full pass through all training clips."],
    ["Class", "The category to predict (e.g. Left vs Right hand)."],
    ["X and y", "X = the brain clips; y = their labels/answers."],
    ["Filter", "Keep brain rhythms; remove drift and noise."],
    ["Train (.fit)", "Show examples so the model improves."],
    ["Validation", "Unseen clips used to fairly test the model."],
    ["Accuracy", "Fraction correct on the validation clips."],
  ];
  const cw = 5.95, rh = 0.88;
  terms.forEach((t, idx) => {
    const col = idx % 2, row = Math.floor(idx / 2);
    const x = M + col * (cw + 0.2), y = 2.05 + row * (rh + 0.04);
    card(s, x, y, cw, rh, idx % 2 === 0 ? MIST : WHITE);
    s.addText(t[0], { x: x + 0.22, y: y + 0.1, w: 2.45, h: rh - 0.2, fontFace: HF, fontSize: 14, bold: true, color: VIOLET, valign: "middle", margin: 0 });
    s.addText(t[1], { x: x + 2.5, y: y + 0.1, w: cw - 2.7, h: rh - 0.2, fontFace: BF, fontSize: 12, color: INK, valign: "middle", margin: 0 });
  });
  s.addNotes("Glossary, now including the two meanings of 'epoch', plus X/y, validation, filter, sample. Great for a quick review or quiz.");
})();

// 21. RESOURCES -----------------------------------------------------
(() => {
  const s = pres.addSlide();
  darkBg(s);
  pageWave(s, "wave_cyan.png");
  badge(s, M, 0.7, 1.1, CORAL, "play_w");
  kicker(s, M + 1.3, 0.78, "Watch & explore", CORAL);
  title(s, M + 1.3, 1.06, 11, "Videos & resources", WHITE, 34);
  const vids = [
    ["How do nerves work? — TED-Ed (5 min)", "https://www.youtube.com/watch?v=uU_4uA6-zcE"],
    ["2-Minute Neuroscience: EEG (2 min)", "https://www.youtube.com/watch?v=tZcKT4l_JZk"],
    ["A headset that reads your brainwaves — TED, Tan Le", "https://www.youtube.com/watch?v=fs2GDSYYCoA"],
    ["A new neurotech tool — TED, Conor Russomanno", "https://www.youtube.com/watch?v=ZkWJem3LY5E"],
    ["Neural Networks in 5 minutes", "https://www.youtube.com/watch?v=jmmW0F0biz0"],
  ];
  let y = 2.35;
  vids.forEach((v) => {
    s.addShape("roundRect", { x: M, y, w: 7.55, h: 0.62, rectRadius: 0.08, fill: { color: "241A54" }, line: { color: VIOLET, width: 1 } });
    s.addImage({ path: A("youtube.png"), x: M + 0.18, y: y + 0.14, w: 0.42, h: 0.34 });
    s.addText([{ text: v[0], options: { hyperlink: { url: v[1], tooltip: v[0] }, color: "E9E6F8", bold: true, fontFace: BF, fontSize: 12.5 } }], { x: M + 0.78, y, w: 6.65, h: 0.62, valign: "middle", margin: 0 });
    y += 0.72;
  });
  s.addShape("roundRect", { x: 8.5, y: 2.35, w: 4.25, h: 3.95, rectRadius: 0.1, fill: { color: "1B1240" }, line: { color: TEAL, width: 1 } });
  s.addText("Go deeper", { x: 8.75, y: 2.5, w: 3.8, h: 0.4, fontFace: HF, fontSize: 17, bold: true, color: WHITE, margin: 0 });
  const links = [
    ["braindecode — docs & tutorials", "https://braindecode.org/stable/index.html"],
    ["Tutorial #1 page", "https://braindecode.org/stable/auto_examples/model_building/plot_basic_training_epochs.html"],
    ["MNE-Python (EEG toolkit)", "https://mne.tools/stable/index.html"],
    ["PyTorch (the AI engine)", "https://pytorch.org/"],
  ];
  let ly = 3.05;
  links.forEach((l) => {
    s.addText([{ text: "› " + l[0], options: { hyperlink: { url: l[1], tooltip: l[0] }, color: "D7D2F0", fontFace: BF, fontSize: 12.5 } }], { x: 8.75, y: ly, w: 3.8, h: 0.7, valign: "top", margin: 0 });
    ly += 0.78;
  });
  s.addText("Tip: tap any blue title to open it.", { x: M, y: 6.55, w: 11, h: 0.35, fontFace: BF, fontSize: 12, italic: true, color: "B9B3DE", margin: 0 });
  s.addNotes("Verified beginner-friendly videos plus links to braindecode, the exact Tutorial #1 page, MNE, and PyTorch.");
})();

// 22. CLOSING -------------------------------------------------------
(() => {
  const s = pres.addSlide();
  darkBg(s);
  s.addImage({ path: A("wave_cyan.png"), x: 0, y: 5.2, w: W, h: 0.95, transparency: 15 });
  badge(s, M, 0.85, 1.2, AMBER, "cap_w");
  s.addText("YOUR TURN", { x: M, y: 2.15, w: 10, h: 0.4, fontFace: BF, fontSize: 14, bold: true, color: CYAN, charSpacing: 3, margin: 0 });
  s.addText("You now understand the\nwhole data pipeline.", { x: M, y: 2.55, w: 11.8, h: 1.8, fontFace: HF, fontSize: 42, bold: true, color: WHITE, lineSpacingMultiple: 0.98, margin: 0 });
  bullets(s, M, 4.6, 11.8, 1.6, [
    { t: "You can explain channels, time, trials, classes, epochs, training, and accuracy." },
    { t: "You know WHY data must be cleaned and reshaped before an AI can learn from it." },
    { t: "The full project is on GitHub — the code is ready when you are." },
  ], { fontSize: 15, gap: 9, color: "E4E1F5" });
  s.addText("Understand the data, and the AI stops being magic. Welcome aboard. 🧠⚡", { x: M, y: 6.75, w: 12, h: 0.4, fontFace: BF, fontSize: 14, italic: true, color: TEAL, margin: 0 });
  s.addNotes("Close: recap the pipeline vocabulary and the WHY of data prep, point to the repo, and encourage. The theme: understanding the data demystifies the AI.");
})();

pres.writeFile({ fileName: path.join(__dirname, "BrainWaves_and_AI.pptx") }).then((f) => console.log("WROTE", f));
