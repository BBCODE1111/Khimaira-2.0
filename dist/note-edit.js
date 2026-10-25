// Musical coordinates, independent of pixels or pointer events. A drag is one edit.
export const MIN_NOTE_BEATS = 1 / 960;
export const MAX_BEATS = 512;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const snap = (value, step) => step > 0 ? Math.round(value / step) * step : value;
export function transformNote(note, { kind = 'move', deltaBeat = 0, deltaPitch = 0, step = .25, horizontal = true } = {}) {
  if (![deltaBeat, deltaPitch, step].every(Number.isFinite) || step < 0) throw Error('無效的音符移動。');
  const next = { ...note };
  if (kind === 'end') {
    next.end = clamp(snap(note.end + deltaBeat, step), note.start + MIN_NOTE_BEATS, MAX_BEATS);
  } else if (kind === 'start') {
    next.start = clamp(snap(note.start + deltaBeat, step), 0, note.end - MIN_NOTE_BEATS);
  } else {
    const duration = note.end - note.start;
    // A purely vertical drag must not quantize an imported note's original onset.
    next.start = horizontal ? clamp(snap(note.start + deltaBeat, step), 0, MAX_BEATS - duration) : note.start;
    next.end = next.start + duration;
    next.pitch = clamp(note.pitch + Math.round(deltaPitch), 0, 127);
  }
  return next;
}
export function createNote(beat, pitch, step = .25) {
  const length = step || .25, start = clamp(snap(beat, step), 0, MAX_BEATS - length);
  return { pitch: clamp(Math.round(pitch), 0, 127), start, end: start + length, velocity: .7, confidence: 1 };
}
export class NoteHistory {
  constructor(limit = 50) { this.limit = limit; this.clear(); }
  clear() { this.undoStack = []; this.redoStack = []; }
  record(notes) { this.undoStack.push(structuredClone(notes)); if (this.undoStack.length > this.limit) this.undoStack.shift(); this.redoStack = []; }
  undo(notes) { if (!this.undoStack.length) return null; this.redoStack.push(structuredClone(notes)); return this.undoStack.pop(); }
  redo(notes) { if (!this.redoStack.length) return null; this.undoStack.push(structuredClone(notes)); return this.redoStack.pop(); }
}
