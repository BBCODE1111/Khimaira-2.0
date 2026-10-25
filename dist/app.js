import { parseMidi } from './midi.js';
import { encodeAuditedMidi } from './export.js';
import { inferKeys, noteNames, noteName, audioNotesToBeats } from './analysis.js';
import { harmonize, styles, demoMelody, validateMelody, overlaps } from './harmony.js';
import { MelodyPlayer } from './player.js?v=2.0.0-alpha.1';

const $ = id => document.getElementById(id), player = new MelodyPlayer();
const state = { source: null, melody: [], key: { root: 0, mode: 'major' }, keyResult: null, meter: { numerator: 4, denominator: 4 }, bpm: 120, result: null, style: 'basic', seed: 0, audioBuffer: null, audioNotes: [], offset: 0, midi: null, warnings: [], editing: -1 };
let busy = false, importToken = 0, worker = null, rejectAnalysis = null, playingCard = -1, playbackRequest = 0;
const format = n => Number(n.toFixed(3)).toString();
const beatsPerBar = () => state.meter.numerator * 4 / state.meter.denominator;
const tempoMap = () => state.source?.kind === 'midi' && !$('tempo-override').checked ? state.midi.tempoMap : [{ beat: 0, bpm: state.bpm }];
const fail = error => { $('error').textContent = error.message || String(error); $('error').hidden = false; };
const clearError = () => { $('error').hidden = true; $('error').textContent = ''; };
const stop = () => { playbackRequest++; player.stop(); $('playhead').textContent = 'BAR 1 · BEAT 1'; $('play').textContent = '▶ PLAY'; $('play').setAttribute('aria-pressed', 'false'); };
const safeAction = fn => (...args) => { clearError(); try { const result = fn(...args); result?.catch?.(fail); } catch (e) { fail(e); } };

noteNames.forEach((name, root) => $('key-root').add(new Option(name, root)));
for (const [id, style] of Object.entries(styles).filter(([id]) => id !== 'basic')) {
  const button = document.createElement('button'); button.className = 'style-button'; button.dataset.style = id;
  const pieces = style.label.split(' '), title = document.createTextNode(pieces[0]), caption = document.createElement('span'); caption.textContent = pieces.slice(1).join(' ') || '旋律相容變化';
  button.append(title, caption); button.addEventListener('click', safeAction(() => generate(id, state.seed + 1))); $('style-grid').append(button);
}

function setBusy(value) {
  busy = value; $('file').disabled = value; $('demo').disabled = value; $('demo-audio').disabled = value; $('dropzone').classList.toggle('busy', value);
  $('workspace').classList.toggle('busy', value); $('progress-wrap').hidden = !value;
  if (value) { stop(); $('progress').value = 0; }
}

function renderSource() {
  $('workspace').hidden = false; $('transport').hidden = false;
  $('source-name').textContent = state.source.name;
  $('bpm').value = format(state.bpm); $('key-root').value = state.key.root; $('key-mode').value = state.key.mode;
  const meterValue = `${state.meter.numerator}/${state.meter.denominator}`;
  if (![...$('meter').options].some(o => o.value === meterValue)) $('meter').add(new Option(meterValue, meterValue));
  $('meter').value = meterValue;
  const audio = state.source.kind === 'audio', midi = state.source.kind === 'midi';
  const variable = midi && state.midi.tempoMap.length > 1 && !$('tempo-override').checked;
  $('bpm').disabled = variable; $('half-tempo').disabled = variable; $('double-tempo').disabled = variable;
  $('offset-wrap').hidden = !audio; $('offset').value = format(state.offset);
  $('tempo-override-wrap').hidden = !(midi && state.midi.tempoMap.length > 1);
  $('track-wrap').hidden = !midi; $('listen-mode').querySelector('[value=original]').disabled = !audio;
  if (!audio && $('listen-mode').value === 'original') $('listen-mode').value = 'notes';
  $('tempo-info').textContent = audio ? `${state.source.tempo.confidence}；BPM 修正不拉伸原音。` : variable ? `保留 ${state.midi.tempoMap.length} 段速度變化：${state.midi.tempoMap.map(t => format(t.bpm)).slice(0, 5).join(' → ')} BPM` : midi && !state.midi.hasTempo ? '檔案未寫速度：暫用標準 120 BPM，請確認。' : midi ? '使用 MIDI 速度；可手動修改。' : '範例速度；可直接修改。';
  $('key-info').textContent = `${state.keyResult.confidence} · 建議 ${state.keyResult.candidates[0].label}；可手動改調。`;
  const end = Math.max(...state.melody.map(n => n.end));
  $('note-count').textContent = `${state.melody.length} 個音 · ${Math.ceil(end / beatsPerBar())} 小節${audio ? ' · 拍號請人工確認' : ''}`;
  $('source-warnings').replaceChildren();
  const warnings = [...state.warnings];
  const polyphony = state.melody.some((a, i) => state.melody.slice(i + 1).some(b => a.pitch !== b.pitch && overlaps(a, b)));
  if (polyphony) warnings.push('所選旋律軌包含重疊多音；會同時保護這些音，和弦選項可能變少。');
  for (const message of warnings) { const p = document.createElement('p'); p.textContent = message; $('source-warnings').append(p); }
  $('source-warnings').hidden = !warnings.length;
  $('key-candidates').replaceChildren(document.createTextNode('其他可能調性：'));
  state.keyResult.candidates.forEach(candidate => {
    const b = document.createElement('button'); b.textContent = candidate.label;
    b.addEventListener('click', safeAction(() => { state.key = { root: candidate.root, mode: candidate.mode }; renderSource(); generate(state.style, state.seed); }));
    $('key-candidates').append(b);
  });
  renderRoll(); renderNoteTable();
}

function generate(style = state.style, seed = state.seed) {
  if (!state.melody.length) throw Error('請先匯入旋律。');
  stop();
  const previous = state.result;
  const next = harmonize(state.melody, { key: state.key, style, seed, beatsPerBar: beatsPerBar() });
  state.result = next; state.style = style; state.seed = seed;
  $('variation').disabled = false; $('export').disabled = false;
  $('style-description').textContent = styles[style].description;
  document.querySelectorAll('[data-style]').forEach(button => { const selected = button.dataset.style === style; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', selected); });
  $('audit-badge').textContent = `0 個衝突 · ${next.accompaniment.length} 個伴奏音`;
  $('chord-grid').replaceChildren();
  next.segments.forEach((segment, i) => {
    const card = document.createElement('article'); card.className = 'chord-card' + (segment.symbol === 'N.C.' ? ' nc' : ''); card.dataset.segment = i;
    const bar = document.createElement('span'); bar.className = 'bar-label'; bar.textContent = `BAR ${String(Math.floor(segment.start / beatsPerBar()) + 1).padStart(2, '0')} · 拍 ${format(segment.start % beatsPerBar() + 1)}`;
    const length = document.createElement('span'); length.className = 'length'; length.textContent = `${format(segment.end - segment.start)} 拍`;
    const title = document.createElement('h3'); title.textContent = segment.symbol;
    const tones = document.createElement('div'); tones.className = 'tones'; tones.textContent = segment.symbol === 'N.C.' ? '沒有相容和弦，保留旋律' : segment.pcs.map(n => noteNames[n]).join(' · ');
    card.append(bar, length, title, tones); $('chord-grid').append(card);
  });
  const same = previous && JSON.stringify(previous.segments.map(s => s.symbol)) === JSON.stringify(next.segments.map(s => s.symbol));
  $('harmony-info').textContent = `${next.segments.length} 個和弦區段 · ${next.splitCount ? `為保護旋律額外拆出 ${next.splitCount} 段` : '整小節相容'}${next.gaps ? ` · ${next.gaps} 段留白` : ''}${same ? ' · 安全和弦選項有限，這次保留相同和弦名稱；演奏依選定樂風。' : ''}`;
  renderRoll();
  $('status').textContent = `${state.source.name} · ${styles[style].label}已生成。先聽「辨識音符」確認旋律，再比較不同樂風。`;
}

const svgNS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, text) { const node = document.createElementNS(svgNS, tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value); if (text !== undefined) node.textContent = text; return node; }
function renderRoll() {
  const melody = state.melody, harmony = state.result?.accompaniment || [], all = [...melody, ...harmony];
  const end = state.result?.totalBeats || Math.ceil(Math.max(...melody.map(n => n.end)) / beatsPerBar()) * beatsPerBar();
  const width = Math.max(960, end * 28 + 48), height = 260, left = 42, top = 28;
  const low = Math.max(0, Math.min(...all.map(n => n.pitch)) - 2), high = Math.min(127, Math.max(...all.map(n => n.pitch)) + 2);
  const row = (height - top - 12) / (high - low + 1), x = beat => left + beat / end * (width - left - 12), y = pitch => top + (high - pitch) * row;
  const roll = $('piano-roll'); roll.replaceChildren(); roll.setAttribute('viewBox', `0 0 ${width} ${height}`); roll.style.width = width + 'px';
  for (let p = low; p <= high; p++) {
    if ([1, 3, 6, 8, 10].includes(p % 12)) roll.append(svg('rect', { x: left, y: y(p), width: width - left, height: row, fill: '#0e2333' }));
    if (p % 12 === 0 || p === low) roll.append(svg('text', { x: 5, y: y(p) + row * .8, fill: '#8fa7b8', 'font-size': 9 }, noteName(p)));
  }
  for (let b = 0; b <= end; b += beatsPerBar()) {
    roll.append(svg('line', { x1: x(b), x2: x(b), y1: top, y2: height, stroke: '#365065', 'stroke-width': 1 }));
    if (b < end) roll.append(svg('text', { x: x(b) + 5, y: 17, fill: '#93a9b7', 'font-size': 10 }, `${Math.floor(b / beatsPerBar()) + 1}`));
  }
  harmony.forEach(n => roll.append(svg('rect', { x: x(n.start), y: y(n.pitch) + 1, width: Math.max(1, x(n.end) - x(n.start) - .4), height: Math.max(2, row - 2), rx: 1, fill: '#c4a779', opacity: .65 })));
  melody.forEach((n, i) => {
    const rect = svg('rect', { x: x(n.start), y: y(n.pitch), width: Math.max(4, x(n.end) - x(n.start)), height: Math.max(4, row - 1), rx: 2, fill: '#8ccfe9', class: 'roll-note', tabindex: 0, role: 'button', 'aria-label': `${noteName(n.pitch)}，起始 ${format(n.start)} 拍，編輯音符` });
    rect.append(svg('title', {}, `${noteName(n.pitch)} · ${format(n.start)}–${format(n.end)} 拍`));
    rect.addEventListener('click', () => editNote(i)); rect.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); editNote(i); } }); roll.append(rect);
  });
  roll.append(svg('line', { id: 'roll-playhead', x1: x(0), x2: x(0), y1: top, y2: height, stroke: '#fff2c6', 'stroke-width': 1.5, visibility: 'hidden' }));
  roll.dataset.end = end; roll.dataset.width = width;
}

function renderNoteTable() {
  $('note-table').replaceChildren();
  state.melody.forEach((note, index) => {
    const row = document.createElement('tr');
    for (const value of [noteName(note.pitch), format(note.start), format(note.end - note.start), `${Math.round((note.confidence ?? 1) * 100)}%`]) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
    const cell = document.createElement('td'), button = document.createElement('button'); button.textContent = '編輯'; button.setAttribute('aria-label', `編輯第 ${index + 1} 音 ${noteName(note.pitch)}`); button.addEventListener('click', () => editNote(index)); cell.append(button); row.append(cell); $('note-table').append(row);
  });
}
function editNote(index) {
  stop(); state.editing = index; const n = state.melody[index];
  $('editing-note').textContent = `第 ${index + 1} 個音 · ${noteName(n.pitch)}`;
  $('edit-pitch').value = n.pitch; $('edit-start').value = format(n.start); $('edit-duration').value = format(n.end - n.start);
  $('delete-note').disabled = state.melody.length <= 1; $('edit-error').hidden = true; $('note-dialog').showModal();
}
function updateEdited(notes) {
  validateMelody(notes);
  const result = harmonize(notes, { key: state.key, style: state.style, seed: state.seed, beatsPerBar: beatsPerBar() });
  state.melody = notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
  if (state.source.kind === 'audio') state.audioNotes = state.melody.map(n => ({ ...n, start: n.start * 60 / state.bpm + state.offset, end: n.end * 60 / state.bpm + state.offset }));
  state.keyResult = inferKeys(state.melody); state.result = result;
  renderSource(); generate(state.style, state.seed); $('note-dialog').close();
}
$('note-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const pitch = Number($('edit-pitch').value), start = Number($('edit-start').value), duration = Number($('edit-duration').value);
    const notes = state.melody.map((n, i) => i === state.editing ? { ...n, pitch, start, end: start + duration, confidence: 1 } : { ...n }); updateEdited(notes);
  } catch (error) { $('edit-error').hidden = false; $('edit-error').textContent = error.message; }
});
$('delete-note').addEventListener('click', () => { try { updateEdited(state.melody.filter((_, i) => i !== state.editing)); } catch (error) { $('edit-error').hidden = false; $('edit-error').textContent = error.message; } });
$('cancel-edit').addEventListener('click', () => $('note-dialog').close());

function chooseMidiTrack(id) {
  const track = state.midi.tracks.find(t => t.id === id);
  if (!track) throw Error('找不到所選旋律軌。');
  if (track.pitchBend) throw Error('這條軌含 Pitch Bend，半音音符不能完整代表實際音高。請選其他旋律軌，或先匯出乾淨音訊。');
  validateMelody(track.notes); state.melody = track.notes.map(n => ({ ...n }));
  state.keyResult = inferKeys(state.melody); state.key = state.midi.keyHint || state.keyResult.candidates[0];
  state.result = null; state.seed = 0; state.style = 'basic'; renderSource(); generate('basic', 0);
}

function loadDemo() {
  clearError(); stop(); state.source = { kind: 'demo', name: '原創範例 · 8 小節旋律' }; state.melody = demoMelody();
  state.bpm = 108; state.meter = { numerator: 4, denominator: 4 }; state.keyResult = inferKeys(state.melody); state.key = { root: 0, mode: 'major' };
  state.audioBuffer = null; state.audioNotes = []; state.midi = null; state.offset = 0; state.warnings = []; state.result = null; state.seed = 0;
  $('listen-mode').value = 'notes'; $('tempo-override').checked = false; renderSource(); generate('basic', 0);
}

async function importFile(file) {
  if (!file || busy) return; clearError(); const token = ++importToken; setBusy(true);
  $('status').textContent = `正在讀取 ${file.name}…`;
  try {
    if (file.size > 40 * 1024 * 1024) throw Error('檔案上限 40 MB，請先截出旋律段落。');
    const buffer = await file.arrayBuffer(); if (token !== importToken) return;
    const magic = new TextDecoder().decode(buffer.slice(0, 4));
    if (magic === 'MThd' || /\.midi?$/i.test(file.name)) {
      const midi = parseMidi(buffer);
      const eligible = midi.tracks.filter(t => !t.pitchBend && t.notes.length <= 2000 && Math.max(...t.notes.map(n => n.end)) <= 512);
      if (!eligible.length) throw Error('找不到可用旋律軌：請匯出不含 Pitch Bend、少於 2,000 音與 512 拍的 MIDI。');
      const ranked = eligible.map(track => {
        const overlapsCount = track.notes.filter((n, i, a) => i > 0 && n.start < a[i - 1].end - .01).length;
        return { track, score: Math.min(track.notes.length, 100) - overlapsCount * 4 + track.notes.reduce((s, n) => s + n.pitch, 0) / track.notes.length / 5 };
      }).sort((a, b) => b.score - a.score);
      stop(); state.source = { kind: 'midi', name: file.name }; state.midi = midi; state.meter = midi.meter; state.bpm = midi.tempoMap[0].bpm; state.warnings = [...midi.warnings]; state.audioBuffer = null; state.audioNotes = []; state.offset = 0;
      $('tempo-override').checked = false; $('listen-mode').value = 'notes'; $('track').replaceChildren();
      midi.tracks.forEach(track => { const option = new Option(`${track.name} · ${track.notes.length} 音${track.pitchBend ? ' · 含 Pitch Bend' : ''}`, track.id); option.disabled = track.pitchBend; $('track').add(option); });
      $('track').value = ranked[0].track.id; chooseMidiTrack(ranked[0].track.id);
    } else {
      $('status').textContent = '正在解碼音訊，檔案不會上傳…';
      player.context ||= new (window.AudioContext || window.webkitAudioContext)();
      let decoded;
      try { decoded = await player.context.decodeAudioData(buffer); } catch { throw Error('瀏覽器無法解碼這個音訊。請轉成 WAV 或 MP3 後再試。'); }
      if (token !== importToken) return;
      if (decoded.duration > 120 || decoded.duration < .15) throw Error('請使用 0.15–120 秒的旋律音訊。');
      const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 11025), 11025), source = offline.createBufferSource();
      source.buffer = decoded; source.connect(offline.destination); source.start();
      const mono = await offline.startRendering(); if (token !== importToken) return;
      const samples = mono.getChannelData(0).slice();
      $('status').textContent = '正在辨識單音音高與節拍…';
      const result = await new Promise((resolve, reject) => {
        worker = new Worker(new URL('./analysis-worker.js', import.meta.url), { type: 'module' }); rejectAnalysis = reject;
        worker.onmessage = ({ data }) => { if (data.progress !== undefined) { $('progress').value = data.progress; return; } if (data.error) reject(Error(data.error)); else resolve(data.result); };
        worker.onerror = () => reject(Error('分析程序無法執行，請重新整理或改用新版 Chrome／Safari。'));
        worker.postMessage({ samples, sampleRate: 11025 }, [samples.buffer]);
      });
      if (token !== importToken) return;
      const notes = audioNotesToBeats(result.notes, result.tempo.bpm, result.offset); validateMelody(notes);
      state.source = { kind: 'audio', name: file.name, tempo: result.tempo }; state.audioBuffer = decoded; state.audioNotes = result.notes; state.offset = result.offset;
      state.bpm = result.tempo.bpm; state.melody = notes; state.midi = null; state.meter = { numerator: 4, denominator: 4 }; state.warnings = result.warnings;
      state.keyResult = inferKeys(notes); state.key = state.keyResult.candidates[0]; state.result = null; state.seed = 0;
      $('listen-mode').value = 'notes'; $('tempo-override').checked = false; renderSource(); generate('basic', 0);
    }
  } catch (error) { if (token === importToken) { fail(error); $('status').textContent = state.source ? '匯入未完成，目前保留上一段旋律。' : '匯入未完成，請試其他旋律檔。'; } }
  finally { if (token === importToken) { worker?.terminate(); worker = null; rejectAnalysis = null; setBusy(false); } }
}
$('file').addEventListener('change', event => { const file = event.target.files[0]; importFile(file); event.target.value = ''; });
$('demo').addEventListener('click', loadDemo);
$('demo-audio').addEventListener('click', safeAction(async () => {
  if (busy) return;
  const response = await fetch('./examples/melody-108.wav');
  if (!response.ok) throw Error('範例音訊暫時無法讀取。');
  await importFile(new File([await response.arrayBuffer()], '原創範例-108BPM.wav', { type: 'audio/wav' }));
}));
$('cancel-analysis').addEventListener('click', () => { importToken++; worker?.terminate(); worker = null; rejectAnalysis?.(Error('取消')); rejectAnalysis = null; setBusy(false); $('status').textContent = '已取消分析。'; });
for (const type of ['dragenter', 'dragover']) $('dropzone').addEventListener(type, event => { event.preventDefault(); $('dropzone').classList.add('drag-over'); });
for (const type of ['dragleave', 'drop']) $('dropzone').addEventListener(type, event => { event.preventDefault(); $('dropzone').classList.remove('drag-over'); });
$('dropzone').addEventListener('drop', event => importFile(event.dataTransfer.files[0]));
window.addEventListener('dragover', event => event.preventDefault()); window.addEventListener('drop', event => event.preventDefault());
$('track').addEventListener('change', safeAction(() => { stop(); chooseMidiTrack($('track').value); }));
$('generate-basic').addEventListener('click', safeAction(() => generate('basic', 0)));
$('variation').addEventListener('click', safeAction(() => generate(state.style, state.seed + 1)));

function changeTempo(value) {
  const bpm = Number(value); if (!Number.isFinite(bpm) || bpm < 30 || bpm > 300) { $('bpm').value = state.bpm; throw Error('BPM 需介於 30–300。'); }
  let notes = state.melody;
  if (state.source.kind === 'audio') notes = audioNotesToBeats(state.audioNotes, bpm, state.offset);
  validateMelody(notes); stop(); state.bpm = bpm; state.melody = notes;
  if (state.source.kind === 'midi') $('tempo-override').checked = true;
  renderSource(); generate(state.style, state.seed);
}
$('bpm').addEventListener('change', safeAction(() => changeTempo($('bpm').value)));
$('half-tempo').addEventListener('click', safeAction(() => changeTempo(state.bpm / 2)));
$('double-tempo').addEventListener('click', safeAction(() => changeTempo(state.bpm * 2)));
$('tempo-override').addEventListener('change', safeAction(() => { stop(); if (!$('tempo-override').checked) state.bpm = state.midi.tempoMap[0].bpm; renderSource(); generate(state.style, state.seed); }));
$('offset').addEventListener('change', safeAction(() => {
  const offset = Number($('offset').value), notes = audioNotesToBeats(state.audioNotes, state.bpm, offset); validateMelody(notes);
  state.offset = offset; state.melody = notes; renderSource(); generate(state.style, state.seed);
}));
for (const id of ['key-root', 'key-mode']) $(id).addEventListener('change', safeAction(() => { state.key = { root: Number($('key-root').value), mode: $('key-mode').value }; generate(state.style, state.seed); }));
$('meter').addEventListener('change', safeAction(() => { const [numerator, denominator] = $('meter').value.split('/').map(Number); state.meter = { numerator, denominator }; renderSource(); generate(state.style, state.seed); }));

function tick(beat) {
  const barLength = beatsPerBar(); $('playhead').textContent = `BAR ${Math.floor(beat / barLength) + 1} · BEAT ${Math.floor(beat % barLength) + 1}`;
  const roll = $('piano-roll'), head = $('roll-playhead');
  if (head) { const x = 42 + beat / Number(roll.dataset.end) * (Number(roll.dataset.width) - 54); head.setAttribute('x1', x); head.setAttribute('x2', x); head.setAttribute('visibility', 'visible'); }
  const card = state.result?.segments.findIndex(s => beat >= s.start && beat < s.end) ?? -1;
  if (card !== playingCard) { document.querySelector('.chord-card.active')?.classList.remove('active'); document.querySelector(`[data-segment="${card}"]`)?.classList.add('active'); playingCard = card; }
}
async function play() {
  if (player.playing) { stop(); return; }
  if (!state.result) generate('basic', 0);
  const request = ++playbackRequest;
  await player.unlock(); if (request !== playbackRequest) return;
  const started = await player.play({ melody: state.melody, accompaniment: state.result.accompaniment, tempoMap: tempoMap(), totalBeats: state.result.totalBeats,
    sourceBuffer: state.audioBuffer, offset: state.offset, mode: $('listen-mode').value, melodyGain: Number($('melody-volume').value), harmonyGain: Number($('harmony-volume').value), onTick: tick,
    onStop: () => { $('play').textContent = '▶ PLAY'; $('play').setAttribute('aria-pressed', 'false'); $('roll-playhead')?.setAttribute('visibility', 'hidden'); document.querySelector('.chord-card.active')?.classList.remove('active'); playingCard = -1; } });
  if (!started || request !== playbackRequest) return;
  $('play').textContent = '■ STOP'; $('play').setAttribute('aria-pressed', 'true');
}
$('play').addEventListener('click', safeAction(play)); $('stop').addEventListener('click', stop);
for (const id of ['listen-mode', 'melody-volume', 'harmony-volume']) $(id).addEventListener('change', () => { const wasPlaying = player.playing; stop(); if (wasPlaying) safeAction(play)(); });
$('export').addEventListener('click', safeAction(() => {
  if (!state.result) throw Error('請先生成和弦。');
  const bytes = encodeAuditedMidi({ melody: state.melody, accompaniment: state.result.accompaniment, tempoMap: tempoMap(), meter: state.meter });
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' })), a = document.createElement('a');
  a.href = url; a.download = `KHIMAIRA-2-${state.style}.mid`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('status').textContent = '已匯出 MIDI：旋律與伴奏分軌，包含速度圖與拍號。';
}));
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && state.melody.length && !busy && !$('note-dialog').open && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(event.target.tagName) && event.target.getAttribute('role') !== 'button') { event.preventDefault(); safeAction(play)(); }
  if (event.key === 'Escape') stop();
});
window.addEventListener('pagehide', () => { stop(); worker?.terminate(); });
