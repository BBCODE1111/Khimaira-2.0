import { parse } from './engine/music.js?v=2.0.0-alpha.9';
import { performance } from './engine/performance.js?v=2.0.0-alpha.9';
import { mod, noteNames } from './analysis.js?v=2.0.0-alpha.9';

export const styles = {
  basic: { label: '基本和弦', pattern: 'sustain', qualities: ['', 'm', 'sus2', 'sus4'], voicing: 'close', description: '先建立清楚的三和弦與穩定長音。' },
  pop: { label: 'Pop 流行', pattern: 'pop', qualities: ['', 'm', 'add9', 'sus2', 'sus4', '6'], voicing: 'open', description: '三和弦骨架、八分脈動與開放配置。' },
  jazz: { label: 'Jazz 爵士', pattern: 'jazz', qualities: ['maj7', 'm7', '7', '6', 'm6', 'maj9', 'm9', '9', '', 'm'], voicing: 'rootless', description: 'Swing 切分與平滑內聲部；只有通過旋律檢查的延伸音才保留。' },
  bossa: { label: 'Bossa nova', pattern: 'bossa', qualities: ['6', 'm6', 'maj7', 'm7', '7', '69', '', 'm'], voicing: 'close', description: '低音與和弦分開的 Bossa 切分。' },
  lofi: { label: 'Lo-fi', pattern: 'lofi', qualities: ['maj7', 'm7', 'm9', '6', 'add9', '', 'm'], voicing: 'close', description: '短促和弦、較鬆的後拍與柔和力度。' },
  rock: { label: 'Rock 搖滾', pattern: 'rock', qualities: ['5', '', 'm', 'sus2', 'sus4'], voicing: 'open', description: 'Power chord 與八分節奏，保留旋律所需的音程。' },
  classical: { label: 'Classical 古典', pattern: 'alberti', qualities: ['', 'm', 'sus4', 'sus2'], voicing: 'close', description: '分解和弦與鄰近聲部移動；不是嚴格四部和聲。' },
  ambient: { label: 'Ambient 氛圍', pattern: 'ambient', qualities: ['sus2', 'sus4', 'add9', '6', 'm', ''], voicing: 'open', description: '稀疏、長音與共同音；跨旋律換音處也會檢查。' },
};

export const safeIntervals = new Set([0, 3, 4, 5, 7, 8, 9]);
export const overlaps = (a, b) => Math.min(a.end, b.end) - Math.max(a.start, b.start) > 1e-7;
export const musicalIntervals = new Set([0,2,3,4,5,7,8,9,10]);
// Register and harmonic context matter: a chord's own tritone is consonant
// with its function; a remote major seventh is not a close minor ninth.
export function compatible(pitch, melodyPitch, policy='strict', chord=null) {
 const interval=mod(pitch-melodyPitch);
 if(policy!=='musical')return safeIntervals.has(interval);
 const pcs=typeof chord==='string'?parse(chord)?.pcs:chord?.pcs;
 if(interval===6)return !!pcs?.includes(mod(pitch))&&pcs.includes(mod(melodyPitch));
 if(interval===11)return pitch<=melodyPitch-13;
 return musicalIntervals.has(interval);
}
export function chordCompatible(chord,note,policy='musical') {
 return chord.pcs.every(pc=>compatible(36+pc,note.pitch,policy,chord));
}
export function validateMelody(notes) {
  if (!notes.length) throw Error('請先匯入旋律或載入範例。');
  if (notes.length > 2000) throw Error('第一版最多 2,000 個旋律音，請先截成較短片段。');
  for (const n of notes) if (!Number.isInteger(n.pitch) || n.pitch < 0 || n.pitch > 127 || !Number.isFinite(n.start) || !Number.isFinite(n.end) || n.start < 0 || n.end <= n.start) throw Error('旋律音高／起訖時間無效。');
  if (Math.max(...notes.map(n => n.end)) > 512) throw Error('第一版最多 512 個四分音符拍，請分段匯入。');
}
function random(seed) { let state = seed >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; }
function scaleOf(key) { return (key.mode === 'minor' ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map(n => mod(n + key.root)); }
function candidatePool(style) {
  const out = [];
  for (let root = 0; root < 12; root++) for (const quality of [...new Set([...style.qualities, '', 'm', 'sus2', 'sus4', '5'])]) {
    const chord = parse(noteNames[root] + quality); out.push({ ...chord, symbol: noteNames[root] + quality });
  }
  return out;
}
function candidatesFor(start, end, melody, pool, policy) {
  const notes = melody.filter(n => overlaps(n, { start, end }));
  return pool.filter(c => c.pcs.every(p => notes.every(n => (policy==='musical'?musicalIntervals:safeIntervals).has(mod(p-n.pitch)))));
}

export function auditHarmony(melody, accompaniment, {policy='strict',chords=[]}={}) {
  const conflicts = [];
  for (const h of accompaniment) for (let i = 0; i < melody.length; i++) {
    const m = melody[i];
    if (overlaps(h, m) && !compatible(h.pitch, m.pitch, policy, h.chord||chords.find(c=>h.start>=c.start-1e-7&&h.start<c.end-1e-7)?.symbol)) conflicts.push({ melodyIndex: i, melodyPitch: m.pitch, harmonyPitch: h.pitch, start: Math.max(m.start, h.start), end: Math.min(m.end, h.end), interval: mod(h.pitch - m.pitch) });
  }
  return conflicts;
}

export function harmonize(melody, { key = { root: 0, mode: 'major' }, style: styleId = 'basic', seed = 0, beatsPerBar = 4, qualities = null, preferred = [], spanBeats = beatsPerBar, avoid = [], harmonicGrid = 0, policy='strict' } = {}) {
  validateMelody(melody);
  if (!(beatsPerBar > 0 && beatsPerBar <= 32)) throw Error('不支援這個拍號。');
  const cfg = { ...(styles[styleId] || styles.basic), ...(qualities ? { qualities } : {}) }, pool = candidatePool(cfg), rng = random(seed);
  const scale = scaleOf(key), last = Math.max(...melody.map(n => n.end)), totalBeats = Math.ceil(last / beatsPerBar) * beatsPerBar;
  const pieces = [];
  function split(start, end, depth = 0) {
    const candidates = candidatesFor(start, end, melody, pool, policy);
    const full = candidates.filter(c => c.pcs.length >= 3);
    if (full.length || end - start <= Math.max(.125,harmonicGrid)+1e-7 || depth >= 12) { pieces.push({ start, end, candidates: full.length ? full : candidates }); return; }
    // Preserve long harmonic spans where possible; split at real note boundaries only when necessary.
    const boundaries = harmonicGrid>0
      ? Array.from({length:Math.ceil(end/harmonicGrid)},(_,i)=>(i+1)*harmonicGrid).filter(t=>t>start+1e-6&&t<end-1e-6)
      : [...new Set(melody.flatMap(n => [n.start, n.end]).filter(t => t > start + 1e-6 && t < end - 1e-6))];
    if (!boundaries.length) { pieces.push({ start, end, candidates }); return; }
    const middle = boundaries.reduce((a, b) => Math.abs(b - (start + end) / 2) < Math.abs(a - (start + end) / 2) ? b : a);
    split(start, middle, depth + 1); split(middle, end, depth + 1);
  }
  const step=Math.max(.5,Math.min(beatsPerBar,spanBeats));
  for (let start = 0; start < totalBeats - 1e-7; start += step) split(start, Math.min(totalBeats, start + step));
  const scored = pieces.map((piece, index) => {
    const active = melody.filter(n => overlaps(n, piece));
    if (!piece.candidates.length) return [{ symbol: 'N.C.', root: key.root, pcs: [], cost: 12, q: '' }];
    return piece.candidates.map(chord => {
      const outOfKey = chord.pcs.filter(p => !scale.includes(p)).length;
      const duration = active.reduce((s, n) => s + Math.min(n.end, piece.end) - Math.max(n.start, piece.start), 0) || 1;
      const inChord = active.reduce((s, n) => s + (chord.pcs.includes(mod(n.pitch)) ? Math.min(n.end, piece.end) - Math.max(n.start, piece.start) : 0), 0) / duration;
      const tonic = chord.root === key.root ? (index === 0 || index === pieces.length - 1 ? 1.1 : .3) : 0;
      const stylePreference = cfg.qualities.indexOf(chord.q);
      const color = stylePreference >= 0 ? stylePreference * .06 : 1.2;
      const wanted = preferred.find(s => overlaps(s,piece));
      const original = wanted && parse(wanted.symbol);
      const preference = original ? (original.root === chord.root ? -.65 : .2) - chord.pcs.filter(p=>original.pcs.includes(p)).length*.1 : 0;
      const repeated=avoid.some(s=>s.symbol===chord.symbol&&overlaps(s,piece))?1.35:0;
      return { ...chord, cost: repeated + preference + outOfKey * 1.1 + (1 - inChord) * 2 + color - tonic + (chord.pcs.length < 3 ? 2.4 : 0) + (styleId === 'basic' ? 0 : rng() * 1.3) };
    }).sort((a, b) => a.cost - b.cost).slice(0, 16);
  });
  let costs = scored[0].map(c => c.cost), paths = scored[0].map((_, i) => [i]);
  for (let i = 1; i < scored.length; i++) {
    const nextCosts = [], nextPaths = [];
    for (const chord of scored[i]) {
      let best = Infinity, bestIndex = 0;
      scored[i - 1].forEach((previous, j) => {
        const delta = mod(chord.root - previous.root), common = chord.pcs.filter(p => previous.pcs.includes(p)).length;
        const transition = (delta === 0 ? -.15 : delta === 5 || delta === 7 ? -.2 : .25) - common * .12;
        const score = costs[j] + chord.cost + transition;
        if (score < best) { best = score; bestIndex = j; }
      });
      nextCosts.push(best); nextPaths.push([...paths[bestIndex], nextCosts.length - 1]);
    }
    costs = nextCosts; paths = nextPaths;
  }
  const path = paths[costs.indexOf(Math.min(...costs))];
  const segments = pieces.map((p, i) => ({ start: p.start, end: p.end, symbol: scored[i][path[i]].symbol, alternatives: scored[i].length, pcs: scored[i][path[i]].pcs }));
  const accompaniment = [];
  // The v1 player accepts arbitrary chord durations; process spans separately so no style can
  // insert a note outside its checked span or assume a four-beat bar on a 3/4 melody.
  for (const segment of segments) {
    if (segment.symbol === 'N.C.') continue;
    const duration = segment.end - segment.start;
    const events = performance([{ chords: [{ symbol: segment.symbol, beats: duration }] }], cfg.pattern,
      { voicing: cfg.voicing, human: 0, gate: .78, seed, swing: styleId === 'jazz' ? .12 : 0 });
    for (const event of events) {
      const start = segment.start + event.beat, end = Math.min(segment.end, start + event.duration);
      if (end <= start + 1e-6 || start < segment.start - 1e-6) continue;
      accompaniment.push({ pitch: event.note, start, end, velocity: styleId === 'ambient' || styleId === 'lofi' ? event.velocity * .7 : event.velocity * .85 });
    }
  }
  // Some patterns add octave/bass ornaments; audit the ACTUAL rendered events, not labels.
  const conflicts = auditHarmony(melody, accompaniment,{policy});
  if (conflicts.length) throw Error('伴奏音程檢查未通過，已取消這次生成。');
  const gaps = segments.filter(s => s.symbol === 'N.C.').length;
  return { segments, accompaniment, totalBeats, style: styleId, key, seed, conflicts, gaps, splitCount: segments.length - Math.ceil(totalBeats / beatsPerBar), safety:policy==='musical'?'musical-color-v1':'strict-consonance-v1' };
}

export function demoMelody() {
  // Original eight-bar phrase, intentionally simple enough to compare harmony choices.
  const bars = [[64, 67, 64, 60], [69, 72, 69, 64], [65, 69, 65, 60], [67, 71, 67, 62], [64, 67, 72, 67], [69, 72, 76, 72], [65, 69, 72, 69], [67, 71, 72, 72]];
  return bars.flatMap((pitches, bar) => pitches.map((pitch, i) => ({ pitch, start: bar * 4 + i, end: bar * 4 + i + .9, velocity: .75, confidence: 1 })));
}
