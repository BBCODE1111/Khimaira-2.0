// Standard MIDI File types 0/1, PPQ timing. No server or third-party parser.
const utf8 = new TextEncoder();
const clip = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function normalizeTempoMap(map = []) {
  const byBeat = new Map([[0, { beat: 0, bpm: 120 }]]);
  for (const t of [...map].sort((a, b) => a.beat - b.beat)) {
    if (Number.isFinite(t.beat) && t.beat >= 0 && Number.isFinite(t.bpm) && t.bpm > 0)
      byBeat.set(t.beat, { beat: t.beat, bpm: t.bpm });
  }
  return [...byBeat.values()].sort((a, b) => a.beat - b.beat);
}

export function beatToSeconds(beat, map) {
  const tempos = normalizeTempoMap(map);
  let seconds = 0;
  for (let i = 0; i < tempos.length; i++) {
    const t = tempos[i], end = Math.min(beat, tempos[i + 1]?.beat ?? beat);
    if (end > t.beat) seconds += (end - t.beat) * 60 / t.bpm;
    if (end >= beat) break;
  }
  return seconds;
}

export function secondsToBeat(seconds, map) {
  const tempos = normalizeTempoMap(map);
  let remaining = Math.max(0, seconds);
  for (let i = 0; i < tempos.length; i++) {
    const t = tempos[i], span = ((tempos[i + 1]?.beat ?? Infinity) - t.beat) * 60 / t.bpm;
    if (remaining <= span) return t.beat + remaining * t.bpm / 60;
    remaining -= span;
  }
  return 0;
}

export function parseMidi(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length > 8 * 1024 * 1024) throw Error('MIDI 太大，請匯出一段旋律（上限 8 MB）。');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 0, limit = bytes.length;
  const need = n => { if (pos + n > limit) throw Error('MIDI 檔案截斷或事件長度錯誤。'); };
  const u8 = () => { need(1); return bytes[pos++]; };
  const u16 = () => { need(2); const n = view.getUint16(pos); pos += 2; return n; };
  const u32 = () => { need(4); const n = view.getUint32(pos); pos += 4; return n; };
  const text = n => { need(n); const s = new TextDecoder().decode(bytes.slice(pos, pos + n)); pos += n; return s; };
  const vlq = () => { let v = 0; for (let i = 0; i < 4; i++) { const b = u8(); v = v * 128 + (b & 127); if (!(b & 128)) return v; } throw Error('MIDI delta-time 超過四個 bytes。'); };
  if (text(4) !== 'MThd') throw Error('不是標準 MIDI 檔案，請使用 .mid 或 .midi。');
  const headerLength = u32();
  if (headerLength < 6) throw Error('MIDI header 不完整。');
  need(headerLength);
  const format = u16(), trackCount = u16(), division = u16();
  if (format > 1) throw Error('目前支援 MIDI format 0／1，請把 format 2 轉成單一時間軸。');
  if (!division || (division & 0x8000)) throw Error('目前需要 PPQ MIDI，尚不支援 SMPTE 時碼。');
  if (!trackCount || trackCount > 256) throw Error('MIDI 軌數不合理。');
  pos += headerLength - 6;
  const tracks = [], tempoMap = [], meters = [], warnings = [];
  let keyHint = null, events = 0;
  for (let index = 0; index < trackCount; index++) {
    limit = bytes.length;
    if (text(4) !== 'MTrk') throw Error('MIDI track chunk 不正確。');
    const length = u32(); need(length); limit = pos + length;
    let tick = 0, running = 0, trackName = `Track ${index + 1}`;
    const channels = new Map();
    const channelFor = ch => {
      if (!channels.has(ch)) channels.set(ch, { id: `${index}:${ch}`, channel: ch, index, notes: [], active: new Map(), held: [], sustain: false, pitchBend: false });
      return channels.get(ch);
    };
    const endNote = (channel, note, at) => { if (at > note.tick) channel.notes.push({ pitch: note.pitch, start: note.tick / division, end: at / division, velocity: note.velocity, confidence: 1 }); };
    while (pos < limit) {
      if (++events > 500000) throw Error('MIDI 事件過多，請只匯出旋律軌。');
      tick += vlq();
      let status = u8();
      if (status < 128) { if (!running) throw Error('MIDI running status 缺失。'); pos--; status = running; }
      else if (status < 0xf0) running = status;
      if (status === 0xff) {
        running = 0;
        const type = u8(), size = vlq(); need(size);
        const data = bytes.slice(pos, pos + size); pos += size;
        if (type === 0x03) trackName = new TextDecoder().decode(data).slice(0, 120);
        if (type === 0x51 && size === 3) {
          const us = data[0] * 65536 + data[1] * 256 + data[2];
          if (!us) throw Error('MIDI tempo 不能為零。');
          tempoMap.push({ beat: tick / division, bpm: 60000000 / us });
        }
        if (type === 0x58 && size >= 2) {
          const numerator = data[0], denominator = 2 ** data[1];
          if (!numerator || denominator > 32) throw Error('不支援這個 MIDI 拍號。');
          meters.push({ beat: tick / division, numerator, denominator });
        }
        if (type === 0x59 && size === 2) {
          const sf = data[0] > 127 ? data[0] - 256 : data[0];
          if (sf >= -7 && sf <= 7 && data[1] <= 1) keyHint = { root: ((sf * 7 + (data[1] ? 9 : 0)) % 12 + 12) % 12, mode: data[1] ? 'minor' : 'major' };
        }
        if (type === 0x2f) { pos = limit; break; }
        continue;
      }
      if (status === 0xf0 || status === 0xf7) { running = 0; const size = vlq(); need(size); pos += size; continue; }
      if (status >= 0xf0) throw Error('MIDI 含未支援的 system event。');
      const kind = status >> 4, channel = channelFor(status & 15), a = u8(), b = (kind === 0xc || kind === 0xd) ? 0 : u8();
      if (a > 127 || b > 127) throw Error('MIDI data byte 超出範圍。');
      if (kind === 9 && b > 0) {
        const list = channel.active.get(a) || [];
        list.push({ pitch: a, tick, velocity: b / 127 }); channel.active.set(a, list);
      } else if (kind === 8 || (kind === 9 && b === 0)) {
        const list = channel.active.get(a), note = list?.shift();
        if (note) { if (channel.sustain) channel.held.push(note); else endNote(channel, note, tick); }
      } else if (kind === 0xb && a === 64) {
        channel.sustain = b >= 64;
        if (!channel.sustain) { channel.held.forEach(n => endNote(channel, n, tick)); channel.held = []; }
      } else if (kind === 0xb && (a === 120 || a === 123)) {
        channel.active.forEach(list => list.forEach(n => endNote(channel, n, tick)));
        channel.held.forEach(n => endNote(channel, n, tick)); channel.active.clear(); channel.held = [];
      } else if (kind === 0xe && (a + (b << 7)) !== 8192) channel.pitchBend = true;
    }
    for (const channel of channels.values()) {
      let dangling = 0;
      channel.active.forEach(list => list.forEach(n => { endNote(channel, n, tick); dangling++; }));
      channel.held.forEach(n => endNote(channel, n, tick));
      if (dangling) warnings.push(`${trackName} 有 ${dangling} 個缺少 note-off 的音，已截在軌尾。`);
      if (channel.notes.length && channel.channel !== 9) tracks.push({ id: channel.id, name: `${trackName} · CH ${channel.channel + 1}`, channel: channel.channel, notes: channel.notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch), pitchBend: channel.pitchBend });
    }
  }
  if (!tracks.length) throw Error('沒有可用旋律音符（鼓軌 CH 10 已排除）。');
  const meter = meters[0] || { numerator: 4, denominator: 4, beat: 0 };
  if (meters.some(m => m.numerator !== meter.numerator || m.denominator !== meter.denominator)) throw Error('這份 MIDI 會變換拍號；第一版請分段匯出固定拍號旋律。');
  if (!tempoMap.length) warnings.push('MIDI 沒有速度資訊，依標準暫用 120 BPM；請手動確認。');
  return { tracks, tempoMap: normalizeTempoMap(tempoMap), hasTempo: tempoMap.length > 0, meter, keyHint, warnings, format };
}

const be16 = n => [(n >> 8) & 255, n & 255];
const be32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
function vlqBytes(number) {
  let n = Math.round(number); if (n < 0 || n > 0x0fffffff) throw Error('MIDI 時間超出範圍。');
  const out = [n & 127]; while ((n = Math.floor(n / 128)) > 0) out.unshift((n & 127) | 128); return out;
}
function chunk(id, data) { return [...utf8.encode(id), ...be32(data.length), ...data]; }
function trackChunk(name, events) {
  const title = [...utf8.encode(name)];
  const data = [0, 0xff, 3, ...vlqBytes(title.length), ...title];
  let prev = 0;
  for (const event of events.sort((a, b) => a.tick - b.tick || a.order - b.order)) {
    data.push(...vlqBytes(event.tick - prev), ...event.bytes); prev = event.tick;
  }
  data.push(0, 0xff, 0x2f, 0); return chunk('MTrk', data);
}
export function encodeMidi({ melody = [], accompaniment = [], tempoMap = [{ beat: 0, bpm: 120 }], meter = { numerator: 4, denominator: 4 }, includeMelody = true, separateBass = false, chordMarkers = [] }) {
  const ppq = 960;
  const tempos = normalizeTempoMap(tempoMap).map(t => {
    const us = clip(Math.round(60000000 / t.bpm), 1, 0xffffff);
    return { tick: Math.round(t.beat * ppq), order: 0, bytes: [0xff, 0x51, 3, us >> 16, (us >> 8) & 255, us & 255] };
  });
  tempos.push({ tick: 0, order: 1, bytes: [0xff, 0x58, 4, meter.numerator, Math.log2(meter.denominator), 24, 8] });
  for(const c of chordMarkers){const data=[...utf8.encode(c.symbol)];tempos.push({tick:Math.round(c.start*ppq),order:2,bytes:[0xff,6,...vlqBytes(data.length),...data]});}
  const makeNotes = (notes, channel, name) => {
    const events = [];
    for (const note of notes) {
      if (!Number.isInteger(note.pitch) || note.pitch < 0 || note.pitch > 127 || !Number.isFinite(note.start) || !Number.isFinite(note.end) || note.start < 0 || note.end <= note.start) throw Error('不能匯出無效音符。');
      const start = Math.round(note.start * ppq), end = Math.max(start + 1, Math.round(note.end * ppq));
      events.push({ tick: start, order: 2, bytes: [0x90 + channel, note.pitch, clip(Math.round((note.velocity ?? .7) * 127), 1, 127)] });
      events.push({ tick: end, order: 0, bytes: [0x80 + channel, note.pitch, 0] });
    }
    return trackChunk(name, events);
  };
  return new Uint8Array([...chunk('MThd', [...be16(1), ...be16((includeMelody?3:2)+(separateBass?1:0)), ...be16(ppq)]), ...trackChunk('KHIMAIRA tempo', tempos), ...(includeMelody&&!separateBass?makeNotes(melody, 0, 'Melody'):[]), ...(separateBass?makeNotes(accompaniment.filter(n=>n.role==='bass'),2,'KHIMAIRA bass'):[]), ...makeNotes(separateBass?accompaniment.filter(n=>n.role!=='bass'):accompaniment, 1, 'KHIMAIRA harmony'), ...(includeMelody&&separateBass?makeNotes(melody,0,'Melody'):[])]);
}
