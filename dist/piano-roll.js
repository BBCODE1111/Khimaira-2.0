import { transformNote, createNote } from './note-edit.js?v=2.0.0-alpha.4';
import { noteName } from './analysis.js?v=2.0.0-alpha.4';
const ns = 'http://www.w3.org/2000/svg';
const rounded = value => Number(value.toFixed(3));
const element = (tag, attrs, text) => { const el = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value); if (text !== undefined) el.textContent = text; return el; };
export class PianoRoll {
  constructor(svg, { onCommit, onStop, onEdit, onUndo, onRedo, onError } = {}) {
    this.svg = svg; this.scroll = svg.parentElement; this.onCommit = onCommit; this.onStop = onStop; this.onEdit = onEdit; this.onUndo = onUndo; this.onRedo = onRedo; this.onError = onError;
    this.step = .25; this.zoom = 1; this.row = 14; this.left = 52; this.top = 26; this.selected = -1; this.initialized = false;
    svg.setAttribute('role', 'group'); svg.setAttribute('tabindex', '0'); svg.setAttribute('aria-label', '旋律 MIDI 編輯器，方向鍵移動音符，Delete 刪除');
    svg.addEventListener('pointerdown', e => this.down(e));
    svg.addEventListener('pointermove', e => this.move(e));
    svg.addEventListener('pointerup', e => this.up(e));
    svg.addEventListener('pointercancel', () => this.cancel());
    svg.addEventListener('lostpointercapture', () => { if (this.drag) this.cancel(); });
    svg.addEventListener('keydown', e => this.key(e));
    svg.addEventListener('dblclick', e => this.doubleClick(e));
    this.scroll.addEventListener('scroll', () => this.sticky());
    this.blur = () => this.cancel(); window.addEventListener('blur', this.blur);
  }
  reset() { this.cancel(); this.selected = -1; this.initialized = false; }
  sticky() { this.keys?.setAttribute('transform', `translate(${this.scroll.scrollLeft},0)`); this.ruler?.setAttribute('transform', `translate(0,${this.scroll.scrollTop})`); }
  point(e) { const matrix = this.svg.getScreenCTM(); return matrix ? new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse()) : { x: 0, y: 0 }; }
  x(beat) { return this.left + beat * this.px; }
  y(pitch) { return this.top + (127 - pitch) * this.row; }
  noteBox(group, note) {
    const width = Math.max(5, (note.end - note.start) * this.px);
    group.setAttribute('transform', `translate(${this.x(note.start)},${this.y(note.pitch) + 1})`);
    group.querySelector('.note-body').setAttribute('width', width);
    const handle = Math.min(6, width / 4);
    group.querySelector('[data-edge=start]').setAttribute('width', handle);
    group.querySelector('[data-edge=end]').setAttribute('width', handle);
    group.querySelector('[data-edge=end]').setAttribute('x', width - handle);
    group.querySelector('.note-label').textContent = width > 32 ? noteName(note.pitch) : '';
  }
  select(index) {
    this.selected = index;
    this.svg.querySelectorAll('[data-note]').forEach(g => { const chosen = +g.dataset.note === index; g.classList.toggle('selected', chosen); g.setAttribute('aria-pressed', chosen); g.setAttribute('tabindex', chosen ? '0' : '-1'); });
    this.describe(this.notes[index]);
    const button = this.svg.closest('.melody-workspace').querySelector('#ml-roll-delete'); if (button) button.disabled = this.disabled || index < 0 || this.notes.length <= 1;
  }
  describe(note, prefix = '') {
    const out = this.svg.closest('.melody-workspace').querySelector('#ml-roll-selection');
    out.textContent = note ? `${prefix}${noteName(note.pitch)} · 起始 ${rounded(note.start)} 拍 · 長度 ${rounded(note.end - note.start)} 拍` : '點選音符，或在空白格雙擊新增';
  }
  draw(notes, accompaniment = [], beats = 4) {
    if (this.drag) return; this.notes = notes; this.accompaniment = accompaniment; this.beats = beats; this.px = 56 * this.zoom;
    const end = Math.min(512, Math.ceil(Math.max(...notes.map(n => n.end), ...accompaniment.map(n => n.end), 4) / beats) * beats + beats);
    const width = Math.max(this.scroll.clientWidth, this.left + end * this.px + 20), height = this.top + 128 * this.row;
    this.svg.replaceChildren(); this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`); this.svg.style.width = width + 'px'; this.svg.style.height = height + 'px';
    const background = element('g', { class: 'roll-background' });
    for (let pitch = 0; pitch < 128; pitch++) background.append(element('rect', { x: this.left, y: this.y(pitch), width: width - this.left, height: this.row, fill: [1,3,6,8,10].includes(pitch % 12) ? '#091724' : '#112536', stroke: '#7894a51c', 'stroke-width': .5 }));
    const grid = this.step || .25;
    for (let beat = 0; beat <= end + 1e-6; beat += grid) {
      const bar = Math.abs(beat / beats - Math.round(beat / beats)) < 1e-5, quarter = Math.abs(beat - Math.round(beat)) < 1e-5;
      background.append(element('line', { x1: this.x(beat), x2: this.x(beat), y1: this.top, y2: height, stroke: bar ? '#97b4c2' : '#6b8799', opacity: bar ? .5 : quarter ? .24 : .1 }));
    }
    this.svg.append(background);
    const harmony = element('g', { class: 'roll-harmony', 'pointer-events': 'none', 'aria-hidden': 'true' });
    for (const n of accompaniment) harmony.append(element('rect', { x: this.x(n.start), y: this.y(n.pitch) + 4, width: Math.max(2, (n.end - n.start) * this.px), height: this.row - 7, rx: 1, fill: '#c1a775', opacity: .65 }));
    this.svg.append(harmony);
    notes.forEach((note, index) => {
      const group = element('g', { class: 'roll-note', 'data-note': index, role: 'button', tabindex: index === this.selected ? 0 : -1, 'aria-label': `旋律音符 ${index + 1} ${noteName(note.pitch)}，起始 ${rounded(note.start)} 拍，長度 ${rounded(note.end - note.start)} 拍` });
      group.append(element('rect', { class: 'note-body', width: 10, height: this.row - 2, rx: 2 }), element('text', { class: 'note-label', x: 8, y: this.row - 5, 'font-size': 9, 'pointer-events': 'none' }), element('rect', { 'data-edge': 'start', x: 0, width: 5, height: this.row - 2, fill: 'transparent' }), element('rect', { 'data-edge': 'end', x: 0, width: 6, height: this.row - 2, fill: 'transparent' }));
      group.addEventListener('focus', () => this.select(index)); this.noteBox(group, note); this.svg.append(group);
    });
    this.keys = element('g', { class: 'roll-keys', 'aria-hidden': 'true' });
    for (let pitch = 0; pitch < 128; pitch++) { const black = [1,3,6,8,10].includes(pitch % 12); this.keys.append(element('rect', { x: 0, y: this.y(pitch), width: this.left - 1, height: this.row, fill: black ? '#0a1520' : '#d4dfe5', stroke: '#617484', 'stroke-width': .5 }), element('text', { x: 5, y: this.y(pitch) + this.row - 4, fill: black ? '#b2c8d6' : '#243b4d', 'font-size': 9 }, noteName(pitch))); }
    this.svg.append(this.keys);
    this.ruler = element('g', { class: 'roll-ruler', 'aria-hidden': 'true' }); this.ruler.append(element('rect', { x: 0, y: 0, width, height: this.top, fill: '#142b3c' }));
    for (let b = 0; b < end; b += beats) this.ruler.append(element('text', { x: this.x(b) + 5, y: 17, fill: '#d5e6ef', 'font-size': 10 }, `BAR ${Math.round(b / beats) + 1}`));
    this.svg.append(this.ruler);
    if (!this.initialized && notes.length) { this.scroll.scrollTop = Math.max(0, this.y(Math.max(...notes.map(n => n.pitch)) + 3)); this.scroll.scrollLeft = Math.max(0, this.x(Math.min(...notes.map(n => n.start))) - this.left); this.initialized = true; }
    this.sticky(); this.select(this.selected < notes.length ? this.selected : -1);
  }
  down(e) {
    if (e.button !== 0 || this.disabled) return; const target = e.target.closest('[data-note]'); if (!target) { if (!e.target.closest('.roll-keys,.roll-ruler')) this.select(-1); return; }
    e.preventDefault(); this.onStop(); const index = +target.dataset.note; this.select(index); this.svg.focus({ preventScroll: true });
    this.drag = { id: e.pointerId, index, target, original: { ...this.notes[index] }, point: this.point(e), kind: e.target.dataset.edge || 'move', moved: false, next: { ...this.notes[index] } };
    this.svg.setPointerCapture(e.pointerId);
  }
  move(e) {
    const d = this.drag; if (!d || d.id !== e.pointerId) return; e.preventDefault(); const p = this.point(e), dx = p.x - d.point.x, dy = p.y - d.point.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return; d.moved = true;
    d.next = transformNote(d.original, { kind: d.kind, deltaBeat: dx / this.px, deltaPitch: -dy / this.row, step: e.altKey ? 0 : this.step, horizontal: Math.abs(dx) >= 4 });
    this.noteBox(d.target, d.next); this.describe(d.next, '拖曳中 · '); d.target.classList.add('dragging');
  }
  up(e) {
    const d = this.drag; if (!d || d.id !== e.pointerId) return; this.drag = null;
    if (this.svg.hasPointerCapture(e.pointerId)) this.svg.releasePointerCapture(e.pointerId);
    if (d.moved && ['pitch','start','end'].some(k => Math.abs(d.next[k] - d.original[k]) > 1e-9)) this.commit(d.next, d.index);
    else { this.noteBox(d.target, d.original); d.target.classList.remove('dragging'); this.describe(d.original); }
  }
  cancel() {
    const d = this.drag; if (!d) return; this.drag = null; this.noteBox(d.target, d.original); d.target.classList.remove('dragging'); this.describe(d.original);
    if (this.svg.hasPointerCapture(d.id)) this.svg.releasePointerCapture(d.id);
  }
  commit(note, index = this.selected) {
    const notes = this.notes.map(n => ({ ...n })); if (index < 0) notes.push(note); else notes[index] = note;
    notes.sort((a,b) => a.start - b.start); this.selected = notes.indexOf(note);
    try { this.onCommit(notes); this.svg.focus({ preventScroll: true }); } catch (error) { this.onError(error); this.draw(this.notes, this.accompaniment, this.beats); }
  }
  remove() {
    if (this.disabled || this.selected < 0 || this.notes.length <= 1) return;
    const notes = this.notes.filter((_, i) => i !== this.selected); this.selected = Math.min(this.selected, notes.length - 1);
    try { this.onCommit(notes); this.svg.focus({ preventScroll: true }); } catch (error) { this.onError(error); }
  }
  doubleClick(e) {
    if (this.disabled) return;
    // Pointer capture can retarget dblclick to the SVG. Hit-test the released pointer.
    const target = document.elementFromPoint(e.clientX, e.clientY) || e.target;
    const group = target.closest('[data-note]');
    if (group) { this.onEdit(+group.dataset.note); return; }
    if (target.closest('.roll-keys,.roll-ruler')) return;
    const p = this.point(e); this.onStop(); this.commit(createNote((p.x - this.left) / this.px, 127 - Math.floor((p.y - this.top) / this.row), this.step), -1);
  }
  key(e) {
    if (this.disabled) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.cancel(); return; }
    if ((e.metaKey || e.ctrlKey) && ['z','y'].includes(e.key.toLowerCase())) { e.preventDefault(); e.stopPropagation(); this.cancel(); if (e.shiftKey || e.key.toLowerCase() === 'y') this.onRedo(); else this.onUndo(); return; }
    if (this.drag) return;
    const note = this.notes[this.selected]; if (!note) return;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Delete','Backspace','Enter'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); this.onStop(); }
    if (e.key === 'Delete' || e.key === 'Backspace') this.remove();
    else if (e.key === 'Enter') this.onEdit(this.selected);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') this.commit(transformNote(note, { deltaPitch: (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 12 : 1), horizontal: false }));
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.commit(transformNote(note, { deltaBeat: (e.key === 'ArrowLeft' ? -1 : 1) * (this.step || .01), step: this.step }));
  }
}
