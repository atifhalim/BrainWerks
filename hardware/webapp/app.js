// BrainWerks examples — shared front-end for every tutorial page.
//
// A page declares what it wants before loading this script:
//   window.PAGE = { datasets: ["synthetic", ...], training: true|false }
// The dataset dropdown is filtered to PAGE.datasets, and the train controls are
// wired only when PAGE.training is true and the Step 3/4 elements exist.
const $ = id => document.getElementById(id);
const PAGE = window.PAGE || { datasets: null, training: false };
let CFG = null;

async function boot() {
  CFG = await (await fetch('/api/config')).json();
  const keys = PAGE.datasets || Object.keys(CFG.datasets);
  for (const k of keys)
    if (CFG.datasets[k]) $('dataset').add(new Option(CFG.datasets[k].label, k));

  if (PAGE.training && $('model')) {
    for (const m of CFG.models) $('model').add(new Option(m.label, m.name));
    if (!CFG.cuda) {
      $('device').querySelector('option[value="cuda"]').disabled = true;
      $('dev-note').textContent =
        'No GPU is visible to PyTorch here, so training runs on the CPU.';
    } else {
      $('dev-note').textContent = 'Auto uses your Jetson GPU when its shared ' +
        'memory has room, and falls back to the CPU automatically if it does ' +
        'not — so a run gets GPU speed when it fits and never just crashes.';
    }
    $('train').onclick = onTrain;
  }
  $('dataset').onchange = renderParams;
  renderParams();
}

function renderParams() {
  const ds = CFG.datasets[$('dataset').value];
  if ($('ds-blurb')) $('ds-blurb').textContent = ds.blurb;
  $('params').innerHTML = '';
  for (const p of ds.params) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<label>${p.label}</label>
      <input type="number" id="p_${p.name}" value="${p.default}"
             min="${p.min}" max="${p.max}" step="${p.step}">`;
    $('params').appendChild(wrap);
  }
  if ($('ds-fixed')) $('ds-fixed').textContent = ds.fixed || '';
  if ($('preview')) $('preview').classList.add('hidden');
}

function collectParams() {
  const ds = CFG.datasets[$('dataset').value];
  const out = {};
  for (const p of ds.params) out[p.name] = $('p_' + p.name).value;
  return out;
}

// Build a table: a header row of `headers`, then `rows`. The first `nLeft`
// columns are left-aligned index columns; the rest are right-aligned numbers.
function renderTable(id, headers, rows, nLeft) {
  let h = '<tr>' + headers
    .map((c, i) => `<th class="${i < nLeft ? 'lh' : ''}">${c}</th>`).join('') + '</tr>';
  for (const row of rows) {
    h += '<tr>' + row
      .map((v, i) => `<td class="${i < nLeft ? 'lh' : ''}">${v}</td>`).join('') + '</tr>';
  }
  $(id).innerHTML = h;
}

async function onView() {
  $('view').disabled = true; $('view').textContent = 'Loading…';
  try {
    const d = await post('/api/preview',
      { dataset: $('dataset').value, params: collectParams() });
    $('shape').innerHTML =
      `<b>${d.trials}</b> clips × <b>${d.channels}</b> channels × <b>${d.n_times}</b> samples` +
      (d.sfreq ? ` &nbsp;·&nbsp; ${d.sfreq.toFixed(0)} Hz` +
        (d.clip_sec ? ` &nbsp;·&nbsp; ${d.clip_sec.toFixed(2)} s per clip` : '') : '');
    $('classes').innerHTML = 'Classes: ' + Object.entries(d.counts)
      .map(([c, n]) => `<span class="pill">${c} · ${n}</span>`).join('') +
      ` <span class="muted">(chance = ${d.chance.toFixed(0)}%)</span>`;

    // Raw data — one clip: rows = moments in time, columns = channels.
    const hz = d.sfreq ? d.sfreq.toFixed(0) : '—';
    $('rawnote').innerHTML =
      'Each <b>column is one channel</b> (one electrode on the head). Each ' +
      `<b>row is one moment in time</b> (one sample — at ${hz} Hz there are ${hz} ` +
      'rows per second). Each <b>number is a voltage</b> in microvolts (µV).';
    renderTable('rawtable',
      ['Time (ms)', ...d.raw.ch_names.map(c => `${c} (µV)`)], d.raw.rows, 1);
    $('rawcap').textContent =
      `Showing clip 1 · first ${d.raw.n_show} of ${d.raw.n_total} samples` +
      (d.channels > d.ch_show ? ` · first ${d.ch_show} of ${d.channels} channels` : '');

    // Pipeline tensor — stack epochs into X and y.
    $('tensornote').innerHTML =
      'A <b>dataset</b> is a stack of <b>epochs</b> — equal-length, labeled clips. ' +
      'Each epoch is a grid of <b>channels × samples</b> and carries one <b>class</b>. ' +
      'Stacking them all gives <b>X</b> and <b>y</b>:';
    $('xshape').innerHTML =
      `<span class="k">X</span>  (trials, channels, time) = <b>(${d.trials}, ${d.channels}, ${d.n_times})</b>`;
    $('yhead').innerHTML =
      `<span class="k">y</span>  one label per clip = [ ${d.tensor.y_head.join(', ')}, … ]`;
    $('clsmap').innerHTML = '<span class="k">classes</span>:  ' +
      d.classes.map((c, i) => `${i} = ${c}`).join('  ·  ');
    renderTable('tensortable',
      ['Trial (epoch)', 'Sample', 'Time (ms)', ...d.tensor.ch_names.map(c => `${c} (µV)`)],
      d.tensor.rows, 3);
    $('tensorcap').textContent =
      `First ${d.tensor.n_show} of ${d.tensor.n_total.toLocaleString()} (trials × samples) rows.`;

    $('preview').classList.remove('hidden');
  } catch (e) { alert(e.message); }
  $('view').disabled = false; $('view').textContent = '👁  View the data';
}

async function onTrain() {
  $('train').disabled = true;
  $('result').classList.add('hidden');
  $('status').innerHTML = '⏳ Training on your Jetson… (a real dataset downloads ' +
    'a sample on the first run, which can take a minute).';
  try {
    const r = await post('/api/train', {
      dataset: $('dataset').value, params: collectParams(),
      model: $('model').value, epochs: $('epochs').value,
      batch: $('batch').value, lr: $('lr').value, device: $('device').value });
    $('status').textContent = '';
    $('acc').textContent = r.accuracy_pct + '%';
    $('chance').textContent = ` test accuracy  ·  chance = ${r.chance_pct}%`;
    $('accbar').style.width = Math.min(100, r.accuracy_pct) + '%';
    const learned = r.accuracy_pct >= r.chance_pct + 5;
    $('verdict').textContent = r.verdict || '';
    $('verdict').className = learned ? 'good' : 'muted';
    let meta =
      `${r.model} · trained on ${r.n_train} clips, tested on ${r.n_test} · ` +
      `${r.n_chans} channels × ${r.n_times} samples · ran on ${r.device.toUpperCase()}` +
      (r.note ? ' · ' + r.note : '');
    if (r.split_note) meta += '<br>' + r.split_note;
    if (r.reference_note) meta += '<br>' + r.reference_note;
    $('rmeta').innerHTML = meta;
    drawLoss(r.train_loss);
    $('result').classList.remove('hidden');
  } catch (e) {
    $('status').innerHTML = '<span class="err">' + e.message + '</span>';
  }
  $('train').disabled = false;
}

function drawLoss(loss) {
  if (!loss || loss.length < 2) { $('loss').classList.add('hidden'); return; }
  const W = 320, H = 90, pad = 6;
  const lo = Math.min(...loss), hi = Math.max(...loss);
  const x = i => pad + i * (W - 2 * pad) / (loss.length - 1);
  const yv = v => H - pad - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (H - 2 * pad);
  const pts = loss.map((v, i) => `${x(i).toFixed(1)},${yv(v).toFixed(1)}`).join(' ');
  $('loss').innerHTML =
    `<polyline fill="none" stroke="#6ea8fe" stroke-width="2" points="${pts}"/>`;
  $('loss').classList.remove('hidden');
  $('losscap').classList.remove('hidden');
}

async function post(url, body) {
  const res = await fetch(url, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || ('HTTP ' + res.status));
  return d;
}

if (document.getElementById('view')) $('view').onclick = onView;
boot();
