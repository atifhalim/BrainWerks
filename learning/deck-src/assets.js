// Generate PNG assets: icon badges, gradient backgrounds, EEG waveform motif.
const fs = require("fs");
const path = require("path");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const Fa = require("react-icons/fa");

const OUT = path.join(__dirname, "assets");
fs.mkdirSync(OUT, { recursive: true });

async function svgToPng(svg, file, width) {
  let img = sharp(Buffer.from(svg));
  if (width) img = img.resize({ width });
  const buf = await img.png().toBuffer();
  fs.writeFileSync(path.join(OUT, file), buf);
}

// --- Icons (react-icons -> SVG -> PNG), fill forced to a hex color ---
async function icon(Comp, hex, file) {
  let svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Comp, { size: 256 })
  );
  svg = svg.replace(/currentColor/g, "#" + hex);
  if (!/xmlns=/.test(svg)) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  await svgToPng(svg, file, 256);
}

// --- EEG-style waveform path ---
function wavePath(w, h) {
  const mid = h / 2;
  let d = `M 0 ${mid}`;
  let x = 0;
  const step = 14;
  // pseudo-random but deterministic wiggle with occasional spikes
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  while (x < w) {
    const spike = rnd() < 0.08;
    const amp = spike ? h * 0.42 : h * (0.06 + rnd() * 0.16);
    const dir = rnd() < 0.5 ? -1 : 1;
    const y1 = mid + dir * amp;
    const y2 = mid - dir * amp * (spike ? 0.7 : rnd());
    d += ` L ${x + step * 0.5} ${y1.toFixed(1)} L ${x + step} ${y2.toFixed(1)}`;
    x += step;
  }
  return d;
}

function waveSvg(w, h, hex, sw, opacity) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <path d="${wavePath(w, h)}" fill="none" stroke="#${hex}" stroke-width="${sw}"
      stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>
  </svg>`;
}

// --- Dark gradient background with soft glows ---
function bgDark(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2A1466"/>
        <stop offset="0.55" stop-color="#1A0E45"/>
        <stop offset="1" stop-color="#100827"/>
      </linearGradient>
      <radialGradient id="glow1" cx="0.18" cy="0.2" r="0.5">
        <stop offset="0" stop-color="#5B2A9D" stop-opacity="0.75"/>
        <stop offset="1" stop-color="#5B2A9D" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glow2" cx="0.9" cy="0.85" r="0.5">
        <stop offset="0" stop-color="#22D3EE" stop-opacity="0.35"/>
        <stop offset="1" stop-color="#22D3EE" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <rect width="${w}" height="${h}" fill="url(#glow1)"/>
    <rect width="${w}" height="${h}" fill="url(#glow2)"/>
  </svg>`;
}

(async () => {
  const W = 2660, H = 1500;
  await svgToPng(bgDark(W, H), "bg_dark.png");
  await svgToPng(waveSvg(2660, 260, "22D3EE", 6, 0.9), "wave_cyan.png");
  await svgToPng(waveSvg(2660, 260, "FBBF24", 6, 0.85), "wave_amber.png");
  await svgToPng(waveSvg(2660, 200, "5B2A9D", 5, 0.5), "wave_faint.png");

  const icons = [
    [Fa.FaBrain, "22D3EE", "brain"],
    [Fa.FaBolt, "FBBF24", "bolt"],
    [Fa.FaWaveSquare, "2DD4BF", "wave"],
    [Fa.FaHeadphones, "22D3EE", "headset"],
    [Fa.FaRobot, "FBBF24", "robot"],
    [Fa.FaMicrochip, "22D3EE", "chip"],
    [Fa.FaChartLine, "2DD4BF", "chart"],
    [Fa.FaLaptopCode, "22D3EE", "code"],
    [Fa.FaGraduationCap, "FBBF24", "cap"],
    [Fa.FaHandPointer, "2DD4BF", "hand"],
    [Fa.FaBookOpen, "22D3EE", "book"],
    [Fa.FaYoutube, "FB5B5B", "youtube"],
    [Fa.FaLightbulb, "FBBF24", "bulb"],
    [Fa.FaWheelchair, "22D3EE", "wheelchair"],
    [Fa.FaBed, "2DD4BF", "bed"],
    [Fa.FaComments, "22D3EE", "comments"],
    [Fa.FaListOl, "FBBF24", "list"],
    [Fa.FaBullseye, "FB7185", "target"],
    [Fa.FaFlask, "2DD4BF", "flask"],
    [Fa.FaSitemap, "22D3EE", "pipeline"],
    [Fa.FaQuestion, "FBBF24", "question"],
    [Fa.FaCheckCircle, "2DD4BF", "check"],
    // white variants for colored circles
    [Fa.FaBrain, "FFFFFF", "brain_w"],
    [Fa.FaBolt, "FFFFFF", "bolt_w"],
    [Fa.FaHeadphones, "FFFFFF", "headset_w"],
    [Fa.FaRobot, "FFFFFF", "robot_w"],
    [Fa.FaWaveSquare, "FFFFFF", "wave_w"],
    [Fa.FaListOl, "FFFFFF", "list_w"],
    [Fa.FaChartLine, "FFFFFF", "chart_w"],
    [Fa.FaLaptopCode, "FFFFFF", "code_w"],
    [Fa.FaPlay, "FFFFFF", "play_w"],
    [Fa.FaFlask, "FFFFFF", "flask_w"],
    [Fa.FaHandPointer, "FFFFFF", "hand_w"],
    [Fa.FaLightbulb, "FFFFFF", "bulb_w"],
    [Fa.FaComments, "FFFFFF", "comments_w"],
    [Fa.FaWheelchair, "FFFFFF", "wheelchair_w"],
    [Fa.FaBed, "FFFFFF", "bed_w"],
    [Fa.FaMicrochip, "FFFFFF", "chip_w"],
    [Fa.FaBullseye, "FFFFFF", "target_w"],
    [Fa.FaCheckCircle, "FFFFFF", "check_w"],
    [Fa.FaGraduationCap, "FFFFFF", "cap_w"],
    [Fa.FaBookOpen, "FFFFFF", "book_w"],
    [Fa.FaYoutube, "FFFFFF", "youtube_w"],
    // pipeline deep-dive icons (white for badges)
    [Fa.FaDatabase, "FFFFFF", "database_w"],
    [Fa.FaCut, "FFFFFF", "cut_w"],
    [Fa.FaFilter, "FFFFFF", "filter_w"],
    [Fa.FaTrophy, "FFFFFF", "trophy_w"],
    [Fa.FaClock, "FFFFFF", "clock_w"],
    [Fa.FaTag, "FFFFFF", "tag_w"],
    [Fa.FaColumns, "FFFFFF", "columns_w"],
    [Fa.FaBalanceScale, "FFFFFF", "balance_w"],
    [Fa.FaTable, "FFFFFF", "table_w"],
    [Fa.FaSyncAlt, "FFFFFF", "loop_w"],
    [Fa.FaRuler, "FFFFFF", "ruler_w"],
  ];
  for (const [C, hex, name] of icons) await icon(C, hex, name + ".png");
  console.log("assets generated:", fs.readdirSync(OUT).length, "files");
})();
