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

// One shared delta preserves a selection's spacing and imported microtiming.
export function transformSelection(notes, indices, options={}) {
  const selected=[...indices].filter(i=>notes[i]);
  if(!selected.length)return notes.map(n=>({...n}));
  const {kind='move',step=.25,horizontal=true}=options;
  let deltaBeat=options.deltaBeat??0,deltaPitch=Math.round(options.deltaPitch??0);
  if(!Number.isFinite(deltaBeat)||!Number.isFinite(deltaPitch)||!Number.isFinite(step)||step<0)throw Error('無效的移動。');
  const group=selected.map(i=>notes[i]);
  if(kind==='move'){
    const anchor=notes[selected[0]];
    deltaBeat=horizontal?snap(anchor.start+deltaBeat,step)-anchor.start:0;
    deltaBeat=clamp(deltaBeat,-Math.min(...group.map(n=>n.start)),MAX_BEATS-Math.max(...group.map(n=>n.end)));
    deltaPitch=clamp(deltaPitch,-Math.min(...group.map(n=>n.pitch)),127-Math.max(...group.map(n=>n.pitch)));
  }else{
    const edge=kind==='start'?'start':'end';deltaBeat=snap(notes[selected[0]][edge]+deltaBeat,step)-notes[selected[0]][edge];
    deltaBeat=kind==='start'?clamp(deltaBeat,-Math.min(...group.map(n=>n.start)),Math.min(...group.map(n=>n.end-n.start-MIN_NOTE_BEATS))):clamp(deltaBeat,-Math.min(...group.map(n=>n.end-n.start-MIN_NOTE_BEATS)),MAX_BEATS-Math.max(...group.map(n=>n.end)));
  }
  const chosen=new Set(selected);
  return notes.map((n,i)=>!chosen.has(i)?{...n}:kind==='move'?{...n,start:n.start+deltaBeat,end:n.end+deltaBeat,pitch:n.pitch+deltaPitch}:{...n,[kind==='start'?'start':'end']:n[kind==='start'?'start':'end']+deltaBeat});
}
export function notesInBox(notes,{start,end,low,high}) {
  return notes.flatMap((n,i)=>n.end>Math.min(start,end)&&n.start<Math.max(start,end)&&n.pitch>=Math.min(low,high)&&n.pitch<=Math.max(low,high)?[i]:[]);
}

// Quantize onsets independently to the preceding grid; keep note lengths and metadata.
export function quantizeNotes(notes, step, indices = notes.map((_, i) => i)) {
  if (!Number.isFinite(step) || step < 0) throw Error('無效的量化格線。');
  const chosen = new Set(indices);
  return notes.map((note, i) => {
    if (!step || !chosen.has(i)) return { ...note };
    const position = note.start / step, nearest = Math.round(position);
    // Imported triplets can land a few floating-point ulps below an exact grid line.
    const grid = Math.abs(position - nearest) <= Number.EPSILON * 8 * Math.max(1, Math.abs(position)) ? nearest : Math.floor(position);
    const start = Math.max(0, grid * step);
    return { ...note, start, end: start + (note.end - note.start) };
  });
}
