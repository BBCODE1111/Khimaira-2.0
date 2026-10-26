import {pitchName} from './music.js?v=2.0.0-alpha.9';
import {parseMidi} from './midi.js?v=2.0.0-alpha.9';
import {inferKeys,audioNotesToBeats,noteName,noteNames} from './analysis.js?v=2.0.0-alpha.9';
import {validateMelody,demoMelody} from './harmony.js?v=2.0.0-alpha.9';
import {PianoRoll} from './piano-roll.js?v=2.0.0-alpha.9';
import {NoteHistory} from './note-edit.js?v=2.0.0-alpha.9';
import {barLength} from './fusion.js?v=2.0.0-alpha.9';

const f=n=>Number(n.toFixed(3));
export class MelodyWorkspace {
 constructor(host,{onChange=()=>{},onMix=()=>{},onStop=()=>{},onStyle=()=>{}}={}){
  this.host=host;this.onChange=onChange;this.onMix=onMix;this.onStop=onStop;this.notes=[];this.meter={numerator:4,denominator:4};this.bpm=108;this.key={root:0,mode:'major'};this.offset=0;this.buffer=null;this.mix={melody:.35,harmony:1};this.mode='notes';this.muted=false;this.token=0;this.busy=false;
  host.innerHTML=`<div class="section-label"><span>MELODY</span><button popovertarget="ml-info" class="ghost" aria-label="Melody help">ⓘ</button></div>
  <div id="ml-info" popover><h3>MELODY</h3><p>Import a clean mono recording or MIDI. Check the key, meter and tempo before arranging. Smooth fit weighs passing notes lightly; strict fit checks every melody note. Accompaniment is checked again during playback and export.</p><p>Blue notes are melody. Gold bars are accompaniment. Drag to move; drag either edge to resize. Select and drag empty space to select several notes. Audio stays on this device; saved projects include notes but not the source recording.</p><p id="ml-roll-help">⌘/Ctrl A: select all · D: duplicate · Z: undo · Shift Z: redo · arrows: move · Shift ↑/↓: octave · Delete: remove · Q: quantize to preceding SNAP grid (selected notes, or all) · Space: play/stop · ?: shortcuts.</p></div>
  <div class="melody-upload" id="ml-drop"><label class="file-button">IMPORT<input id="ml-file" type="file" accept="audio/*,.mid,.midi" aria-label="Import audio or MIDI"></label><button id="ml-new">DRAW</button><details class="demo-menu"><summary>DEMO ▾</summary><div><button id="ml-demo">MIDI</button><button id="ml-audio">AUDIO</button></div></details><button id="ml-settings-button" popovertarget="ml-settings">108 BPM · C MAJ · 4/4</button><button id="ml-remove" hidden title="Remove melody">REMOVE</button></div>
  <p id="ml-status" role="status">Import a melody, draw notes, or try a demo.</p><p id="ml-error" role="alert" hidden></p><div id="ml-progress-wrap" hidden><progress id="ml-progress" max="1"></progress><button id="ml-cancel">CANCEL</button></div>
  <div id="ml-settings" popover><h3>MELODY SETTINGS</h3><div class="melody-settings"><label id="ml-track-wrap" hidden>TRACK<select id="ml-track"></select></label><label>BPM<input id="ml-bpm" type="number" min="30" max="300" step=".5"></label><button id="ml-half">½</button><button id="ml-double">2×</button><button id="ml-tap" title="Tap at least four beats">TAP</button><label>KEY<select id="ml-key"></select></label><label>MODE<select id="ml-mode"><option value="major">MAJOR</option><option value="minor">MINOR</option></select></label><label>METER<select id="ml-meter"><option value="4/4">4/4</option><option value="3/4">3/4</option><option value="6/8">6/8</option></select></label><label id="ml-offset-wrap" hidden>OFFSET (SEC)<input id="ml-offset" type="number" min="0" step=".01"></label></div><label id="ml-fixed-wrap" hidden><input type="checkbox" id="ml-fixed"> FIXED BPM</label><label><input type="checkbox" id="ml-pickup" checked> PICKUP: N.C.</label><p class="hint" id="ml-analysis"></p><p class="hint" id="ml-warning"></p><p id="ml-tempo-notice" class="hint" role="status"></p></div>
  <div id="ml-work" hidden><div id="ml-review" class="melody-review" hidden><strong>REVIEW TRANSCRIPTION</strong><p>Compare NOTES / AUDIO in the mixer, then check timing and pitch.</p><button id="ml-confirm">CONFIRM MELODY</button></div>
  <div class="roll-tools" role="group" aria-label="Note tools"><button data-roll-tool="select" title="Select / box select" aria-label="Select" aria-pressed="true">↖</button><button data-roll-tool="draw" title="Draw notes" aria-label="Draw" aria-pressed="false">✎</button><button data-roll-tool="erase" title="Erase notes" aria-label="Erase" aria-pressed="false">⌫</button><button data-roll-tool="pan" title="Pan" aria-label="Pan" aria-pressed="false">✥</button><label>SNAP<select id="ml-snap"><option value="1">1/4</option><option value=".5">1/8</option><option value=".3333333333333333">1/8T</option><option value=".25" selected>1/16</option><option value=".125">1/32</option><option value="0">FREE</option></select></label><button id="ml-quantize" aria-label="Quantize notes" title="Quantize to preceding SNAP grid · Q">Q</button><label>LEN<select id="ml-note-length"><option value=".25">1/16</option><option value=".5">1/8</option><option value="1" selected>1/4</option><option value="2">1/2</option><option value="4">1 BAR</option></select></label><button id="ml-undo" title="Undo notes" aria-label="Undo notes" disabled>↶</button><button id="ml-redo" title="Redo notes" aria-label="Redo notes" disabled>↷</button><button id="ml-fit">FIT</button><button popovertarget="ml-more" aria-label="More note tools">⋯</button></div>
  <div id="ml-more" popover><div class="roll-toolbar"><label>ZOOM<select id="ml-zoom"><option value=".5">50%</option><option value="1" selected>100%</option><option value="2">200%</option><option value="4">400%</option></select></label><label><input id="ml-show-accomp" type="checkbox" checked> SHOW ACCOMP</label><button id="ml-all">SELECT ALL</button><button id="ml-duplicate">DUPLICATE</button><button id="ml-roll-delete">DELETE</button></div><div class="roll-nudge" role="group" aria-label="Edit selection"><button id="ml-left">←</button><button id="ml-right">→</button><button id="ml-up">↑</button><button id="ml-down">↓</button><button id="ml-shorter">SHORTEN</button><button id="ml-longer">EXTEND</button></div></div>
  <div class="melody-roll-scroll"><svg id="ml-roll" role="img" aria-label="Melody piano roll"></svg></div><p id="ml-roll-selection" role="status" aria-live="polite">Select or draw notes.</p><p class="hint" id="ml-edit-notice" hidden>Edited notes are now the audition source.</p>
  <details class="mixer-disclosure"><summary>MIXER</summary><div class="melody-mix"><button id="ml-mute" type="button" aria-pressed="false" aria-label="Mute melody">MELODY ●</button><label>MELODY <output id="ml-melody-value">35%</output><input id="ml-melody-volume" aria-label="Melody volume" type="range" min="0" max="1" step=".05" value=".35"></label><label>HARMONY <output id="ml-harmony-value">100%</output><input id="ml-harmony-volume" aria-label="Harmony volume" type="range" min="0" max="1" step=".05" value="1"></label><label>SOURCE<select id="ml-listen"><option value="notes">NOTES</option><option value="original">AUDIO</option></select></label><label>TONE<select id="ml-instrument"><option value="warm">WARM LEAD</option><option value="keys">SOFT KEYS</option><option value="sine">SINE</option></select></label><label>FIT<select id="ml-policy"><option value="musical">SMOOTH</option><option value="strict">STRICT</option></select></label><button id="ml-basic">RESET CHORDS</button></div></details>
  <div class="melody-compare"><strong>COMPARE STYLES</strong><div role="group" aria-label="Compare styles"><button data-compare-style="American pop">POP</button><button data-compare-style="Rock">ROCK</button><button data-compare-style="Jazz">JAZZ</button><button data-compare-style="Bossa nova">BOSSA</button><button data-compare-style="House">HOUSE</button><button data-compare-style="Classical">CLASSICAL</button><button data-compare-style="Lo-fi hip-hop">LO-FI</button><button data-compare-style="Ambient">AMBIENT</button></div></div>
  <details><summary>NOTE DETAILS</summary><div class="melody-table-scroll"><table><thead><tr><th>NOTE</th><th>BEAT</th><th>LENGTH</th><th>CONFIDENCE</th><th></th></tr></thead><tbody id="ml-notes"></tbody></table></div></details><p class="melody-audit" id="ml-audit">Melody protection enabled.</p></div>
  <dialog id="ml-editor"><form id="ml-form"><h2>EDIT NOTE</h2><label>PITCH<select id="ml-pitch" required></select></label><label>BEAT<input id="ml-start" type="number" min="0" step=".001" required></label><label>LENGTH<input id="ml-duration" type="number" min=".001" step=".001" required></label><p id="ml-edit-error" role="alert"></p><div class="editor-actions"><button id="ml-delete" type="button">DELETE</button><button id="ml-close" type="button">CANCEL</button><button type="submit" class="primary">SAVE NOTE</button></div></form></dialog>`;
  this.$=id=>host.querySelector('#ml-'+id);noteNames.forEach((n,i)=>this.$('key').add(new Option(n,i)));
  for(let pitch=0;pitch<128;pitch++)this.$('pitch').add(new Option(noteName(pitch),pitch));
  const score=document.querySelector('.score');if(score)new ResizeObserver(()=>host.style.setProperty('--score-height',score.getBoundingClientRect().height+'px')).observe(score);
  host.querySelectorAll('[data-compare-style]').forEach(b=>b.onclick=()=>onStyle(b.dataset.compareStyle));
  this.pickup=true;this.$('pickup').onchange=()=>{this.pickup=this.$('pickup').checked;this.changed('import');};
  this.history=new NoteHistory();
  this.roll=new PianoRoll(this.$('roll'),{onCommit:notes=>this.commitNotes(notes),onStop:()=>this.onStop(),onEdit:i=>this.editNote(i),onUndo:()=>this.restoreNotes('undo'),onRedo:()=>this.restoreNotes('redo'),onError:e=>this.fail(e)});
  this.$('show-accomp').onchange=()=>{this.roll.showAccompaniment=this.$('show-accomp').checked;this.draw(this.roll.accompaniment);};
  this.$('roll').setAttribute('aria-describedby','ml-roll-help');
  this.setTool=tool=>{this.roll.setTool(tool);host.querySelectorAll('[data-roll-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rollTool===tool)));};
  host.querySelectorAll('[data-roll-tool]').forEach(b=>b.onclick=()=>this.setTool(b.dataset.rollTool));
  this.$('note-length').onchange=()=>{this.roll.length=+this.$('note-length').value;};
  this.$('all').onclick=()=>this.roll.selectAll();this.$('duplicate').onclick=()=>this.roll.duplicate();
  this.$('quantize').onclick=()=>this.roll.quantize();
  this.$('fit').onclick=()=>{this.roll.initialized=false;this.draw(this.roll.accompaniment);};
  this.$('left').onclick=()=>this.roll.nudge({deltaBeat:-(this.roll.step||.25)});this.$('right').onclick=()=>this.roll.nudge({deltaBeat:this.roll.step||.25});
  this.$('up').onclick=()=>this.roll.nudge({deltaPitch:1,horizontal:false});this.$('down').onclick=()=>this.roll.nudge({deltaPitch:-1,horizontal:false});
  this.$('shorter').onclick=()=>this.roll.nudge({kind:'end',deltaBeat:-(this.roll.step||.25)});this.$('longer').onclick=()=>this.roll.nudge({kind:'end',deltaBeat:this.roll.step||.25});
  this.$('new').onclick=()=>{this.notes=[];this.kind='manual';this.reviewRequired=false;this.name='自編旋律';this.buffer=null;this.audioNotes=[];this.offset=0;this.fixed=true;this.mode='notes';this.warning='';this.resetEdits();this.setTool('draw');this.changed('new');};
  this.$('snap').onchange=()=>{this.roll.step=+this.$('snap').value;this.draw(this.roll.accompaniment);};
  this.$('zoom').onchange=()=>{const scroll=this.roll.scroll,beat=scroll.scrollLeft/this.roll.px;this.roll.zoom=+this.$('zoom').value;this.draw(this.roll.accompaniment);scroll.scrollLeft=beat*this.roll.px;};
  this.$('undo').onclick=()=>this.restoreNotes('undo');this.$('redo').onclick=()=>this.restoreNotes('redo');this.$('roll-delete').onclick=()=>this.roll.remove();
  const action=fn=>async(...args)=>{this.$('error').hidden=true;try{await fn(...args);}catch(e){this.fail(e);}};
  this.$('file').onchange=e=>{this.import(e.target.files[0]);e.target.value='';};
  this.$('demo').onclick=action(()=>{host.querySelector('.demo-menu').open=false;this.importDemo();});
  this.$('audio').onclick=action(async()=>{host.querySelector('.demo-menu').open=false;const r=await fetch('./examples/melody-108.wav');if(!r.ok)throw Error('範例讀取失敗');await this.import(new File([await r.arrayBuffer()],'原創旋律-108BPM.wav'));});
  this.$('cancel').onclick=()=>{this.token++;this.worker?.terminate();this.rejectWorker?.(Error('已取消'));this.setBusy(false);this.$('status').textContent='已取消，保留上一段旋律。';};
  for(const type of ['dragover','drop'])this.$('drop').addEventListener(type,e=>{e.preventDefault();if(type==='drop')this.import(e.dataTransfer.files[0]);});
  this.$('remove').onclick=()=>{this.onStop();this.notes=[];this.buffer=null;this.kind=null;this.reviewRequired=false;this.resetEdits();this.render();this.onChange('remove');};
  this.$('track').onchange=action(()=>{const t=this.midi.tracks.find(t=>t.id===this.$('track').value);if(t.pitchBend)throw Error('此軌含 Pitch Bend，請先匯出音訊。');validateMelody(t.notes);this.notes=structuredClone(t.notes);this.key=inferKeys(this.notes).candidates[0];this.resetEdits();this.changed('import');});
  this.$('bpm').onchange=action(()=>this.setTempo(Number(this.$('bpm').value)));
  this.$('bpm').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();this.$('bpm').blur();}};
  this.$('half').onclick=action(()=>this.setTempo(this.bpm/2));this.$('double').onclick=action(()=>this.setTempo(this.bpm*2));
  this.$('fixed').onchange=action(()=>{this.fixed=this.$('fixed').checked;if(!this.fixed)this.bpm=this.midi.tempoMap[0].bpm;this.changed('tempo');});
  for(const id of ['key','mode'])this.$(id).onchange=action(()=>{this.key={root:+this.$('key').value,mode:this.$('mode').value};this.keySource='manual';this.changed('key');});
  this.$('meter').onchange=action(()=>{const[numerator,denominator]=this.$('meter').value.split('/').map(Number);this.meter={numerator,denominator};this.changed('meter');});
  this.$('offset').onchange=action(()=>{const value=+this.$('offset').value;const notes=audioNotesToBeats(this.audioNotes,this.sourceBpm||this.bpm,value);validateMelody(notes);this.offset=value;this.notes=notes;this.changed('alignment');});
  this.$('mute').onclick=()=>this.setMuted(!this.muted);
  this.$('listen').onchange=()=>{this.mode=this.$('listen').value;this.onMix(true);};
  for(const name of ['melody','harmony'])this.$(name+'-volume').oninput=()=>{this.mix[name]=+this.$(name+'-volume').value;this.$(name+'-value').value=Math.round(this.mix[name]*100)+'%';this.onMix(false);};
  this.$('basic').onclick=this.$('confirm').onclick=()=>{this.reviewRequired=false;this.changed('import');};
  this.policy='musical';this.$('policy').onchange=()=>{this.policy=this.$('policy').value;this.changed('import');};
  this.instrument='warm';this.$('instrument').onchange=()=>{this.instrument=this.$('instrument').value;this.onMix(true);};
  this.taps=[];this.$('tap').onclick=action(()=>{const now=performance.now();if(this.taps.length&&now-this.taps.at(-1)>2200)this.taps=[];this.taps.push(now);this.taps=this.taps.slice(-9);if(this.taps.length>=4){const intervals=this.taps.slice(1).map((t,i)=>t-this.taps[i]).sort((a,b)=>a-b);this.setTempo(Math.round(60000/intervals[Math.floor(intervals.length/2)]*2)/2);}});
  this.$('close').onclick=()=>this.$('editor').close();
  this.$('form').onsubmit=e=>{e.preventDefault();try{const notes=structuredClone(this.notes),start=+this.$('start').value;notes[this.editing]={...notes[this.editing],pitch:+this.$('pitch').value,start,end:start+(+this.$('duration').value)};this.commitNotes(notes);}catch(e){this.$('edit-error').textContent=e.message;}};
  this.$('delete').onclick=()=>{try{this.commitNotes(this.notes.filter((_,i)=>i!==this.editing));}catch(e){this.$('edit-error').textContent=e.message;}};
 }
 get active(){return this.notes.length>0;}
 get tempoMap(){return ['midi','project'].includes(this.kind)&&!this.fixed?this.midi.tempoMap:[{beat:0,bpm:this.bpm}];}
 fail(e){this.$('error').textContent=e.message;this.$('error').hidden=false;}
 setBusy(busy){this.busy=busy;this.roll.disabled=busy;if(busy)this.roll.cancel();for(const id of ['undo','redo','roll-delete','snap','zoom'])this.$(id).disabled=busy;this.$('progress-wrap').hidden=!busy;this.$('progress').value=0;for(const id of ['file','demo','audio','remove','new'])this.$(id).disabled=busy;if(busy)this.onStop();this.updateHistory();this.roll.paintSelection();}
 changed(kind){const wasPlaying=this.onStop();if(kind==='alignment'||kind==='tempo'&&this.reviewRequired)this.history.clear();this.render();this.onChange(kind,{resume:kind==='tempo'&&!!wasPlaying});}
 get melodyGain(){return this.muted?0:this.mix.melody;}
 get originalAvailable(){return this.kind==='audio'&&Math.abs(this.bpm-(this.sourceBpm||this.bpm))<.001;}
 setMuted(muted){this.muted=!!muted;this.$('mute').textContent=this.muted?'MELODY ○':'MELODY ●';this.$('mute').setAttribute('aria-pressed',String(this.muted));this.onMix(false);}
 setTempo(bpm){
  if(!Number.isFinite(bpm)||bpm<30||bpm>300)throw Error('BPM 需介於 30–300。');
  if(this.kind==='audio'&&this.reviewRequired){const notes=audioNotesToBeats(this.audioNotes,bpm,this.offset);if(notes.length)validateMelody(notes);this.notes=notes;this.sourceBpm=bpm;}
  // Confirmed notes are musical beat positions, never seconds to be reinterpreted.
  this.bpm=bpm;this.bpmSource='manual';this.fixed=true;
  if(this.mode==='original'&&!this.originalAvailable)this.mode='notes';
  this.changed('tempo');
 }
 importDemo(){this.notes=demoMelody();this.kind='demo';this.reviewRequired=false;this.hints=null;this.warning='';this.audioNotes=[];this.name='原創旋律 · 108 BPM';this.bpm=108;this.meter={numerator:4,denominator:4};this.key={root:0,mode:'major'};this.buffer=null;this.offset=0;this.fixed=true;this.mode='notes';this.resetEdits();this.changed('import');}
 async import(file){
  if(!file||this.busy)return;const token=++this.token;this.setBusy(true);this.$('error').hidden=true;this.$('status').textContent='正在讀取 '+file.name+'…';
  try{
   if(file.size>40*1024*1024)throw Error('檔案上限 40 MB。');const bytes=await file.arrayBuffer();if(token!==this.token)return;
   const isMidi=new TextDecoder().decode(bytes.slice(0,4))==='MThd'||/\.midi?$/i.test(file.name);
   let next;
   if(isMidi){
    const midi=parseMidi(bytes),eligible=midi.tracks.filter(t=>!t.pitchBend&&t.notes.length<=2000&&Math.max(...t.notes.map(n=>n.end))<=512);
    if(!eligible.length)throw Error('沒有可用旋律軌，請匯出不含 Pitch Bend 的短旋律 MIDI。');
    const ranked=eligible.map(track=>({track,score:Math.min(track.notes.length,100)-track.notes.filter((n,i,a)=>i>0&&n.start<a[i-1].end-.01).length*4+track.notes.reduce((s,n)=>s+n.pitch,0)/track.notes.length/5})).sort((a,b)=>b.score-a.score);
    const track=ranked[0].track;validateMelody(track.notes);
    next={kind:'midi',reviewRequired:false,hints:null,name:file.name,midi,notes:structuredClone(track.notes),meter:midi.meter,bpm:midi.tempoMap[0].bpm,key:midi.keyHint||inferKeys(track.notes).candidates[0],buffer:null,offset:0,fixed:false,warning:midi.warnings.join(' ')};
    this.$('track').replaceChildren();midi.tracks.forEach(t=>{const o=new Option(t.name+' · '+t.notes.length+' 音',t.id);o.disabled=!eligible.includes(t);this.$('track').add(o);});this.$('track').value=track.id;
   }else{
    this.decodeContext ||=new OfflineAudioContext(1,1,22050);let buffer;try{buffer=await this.decodeContext.decodeAudioData(bytes);}catch{throw Error('無法解碼，請改用 WAV 或 MP3。');}
    if(token!==this.token)return;if(buffer.duration>120||buffer.duration<.15)throw Error('請使用 0.15–120 秒音訊。');
    const ctx=new OfflineAudioContext(1,Math.ceil(buffer.duration*22050),22050),s=ctx.createBufferSource();s.buffer=buffer;s.connect(ctx.destination);s.start();const mono=await ctx.startRendering();if(token!==this.token)return;
    this.$('status').textContent='載入音訊辨識模型，檔案只留在瀏覽器…';const samples=mono.getChannelData(0).slice();
    const result=await new Promise((resolve,reject)=>{this.worker=new Worker(new URL('./neural-worker.js?v=2.0.0-alpha.9',import.meta.url),{type:'module'});this.rejectWorker=reject;this.worker.onmessage=({data})=>{if(data.progress!==undefined){this.$('progress').value=data.progress;if(data.progress>.08)this.$('status').textContent='辨識旋律中 · '+Math.round(data.progress*100)+'% · 檔案只留在瀏覽器';}else if(data.error)reject(Error(data.error));else resolve(data.result);};this.worker.onerror=()=>reject(Error('音訊分析失敗，請重新整理後再試。'));this.worker.postMessage({samples,sampleRate:22050,name:file.name},[samples.buffer]);});
    if(token!==this.token)return;const notes=audioNotesToBeats(result.notes,result.tempo.bpm,result.offset);validateMelody(notes);
    next={kind:'audio',name:file.name,notes,audioNotes:result.notes,buffer,bpm:result.tempo.bpm,sourceBpm:result.tempo.bpm,offset:result.offset,meter:{numerator:4,denominator:4},key:result.key||inferKeys(notes).candidates[0],fixed:true,reviewRequired:true,hints:result.hints,bpmSource:result.hints?.bpm?'file':'estimate',keySource:result.hints?.key?'file':'estimate',tempoCandidates:result.tempo.candidates,warning:result.warnings.join(' ')};
   }
   if(token!==this.token)return;Object.assign(this,next,{mode:'notes'});this.resetEdits();this.changed('import');
  }catch(e){if(token===this.token){this.fail(e);this.$('status').textContent='匯入未完成，上一段旋律仍保留。';}}
  finally{if(token===this.token){this.worker?.terminate();this.worker=null;this.rejectWorker=null;this.setBusy(false);}}
 }
 resetEdits(){this.history.clear();this.roll.reset();this.audioEdited=false;this.updateHistory();}
 updateHistory(){this.$('undo').disabled=this.busy||!this.history.undoStack.length;this.$('redo').disabled=this.busy||!this.history.redoStack.length;this.$('roll-delete').disabled=this.busy||this.roll?.selected<0||!this.roll.selection.size;}
 restoreNotes(direction){if(this.busy)return;const notes=this.history[direction](this.notes);if(notes)this.commitNotes(notes,{record:false});}
 commitNotes(notes,{record=true}={}){if(this.busy)return;if(notes.length)validateMelody(notes);if(record)this.history.record(this.notes);this.notes=structuredClone(notes).sort((a,b)=>a.start-b.start);if(this.kind==='audio'){this.audioNotes=this.notes.map(n=>({...n,start:n.start*60/(this.sourceBpm||this.bpm)+this.offset,end:n.end*60/(this.sourceBpm||this.bpm)+this.offset}));this.mode='notes';this.audioEdited=true;}this.$('error').hidden=true;this.changed('edit');this.$('editor').close();}
 editNote(i){this.onStop();this.editing=i;const n=this.notes[i];this.$('pitch').value=n.pitch;this.$('start').value=f(n.start);this.$('duration').value=f(n.end-n.start);this.$('edit-error').textContent='';this.$('delete').disabled=this.notes.length<2;this.$('editor').showModal();}
 render(){
  this.updateHistory();this.$('review').hidden=!this.reviewRequired;this.$('edit-notice').hidden=!this.audioEdited;
  this.$('basic').disabled=!this.active;this.$('work').hidden=!this.active&&!this.kind;this.$('remove').hidden=!this.active&&!this.kind;if(!this.active&&!this.kind){this.$('status').textContent='已移除旋律，回到原本和弦工作流程。';return;}
  this.$('status').textContent=this.name+' · '+this.notes.length+' NOTES · '+Math.ceil(Math.max(barLength(this.meter),...this.notes.map(n=>n.end))/barLength(this.meter))+' BARS';
  this.$('settings-button').textContent=f(this.bpm)+' BPM · '+pitchName(this.key.root,this.key)+' '+(this.key.mode==='minor'?'MIN':'MAJ')+' · '+this.meter.numerator+'/'+this.meter.denominator;
  this.$('bpm').value=f(this.bpm);this.$('key').value=this.key.root;this.$('mode').value=this.key.mode;
  const m=this.meter.numerator+'/'+this.meter.denominator;if(![...this.$('meter').options].some(o=>o.value===m))this.$('meter').add(new Option(m,m));this.$('meter').value=m;
  const variable=['midi','project'].includes(this.kind)&&this.midi.tempoMap.length>1;this.$('fixed-wrap').hidden=!variable;this.$('fixed').checked=this.fixed;
  for(const id of ['bpm','half','double'])this.$(id).disabled=variable&&!this.fixed;
  this.$('track-wrap').hidden=this.kind!=='midi';this.$('offset-wrap').hidden=this.kind!=='audio';this.$('offset').value=f(this.offset);
  this.$('listen').querySelector('[value=original]').disabled=!this.originalAvailable;this.$('listen').value=this.mode;
  this.$('mute').textContent=this.muted?'MELODY ○':'MELODY ●';this.$('mute').setAttribute('aria-pressed',String(this.muted));
  this.$('tempo-notice').textContent=this.reviewRequired?'確認前：BPM 用來校正原音的拍格，小節數會隨校正更新。':'旋律與伴奏共用 BPM，變速保留音高、音符拍點與小節數。'+(this.kind==='audio'&&!this.originalAvailable?' 目前以辨識音符變速播放；回到 '+f(this.sourceBpm)+' BPM 可試聽原音訊。':'');
  const keys=inferKeys(this.notes);this.$('analysis').textContent=keys.confidence+' · 調性建議 '+keys.candidates.slice(0,3).map(c=>c.label).join(' / ')+(variable&&!this.fixed?' · 保留 '+this.midi.tempoMap.length+' 段速度變化':this.kind==='audio'?' · 確認後變速保留小節數。':'');this.$('warning').textContent=this.warning||'';if(!this.notes.length){this.$('analysis').textContent='選「畫音符」，在格子點一下開始；不需要輸入 MIDI 數字。';this.$('audit').textContent='尚未加入旋律音符';}if(this.kind==='audio'&&this.notes.length)this.$('analysis').textContent='速度 '+f(this.bpm)+' BPM · '+(this.bpmSource==='file'?'來源：檔名標記':this.bpmSource==='manual'?'來源：手動 / TAP 修正':'來源：起音估計')+' · 調性 '+noteNames[this.key.root]+' '+(this.key.mode==='major'?'大調':'小調')+' · '+(this.keySource==='file'?'來源：檔名標記':this.keySource==='manual'?'來源：手動修正':'候選，請確認')+' · 分析建議 '+keys.candidates.slice(0,3).map(c=>c.label).join(' / ');
  const table=this.$('notes');table.replaceChildren();this.notes.forEach((n,i)=>{const tr=document.createElement('tr');for(const v of [pitchName(n.pitch,this.key,true),f(n.start),f(n.end-n.start),Math.round((n.confidence??1)*100)+'%']){const td=document.createElement('td');td.textContent=v;tr.append(td);}const td=document.createElement('td'),b=document.createElement('button');b.textContent='EDIT';b.setAttribute('aria-label','編輯第 '+(i+1)+' 音 '+noteName(n.pitch));b.onclick=()=>this.editNote(i);td.append(b);tr.append(td);table.append(tr);});this.draw();
 }
 draw(accompaniment=[]){if(this.active||this.kind){this.roll.keySignature=this.key;this.roll.extraBar=this.kind==='manual';this.roll.draw(this.notes,accompaniment,barLength(this.meter));}}
}
