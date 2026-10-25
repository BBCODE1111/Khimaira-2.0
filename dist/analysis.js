export const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const mod = n => ((n % 12) + 12) % 12;
export const noteName = n => noteNames[mod(n)] + (Math.floor(n / 12) - 1);
const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };

export function inferKeys(notes) {
  const histogram = Array(12).fill(0);
  for (const n of notes) histogram[mod(n.pitch)] += (n.end - n.start) * (n.confidence ?? 1);
  const total = histogram.reduce((a, b) => a + b, 0) || 1;
  const last = [...notes].sort((a, b) => b.end - a.end)[0]?.pitch ?? 60;
  const profiles = { major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], minor: [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] };
  const scales = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  const result = [];
  for (const mode of ['major', 'minor']) for (let root = 0; root < 12; root++) {
    const profile = profiles[mode], meanP = profile.reduce((a, b) => a + b) / 12, meanH = total / 12;
    let cross = 0, hp = 0, pp = 0, coverage = 0;
    for (let i = 0; i < 12; i++) {
      const h = histogram[mod(root + i)] - meanH, p = profile[i] - meanP;
      cross += h * p; hp += h * h; pp += p * p;
      if (scales[mode].includes(i)) coverage += histogram[mod(root + i)] / total;
    }
    const correlation = cross / Math.sqrt(hp * pp || 1);
    result.push({ root, mode, coverage, score: correlation + (mod(last) === root ? .08 : 0), label: `${noteNames[root]} ${mode === 'major' ? '大調' : '小調'}` });
  }
  result.sort((a, b) => b.score - a.score);
  const gap = result[0].score - result[1].score;
  return { candidates: result.slice(0, 4), confidence: gap > .18 && result[0].coverage > .9 ? '較明確' : gap > .07 ? '中等' : '調性有歧義', histogram };
}

// YIN cumulative mean normalized difference; an implementation of the published method.
// Input is a mono PCM frame. This estimates a single fundamental, not source separation.
export function yinPitch(frame, sampleRate, { minHz = 65, maxHz = 1100, threshold = .15 } = {}) {
  const half = Math.floor(frame.length / 2), maxLag = Math.min(half - 1, Math.floor(sampleRate / minHz));
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  let energy = 0, mean = 0;
  for (const x of frame) mean += x / frame.length;
  for (const x of frame) energy += (x - mean) ** 2;
  const rms = Math.sqrt(energy / frame.length);
  if (rms < .004) return null;
  const difference = new Float64Array(maxLag + 1);
  let sum = 0;
  difference[0] = 1;
  for (let tau = 1; tau <= maxLag; tau++) {
    let d = 0;
    for (let i = 0; i < half; i++) { const delta = frame[i] - frame[i + tau]; d += delta * delta; }
    sum += d; difference[tau] = sum ? d * tau / sum : 1;
  }
  let lag = 0;
  for (let tau = minLag; tau < maxLag; tau++) if (difference[tau] < threshold) {
    while (tau + 1 <= maxLag && difference[tau + 1] < difference[tau]) tau++;
    lag = tau; break;
  }
  if (!lag) {
    lag = minLag;
    for (let tau = minLag + 1; tau <= maxLag; tau++) if (difference[tau] < difference[lag]) lag = tau;
    if (difference[lag] > .25) return null;
  }
  const a = difference[lag - 1] ?? difference[lag], b = difference[lag], c = difference[lag + 1] ?? b;
  const offset = (a + c - 2 * b) ? .5 * (a - c) / (a + c - 2 * b) : 0;
  const hz = sampleRate / (lag + Math.max(-.5, Math.min(.5, offset)));
  const midi = 69 + 12 * Math.log2(hz / 440);
  return { hz, midi, pitch: Math.round(midi), confidence: 1 - b, rms };
}

export function estimateTempo(onsets) {
  const times = [...new Set(onsets.filter(Number.isFinite).map(n => Math.round(n * 1000) / 1000))].sort((a, b) => a - b);
  if (times.length < 4) return { bpm: 120, confidence: '不足以判定', candidates: [120, 60, 240], score: 0 };
  const intervals = [];
  for (let i = 1; i < times.length; i++) { const d = times[i] - times[i - 1]; if (d > .1 && d < 3) intervals.push(d); }
  const candidates = [];
  for (let bpm = 45; bpm <= 220; bpm += .5) {
    const beat = 60 / bpm, offset = times[0];
    let score = 0;
    for (const interval of intervals) {
      const ratio = interval / beat;
      let best = 0;
      for (const [division, weight] of [[1, 1], [.5, .92], [2, .8], [.25, .62], [1.5, .8], [.75, .58], [3, .65], [4, .6], [1 / 3, .55], [2 / 3, .55]]) {
        const distance = Math.abs(ratio - division) / Math.max(.25, division);
        best = Math.max(best, weight * Math.exp(-distance * distance / .009));
      }
      score += best;
    }
    score /= Math.max(1, intervals.length);
    const aligned = times.reduce((s, t) => { const grid = (t - offset) / beat * 4; const error = Math.abs(grid - Math.round(grid)); return s + Math.exp(-error * error / .06); }, 0) / times.length;
    const prior = Math.exp(-((Math.log2(bpm / 110)) ** 2) / 1.7);
    candidates.push({ bpm, score: score * .74 + aligned * .18 + prior * .08 });
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0], selected = [best.bpm];
  for (const candidate of candidates) if (selected.every(bpm => Math.abs(bpm - candidate.bpm) > 8)) { selected.push(candidate.bpm); if (selected.length === 3) break; }
  return { bpm: best.bpm, confidence: best.score > .86 ? '節拍規律；仍需確認半速／倍速' : '估計值，請確認', candidates: selected, score: best.score };
}

export function analyzePCM(samples, sampleRate = 11025, progress = () => {}) {
  if (samples.length / sampleRate > 120.1) throw Error('第一版音訊上限 120 秒，請先截出旋律段落。');
  const size = 1024, hop = 128, frames = [];
  // A short energy gate locates real attacks/releases independently of YIN's long window.
  // This also separates repeated notes of the same pitch when a short rest is present.
  const energyHop = Math.max(1, Math.round(sampleRate * .005)), envelope = [];
  for (let start = 0; start < samples.length; start += energyHop) {
    let energy = 0; const end = Math.min(samples.length, start + energyHop);
    for (let i = start; i < end; i++) energy += samples[i] ** 2;
    envelope.push(Math.sqrt(energy / (end - start)));
  }
  const gate = Math.max(.004, Math.max(...envelope) * .045), regions = [];
  let regionStart = null, quiet = 0;
  envelope.forEach((energy, index) => {
    if (energy > gate) { if (regionStart === null) regionStart = index * energyHop / sampleRate; quiet = 0; }
    else if (regionStart !== null && ++quiet >= 3) { regions.push({ start: regionStart, end: (index - 2) * energyHop / sampleRate }); regionStart = null; }
  });
  if (regionStart !== null) regions.push({ start: regionStart, end: samples.length / sampleRate });
  const attacks = regions.map(r => r.start);
  for (let start = 0; start + size <= samples.length; start += hop) {
    const pitch = yinPitch(samples.subarray(start, start + size), sampleRate);
    frames.push({ time: (start + size / 2) / sampleRate, ...pitch, pitch: pitch?.pitch ?? null });
    if (frames.length % 160 === 0) progress(start / samples.length);
  }
  // Three-frame majority removes isolated octave/noise frames without bridging rests.
  const smooth = frames.map((frame, i) => {
    if (frame.pitch === null || !i || i === frames.length - 1) return frame;
    const neighbors = frames.slice(i - 1, i + 2).filter(f => f.pitch !== null);
    return { ...frame, pitch: median(neighbors.map(f => f.pitch)) };
  });
  const raw = [];
  let current = null;
  const flush = () => {
    if (current && current.end - current.start >= .075 && current.confidence / current.count >= .78)
      raw.push({ pitch: current.pitch, start: current.start, end: current.end, velocity: Math.min(.95, .45 + current.rms / current.count * 2), confidence: current.confidence / current.count, cents: median(current.cents) });
    current = null;
  };
  for (const frame of smooth) {
    if (frame.pitch === null) { flush(); continue; }
    let start = Math.max(0, frame.time - hop / (2 * sampleRate));
    const nearAttack = attacks.filter(t => Math.abs(t - start) < .065).sort((a, b) => Math.abs(a - start) - Math.abs(b - start))[0];
    if (nearAttack !== undefined) start = nearAttack;
    const end = Math.min(samples.length / sampleRate, frame.time + hop / (2 * sampleRate));
    const reattack = current && nearAttack !== undefined && nearAttack > current.start + .1;
    if (current && frame.pitch === current.pitch && !reattack) {
      current.end = end; current.confidence += frame.confidence; current.rms += frame.rms; current.count++; current.cents.push((frame.midi - frame.pitch) * 100);
    } else {
      flush(); current = { pitch: frame.pitch, start, end, confidence: frame.confidence, rms: frame.rms, count: 1, cents: [(frame.midi - frame.pitch) * 100] };
    }
  }
  flush();
  for (const note of raw) {
    const release = regions.map(r => r.end).filter(t => Math.abs(t - note.end) < .075).sort((a, b) => Math.abs(a - note.end) - Math.abs(b - note.end))[0];
    if (release !== undefined && release > note.start) note.end = release;
  }
  // Clip overlaps caused by the analysis window; never turn them into fake polyphony.
  for (let i = 0; i + 1 < raw.length; i++) raw[i].end = Math.min(raw[i].end, raw[i + 1].start);
  const notes = raw.filter(n => n.end - n.start >= .065 && n.pitch >= 36 && n.pitch <= 96);
  if (!notes.length) throw Error('未找到穩定單音旋律。請用乾淨的哼唱、獨奏或旋律 MIDI。');
  const coverage = notes.reduce((sum, n) => sum + n.end - n.start, 0) / (samples.length / sampleRate);
  const tempo = estimateTempo(notes.map(n => n.start));
  return { notes, tempo, offset: notes[0].start, coverage, detune: median(notes.map(n => n.cents)), warnings: [
    '音訊轉譜是單音估計；和弦伴奏、和聲人聲、滑音或強殘響可能辨識錯誤。請先聽辨識旋律並修正。',
    ...(coverage < .3 ? ['可辨識片段較少，請確認音訊是否含伴奏、噪音或長時間靜音。'] : []),
    ...(Math.abs(median(notes.map(n => n.cents))) > 20 ? ['旋律偏離標準調音超過 20 cents；原音與十二平均律伴奏可能仍有拍頻。'] : []),
  ] };
}

export function audioNotesToBeats(notes, bpm, offset = 0) {
  if (!Number.isFinite(bpm) || bpm < 30 || bpm > 300) throw Error('BPM 需介於 30–300。');
  if (!Number.isFinite(offset) || offset < 0 || notes.some(n => n.start < offset - .00001)) throw Error('第 1 拍不能晚於最早旋律音；弱起請把第 1 拍往前移。');
  return notes.map(n => ({ ...n, start: Math.max(0, (n.start - offset) * bpm / 60), end: (n.end - offset) * bpm / 60 }));
}
