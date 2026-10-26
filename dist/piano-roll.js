import {pitchName} from './music.js?v=2.0.0-alpha.9';
import { transformNote, createNote, transformSelection, notesInBox, quantizeNotes } from './note-edit.js?v=2.0.0-alpha.9';
import { noteName } from './analysis.js?v=2.0.0-alpha.9';
const ns = 'http://www.w3.org/2000/svg';
const rounded = value => Number(value.toFixed(3));
const element = (tag, attrs, text) => { const el = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value); if (text !== undefined) el.textContent = text; return el; };
export class PianoRoll {
  constructor(svg, { onCommit, onStop, onEdit, onUndo, onRedo, onError } = {}) {
    this.svg = svg; this.scroll = svg.parentElement; this.onCommit = onCommit; this.onStop = onStop; this.onEdit = onEdit; this.onUndo = onUndo; this.onRedo = onRedo; this.onError = onError;
    this.step = .25; this.zoom = 1; this.row = window.matchMedia('(pointer:coarse), (max-width:600px)').matches ? 24 : 18; this.left = 52; this.top = 52; this.selected = -1; this.selection = new Set(); this.tool = 'select'; this.length = 1; this.initialized = false;
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
  reset() { this.cancel(); this.selected = -1; this.selection.clear(); this.initialized = false; }
  sticky() { this.keys?.setAttribute('transform', `translate(${this.scroll.scrollLeft},0)`); this.ruler?.setAttribute('transform', `translate(0,${this.scroll.scrollTop})`); }
  point(e) { const matrix = this.svg.getScreenCTM(); return matrix ? new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse()) : { x: 0, y: 0 }; }
  x(beat) { return this.left + beat * this.px; }
  y(pitch) { return this.top + (this.high - pitch) * this.row; }
  noteBox(group, note) {
    const width = Math.max(5, (note.end - note.start) * this.px);
    group.setAttribute('transform', `translate(${this.x(note.start)},${this.y(note.pitch) + 1})`);
    group.querySelector('.note-body').setAttribute('width', width);
    const handle = Math.min(6, width / 4);
    group.querySelector('[data-edge=start]').setAttribute('width', handle);
    group.querySelector('[data-edge=end]').setAttribute('width', handle);
    group.querySelector('[data-edge=end]').setAttribute('x', width - handle);
    group.querySelector('.note-label').textContent = width > 32 && this.zoom>=2 ? pitchName(note.pitch,this.keySignature,true) : '';
  }
  setPlayhead(beat){if(!this.playhead)return;this.playhead.setAttribute('visibility',beat===null?'hidden':'visible');if(beat!==null){this.playhead.setAttribute('x1',this.x(beat));this.playhead.setAttribute('x2',this.x(beat));const x=this.x(beat);if(x<this.scroll.scrollLeft+this.left||x>this.scroll.scrollLeft+this.scroll.clientWidth-35)this.scroll.scrollLeft=Math.max(0,x-this.left-40);}}
  setTool(tool) { this.cancel(); this.tool=tool; this.svg.dataset.tool=tool; }
  select(index, additive=false) {
    if(!additive)this.selection.clear();
    if(index>=0){if(additive&&this.selection.has(index))this.selection.delete(index);else this.selection.add(index);}
    this.selected=this.selection.values().next().value??-1;this.paintSelection();
  }
  selectAll(){this.selection=new Set(this.notes.map((_,i)=>i));this.selected=this.notes.length?0:-1;this.paintSelection();this.svg.focus({preventScroll:true});}
  paintSelection(){
    this.svg.querySelectorAll('[data-note]').forEach(g=>{const chosen=this.selection.has(+g.dataset.note);g.classList.toggle('selected',chosen);g.setAttribute('aria-pressed',chosen);g.setAttribute('tabindex',chosen?'0':'-1');});
    this.describe(this.notes?.[this.selected]);
    const quantize=this.svg.closest('.melody-workspace').querySelector('#ml-quantize');
    if(quantize){quantize.disabled=this.disabled||!this.notes?.length||!this.step;quantize.title=this.step?`Quantize ${this.selection.size?'selected':'all'} notes to the preceding SNAP grid · Q · 保留音長，向前對齊`:'Choose a SNAP grid to quantize';}
    for(const id of ['ml-roll-delete','ml-duplicate','ml-left','ml-right','ml-up','ml-down','ml-shorter','ml-longer']){const button=this.svg.closest('.melody-workspace').querySelector('#'+id);if(button)button.disabled=this.disabled||!this.selection.size;}
  }
  describe(note, prefix = '') {
    const out = this.svg.closest('.melody-workspace').querySelector('#ml-roll-selection');
    out.textContent = this.selection.size>1 ? `${this.selection.size} notes selected` : note ? `${prefix}${pitchName(note.pitch,this.keySignature,true)} · BEAT ${rounded(note.start)} · LENGTH ${rounded(note.end - note.start)}` : 'Select notes or use DRAW. Press ? for shortcuts.';
  }
  draw(notes, accompaniment = [], beats = 4) {
    if (this.drag) return; this.notes = notes; this.accompaniment = accompaniment; this.beats = beats; this.px = 56 * this.zoom;
    this.high=Math.min(127,Math.max(...notes.map(n=>n.pitch),notes.length?0:72)+7);this.low=Math.max(0,Math.min(...notes.map(n=>n.pitch),notes.length?127:48)-7);
    const end = Math.min(512, Math.ceil(Math.max(...notes.map(n => n.end), ...accompaniment.map(n => n.end), beats) / beats) * beats + (this.extraBar?beats:0));
    const width = Math.max(this.scroll.clientWidth, this.left + end * this.px + 20), height = this.top + (this.high-this.low+1) * this.row;
    this.svg.replaceChildren(); this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`); this.svg.style.width = width + 'px'; this.svg.style.height = height + 'px';
    const background = element('g', { class: 'roll-background' });
    for (let pitch = this.low; pitch <= this.high; pitch++) background.append(element('rect', { x: this.left, y: this.y(pitch), width: width - this.left, height: this.row, fill: [1,3,6,8,10].includes(pitch % 12) ? '#091724' : '#112536', stroke: '#7894a51c', 'stroke-width': .5 }));
    const grid = this.step || .25;
    for (let beat = 0; beat <= end + 1e-6; beat += grid) {
      const bar = Math.abs(beat / beats - Math.round(beat / beats)) < 1e-5, quarter = Math.abs(beat - Math.round(beat)) < 1e-5;
      background.append(element('line', { x1: this.x(beat), x2: this.x(beat), y1: this.top, y2: height, stroke: bar ? '#97b4c2' : '#6b8799', opacity: bar ? .5 : quarter ? .24 : .1 }));
    }
    this.svg.append(background);
    const harmony = element('g', { class: 'roll-harmony', 'pointer-events': 'none', 'aria-hidden': 'true' });
    for (const n of this.showAccompaniment===false?[]:accompaniment.filter(n=>n.pitch>=this.low&&n.pitch<=this.high)) harmony.append(element('rect', { x: this.x(n.start), y: this.y(n.pitch) + 4, width: Math.max(2, (n.end - n.start) * this.px), height: 4, rx: 1, fill: '#c1a775', opacity: .35 }));
    this.svg.append(harmony);
    notes.forEach((note, index) => {
      const group = element('g', { class: 'roll-note', 'data-note': index, role: 'button', tabindex: index === this.selected ? 0 : -1, 'aria-label': `旋律音符 ${index + 1} ${noteName(note.pitch)}，起始 ${rounded(note.start)} 拍，長度 ${rounded(note.end - note.start)} 拍` });
      group.append(element('rect', { class: 'note-body', width: 10, height: this.row - 2, rx: 2 }), element('text', { class: 'note-label', x: 8, y: this.row - 5, 'font-size': 9, 'pointer-events': 'none' }), element('rect', { 'data-edge': 'start', x: 0, width: 5, height: this.row - 2, fill: 'transparent' }), element('rect', { 'data-edge': 'end', x: 0, width: 6, height: this.row - 2, fill: 'transparent' }));
      group.addEventListener('focus', () => {if(!this.selection.has(index))this.select(index);}); this.noteBox(group, note); this.svg.append(group);
    });
    this.keys = element('g', { class: 'roll-keys', 'aria-hidden': 'true' });
    for (let pitch = this.low; pitch <= this.high; pitch++) { const black = [1,3,6,8,10].includes(pitch % 12); this.keys.append(element('rect', { x: 0, y: this.y(pitch), width: this.left - 1, height: this.row, fill: black ? '#0a1520' : '#d4dfe5', stroke: '#617484', 'stroke-width': .5 }), element('text', { x: 5, y: this.y(pitch) + this.row - 4, fill: black ? '#b2c8d6' : '#243b4d', 'font-size': 9 }, pitch%12===0?pitchName(pitch,this.keySignature,true):'')); }
    this.playhead=element('line',{class:'roll-playhead',x1:0,x2:0,y1:0,y2:height,stroke:'#f4d59b','stroke-width':2,'pointer-events':'none',visibility:'hidden'});this.svg.append(this.playhead);this.svg.append(this.keys);
    this.ruler = element('g', { class: 'roll-ruler', 'aria-hidden': 'true' }); this.ruler.append(element('rect', { x: 0, y: 0, width, height: this.top, fill: '#142b3c' }));
    for (let b = 0; b < end; b += beats) this.ruler.append(element('text', { x: this.x(b) + 5, y: 43, fill: '#d5e6ef', 'font-size': 10, opacity:this.extraBar&&b>=end-beats?.45:1 }, this.extraBar&&b>=end-beats?'EMPTY':`BAR ${Math.round(b / beats) + 1}`));
    let chordBeat=0;for(const bar of this.charts||[]){for(const c of bar.chords||[]){this.ruler.append(element('text',{x:this.x(chordBeat)+5,y:18,fill:'#d9bf87','font-size':12},c.symbol));chordBeat+=c.beats;}}
    this.svg.append(this.ruler);
    if (!this.initialized) { this.scroll.scrollTop = Math.max(0, this.y(Math.max(...notes.map(n=>n.pitch),notes.length?0:72)+2)-this.top); this.scroll.scrollLeft = Math.max(0, this.x(Math.min(...notes.map(n => n.start),0)) - this.left); this.initialized = true; }
    this.selection=new Set([...this.selection].filter(i=>i<notes.length));this.selected=this.selection.values().next().value??-1;this.sticky();this.paintSelection();this.svg.dataset.tool=this.tool;
  }
  down(e) {
    if(e.button!==0||this.disabled)return;
    if(this.tool==='pan'){
      if(e.pointerType!=='touch'){e.preventDefault();this.drag={id:e.pointerId,kind:'pan',x:e.clientX,y:e.clientY,left:this.scroll.scrollLeft,top:this.scroll.scrollTop};this.svg.setPointerCapture(e.pointerId);}return;
    }
    if(e.target.closest('.roll-keys,.roll-ruler'))return;
    e.preventDefault();this.onStop();this.svg.focus({preventScroll:true});
    const target=e.target.closest('[data-note]'),point=this.point(e),index=target?+target.dataset.note:-1;
    if(this.tool==='erase'){if(index>=0){this.select(index);this.remove();}return;}
    if(index>=0){
      if(e.shiftKey||e.metaKey||e.ctrlKey){this.select(index,true);return;}
      if(!this.selection.has(index))this.select(index);
      this.drag={id:e.pointerId,point,kind:e.target.dataset.edge||'move',indices:[...this.selection],original:this.notes.map(n=>({...n})),moved:false};
    }else if(this.tool==='draw'){
      const n=createNote((point.x-this.left)/this.px,this.high-Math.floor((point.y-this.top)/this.row),this.step);
      n.end=Math.min(512,n.start+this.length);
      const preview=element('rect',{class:'roll-draft',x:this.x(n.start),y:this.y(n.pitch)+1,width:(n.end-n.start)*this.px,height:this.row-2,rx:2,'pointer-events':'none'});this.svg.append(preview);
      this.drag={id:e.pointerId,point,kind:'draw',note:n,preview,moved:false};
    }else{
      const base=e.shiftKey?[...this.selection]:[];if(!e.shiftKey)this.select(-1);
      const box=element('rect',{class:'roll-marquee',x:point.x,y:point.y,width:0,height:0,'pointer-events':'none'});this.svg.append(box);
      this.drag={id:e.pointerId,point,kind:'box',box,base,moved:false};
    }
    this.svg.setPointerCapture(e.pointerId);
  }
  move(e) {
    const d=this.drag;if(!d||d.id!==e.pointerId)return;e.preventDefault();
    if(d.kind==='pan'){this.scroll.scrollLeft=d.left+d.x-e.clientX;this.scroll.scrollTop=d.top+d.y-e.clientY;return;}
    const p=this.point(e),dx=p.x-d.point.x,dy=p.y-d.point.y;
    if(!d.moved&&Math.hypot(dx,dy)<4)return;d.moved=true;
    if(d.kind==='box'){
      const x=Math.min(p.x,d.point.x),y=Math.min(p.y,d.point.y);
      for(const [key,value]of Object.entries({x,y,width:Math.abs(dx),height:Math.abs(dy)}))d.box.setAttribute(key,value);
      this.selection=new Set([...d.base,...notesInBox(this.notes,{start:(x-this.left)/this.px,end:(x+Math.abs(dx)-this.left)/this.px,low:this.high-Math.floor((y+Math.abs(dy)-this.top)/this.row),high:this.high-Math.floor((y-this.top)/this.row)})]);
      this.selected=this.selection.values().next().value??-1;this.paintSelection();return;
    }
    if(d.kind==='draw'){
      const step=this.step||.25;d.note.end=Math.min(512,Math.max(d.note.start+step,Math.round((p.x-this.left)/this.px/step)*step));d.preview.setAttribute('width',(d.note.end-d.note.start)*this.px);return;
    }
    d.next=transformSelection(d.original,d.indices,{kind:d.kind,deltaBeat:dx/this.px,deltaPitch:-dy/this.row,step:e.altKey?0:this.step,horizontal:Math.abs(dx)>=4});
    for(const i of d.indices){const g=this.svg.querySelector(`[data-note="${i}"]`);this.noteBox(g,d.next[i]);g.classList.add('dragging');}
  }
  up(e){
    const d=this.drag;if(!d||d.id!==e.pointerId)return;this.drag=null;
    if(this.svg.hasPointerCapture(e.pointerId))this.svg.releasePointerCapture(e.pointerId);
    if(d.kind==='pan')return;
    if(d.kind==='box'){d.box.remove();return;}
    if(d.kind==='draw'){d.preview.remove();this.commit(d.note,-1);return;}
    if(d.moved&&d.next&&d.indices.some(i=>['pitch','start','end'].some(k=>Math.abs(d.next[i][k]-d.original[i][k])>1e-9)))this.commitMany(d.next,d.indices);
    else this.draw(this.notes,this.accompaniment,this.beats);
  }
  cancel(){
    const d=this.drag;if(!d)return;this.drag=null;d.box?.remove();d.preview?.remove();
    if(d.original)this.draw(this.notes,this.accompaniment,this.beats);
    if(this.svg.hasPointerCapture(d.id))this.svg.releasePointerCapture(d.id);
  }
  commitMany(notes,indices=[]){
    const chosen=indices.map(i=>notes[i]);notes.sort((a,b)=>a.start-b.start);
    const before=this.notes;this.selection=new Set(chosen.map(n=>notes.indexOf(n)).filter(i=>i>=0));this.selected=this.selection.values().next().value??-1;
    try{this.onCommit(notes);this.svg.focus({preventScroll:true});}catch(error){this.onError(error);this.draw(before,this.accompaniment,this.beats);}
  }
  commit(note,index=this.selected){
    const notes=this.notes.map(n=>({...n}));if(index<0){index=notes.length;notes.push(note);}else notes[index]=note;this.commitMany(notes,[index]);
  }
  remove(){
    if(this.disabled||!this.selection.size)return;this.onStop();this.commitMany(this.notes.filter((_,i)=>!this.selection.has(i)).map(n=>({...n})),[]);
  }
  duplicate(){
    if(this.disabled||!this.selection.size)return;
    const chosen=[...this.selection].map(i=>this.notes[i]),length=Math.max(...chosen.map(n=>n.end))-Math.min(...chosen.map(n=>n.start)),delta=Math.ceil(length/(this.step||.25))*(this.step||.25);
    if(Math.max(...chosen.map(n=>n.end))+delta>512){this.onError(Error('複製會超過 512 拍，請先往前移動。'));return;}
    const notes=this.notes.map(n=>({...n})),indices=chosen.map(n=>{notes.push({...n,start:n.start+delta,end:n.end+delta});return notes.length-1;});this.onStop();this.commitMany(notes,indices);
  }
  quantize(){
    if(this.disabled||this.drag||!this.step||!this.notes.length)return;
    const indices=this.selection.size?[...this.selection]:this.notes.map((_,i)=>i);
    const notes=quantizeNotes(this.notes,this.step,indices);
    if(!indices.some(i=>Math.abs(notes[i].start-this.notes[i].start)>1e-12))return;
    this.onStop();this.commitMany(notes,[...this.selection]);
  }
  nudge(options){if(this.disabled||!this.selection.size)return;this.onStop();this.commitMany(transformSelection(this.notes,this.selection,{step:this.step,...options}),[...this.selection]);}
  doubleClick(e){
    if(this.disabled||this.tool!=='select')return;
    const target=document.elementFromPoint(e.clientX,e.clientY)||e.target;
    if(target.closest('[data-note],.roll-keys,.roll-ruler'))return;
    const p=this.point(e),n=createNote((p.x-this.left)/this.px,this.high-Math.floor((p.y-this.top)/this.row),this.step);n.end=Math.min(512,n.start+this.length);this.onStop();this.commit(n,-1);
  }
  key(e){
    if(this.disabled)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(this.drag)this.cancel();else this.select(-1);return;}
    const mod=e.metaKey||e.ctrlKey,key=e.key.toLowerCase();
    if(mod&&['a','d','z','y'].includes(key)){e.preventDefault();e.stopPropagation();this.cancel();if(key==='a')this.selectAll();else if(key==='d')this.duplicate();else if(e.shiftKey||key==='y')this.onRedo();else this.onUndo();return;}
    if(!mod&&!e.altKey&&!e.shiftKey&&key==='q'){e.preventDefault();e.stopPropagation();if(!e.repeat)this.quantize();return;}
    if(this.drag||!this.selection.size)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Delete','Backspace','Enter'].includes(e.key)){e.preventDefault();e.stopPropagation();}
    if(e.key==='Delete'||e.key==='Backspace')this.remove();
    else if(e.key==='Enter'&&this.selection.size===1)this.onEdit(this.selected);
    else if(e.key==='ArrowUp'||e.key==='ArrowDown')this.nudge({deltaPitch:(e.key==='ArrowUp'?1:-1)*(e.shiftKey?12:1),horizontal:false});
    else if(e.key==='ArrowLeft'||e.key==='ArrowRight')this.nudge({deltaBeat:(e.key==='ArrowLeft'?-1:1)*(this.step||.01)});
  }
}
