import {parseMidi} from './midi.js?v=2.0.0-alpha.7';
import {inferKeys,audioNotesToBeats,noteName,noteNames} from './analysis.js?v=2.0.0-alpha.7';
import {validateMelody,demoMelody} from './harmony.js?v=2.0.0-alpha.7';
import {PianoRoll} from './piano-roll.js?v=2.0.0-alpha.7';
import {NoteHistory} from './note-edit.js?v=2.0.0-alpha.7';
import {barLength} from './fusion.js?v=2.0.0-alpha.7';

const f=n=>Number(n.toFixed(3));
export class MelodyWorkspace {
 constructor(host,{onChange=()=>{},onMix=()=>{},onStop=()=>{},onStyle=()=>{}}={}){
  this.host=host;this.onChange=onChange;this.onMix=onMix;this.onStop=onStop;this.notes=[];this.meter={numerator:4,denominator:4};this.bpm=108;this.key={root:0,mode:'major'};this.offset=0;this.buffer=null;this.mix={melody:.35,harmony:1};this.mode='notes';this.muted=false;this.token=0;this.busy=false;
  host.innerHTML=`<div class="section-label"><span>MELODY / 旋律音軌 · 2.0</span><span>選用 · 保留原本的和弦工作流程</span></div><p class="hint">放入乾淨單音音訊或旋律 MIDI，自動找音高、速度與調性；下方仍使用 1.0 的和弦、鋼琴音色與演奏工具。</p>
  <div class="melody-upload" id="ml-drop"><label class="file-button">＋ 匯入音訊 / MIDI<input id="ml-file" type="file" accept="audio/*,.mid,.midi" aria-label="匯入旋律音訊或 MIDI"></label><button id="ml-new">＋ 自己畫旋律</button><button id="ml-demo">旋律 MIDI 範例</button><button id="ml-audio">音訊辨識範例</button><button id="ml-remove" hidden>移除旋律</button></div>
  <p id="ml-status" role="status">尚未加入旋律，可直接使用原本的和弦工作台。</p><p id="ml-error" role="alert" hidden></p><div id="ml-progress-wrap" hidden><progress id="ml-progress" max="1"></progress><button id="ml-cancel">取消分析</button></div>
  <div id="ml-work" hidden><div class="melody-settings"><label id="ml-track-wrap" hidden>旋律軌<select id="ml-track"></select></label><label>速度 BPM<input id="ml-bpm" type="number" min="30" max="300" step=".5"></label><button id="ml-half">½</button><button id="ml-double">2×</button><button id="ml-tap" title="跟著音樂連按至少四次">TAP 定速</button><label>調性<select id="ml-key"></select></label><label>大小調<select id="ml-mode"><option value="major">大調</option><option value="minor">小調</option></select></label><label>拍號<select id="ml-meter"><option value="4/4">4/4</option><option value="3/4">3/4</option><option value="6/8">6/8</option></select></label><label id="ml-offset-wrap" hidden>音訊第 1 拍（秒）<input id="ml-offset" type="number" min="0" step=".01"></label></div>
  <label id="ml-fixed-wrap" hidden><input type="checkbox" id="ml-fixed"> 改用固定 BPM</label><p class="hint" id="ml-analysis"></p><p class="hint" id="ml-warning"></p><div id="ml-review" class="melody-review" hidden><strong>先確認旋律，再配和弦</strong><p>先交替試聽「原音訊」與「辨識音符」，確認音高、BPM、調性和第 1 拍。音訊辨識結果還沒確認前，暫不產生伴奏。</p><button id="ml-confirm">確認旋律並配和弦</button></div>
  <div class="melody-compare"><strong>同一段旋律，比較基本配奏</strong><p>先保留旋律的和弦骨架，再改變樂風色彩與伴奏。選擇後按 PLAY。</p><div role="group" aria-label="基本樂風比較"><button data-compare-style="American pop">Pop</button><button data-compare-style="Rock">Rock</button><button data-compare-style="Jazz">Jazz</button><button data-compare-style="Bossa nova">Bossa</button><button data-compare-style="House">House</button><button data-compare-style="Classical">Classical</button><button data-compare-style="Lo-fi hip-hop">Lo-fi</button><button data-compare-style="Ambient">Ambient</button></div></div><div class="melody-mix"><button id="ml-mute" type="button" aria-pressed="false" aria-label="旋律靜音">旋律 ON</button><label>旋律試聽<select id="ml-listen"><option value="notes">辨識音符</option><option value="original">原音訊</option></select></label><label>配和方式<select id="ml-policy"><option value="musical">流暢配和 · 容許色彩音</option><option value="strict">嚴格配和 · 排除二度／七度</option></select></label><label>旋律音色<select id="ml-instrument"><option value="warm">Warm lead · 柔和合成器</option><option value="keys">Soft keys · 電鋼琴感</option><option value="sine">Pure sine · 純音對照</option></select></label><label>旋律 <output id="ml-melody-value">35%</output><input id="ml-melody-volume" aria-label="旋律音量" type="range" min="0" max="1" step=".05" value=".35"></label><label>和聲 <output id="ml-harmony-value">100%</output><input id="ml-harmony-volume" aria-label="和聲音量" type="range" min="0" max="1" step=".05" value="1"></label><button id="ml-basic">依旋律重建基本和弦</button></div>
  <p id="ml-tempo-notice" class="hint" role="status"></p><p class="hint">旋律預設 35%，和聲 100%；音量可在播放中調整。藍色為旋律、金色為實際伴奏。</p><div class="roll-toolbar"><label>新增音長<select id="ml-note-length"><option value=".25">十六分音符</option><option value=".5">八分音符</option><option value="1" selected>四分音符</option><option value="2">二分音符</option><option value="4">全音符</option></select></label><label>拍點吸附<select id="ml-snap"><option value="1">1/4</option><option value=".5">1/8</option><option value=".3333333333333333">1/8 三連音</option><option value=".25" selected>1/16</option><option value=".125">1/32</option><option value="0">自由移動</option></select></label><label>水平縮放<select id="ml-zoom"><option value=".5">50%</option><option value="1" selected>100%</option><option value="2">200%</option><option value="4">400%</option></select></label><button id="ml-undo" disabled>復原音符</button><button id="ml-redo" disabled>重做音符</button></div><div class="roll-nudge" role="group" aria-label="移動選取音符"><button id="ml-left" aria-label="選取音符往前移">← 往前</button><button id="ml-right" aria-label="選取音符往後移">往後 →</button><button id="ml-up" aria-label="選取音符升半音">↑ 升音</button><button id="ml-down" aria-label="選取音符降半音">↓ 降音</button><button id="ml-shorter">縮短</button><button id="ml-longer">延長</button></div><p class="hint" id="ml-roll-help">選取：拖曳空白框選多個音符，拖曳任一選取音符一起移動；Shift＋點選可加選。畫音符：點空白新增、拖曳決定長度。橡皮擦：點音符刪除。手機可用下方捲軸與「移動畫面」平移；上方按鈕可整批移音、改長度。⌘ / Ctrl＋A 全選、D 複製、Z 復原。</p><p id="ml-roll-selection" role="status" aria-live="polite">點選音符，或在空白格雙擊新增</p><p class="hint" id="ml-edit-notice" hidden>已編輯辨識音符，試聽已切回「辨識音符」。原音訊不會跟著移調或移動。</p><div class="roll-tools" role="group" aria-label="音符編輯工具"><button data-roll-tool="select" aria-pressed="true">↖ 選取／框選</button><button data-roll-tool="draw" aria-pressed="false">✎ 畫音符</button><button data-roll-tool="erase" aria-pressed="false">⌫ 橡皮擦</button><button data-roll-tool="pan" aria-pressed="false">✥ 移動畫面</button><button id="ml-fit">回到旋律</button><button id="ml-all">全選</button><button id="ml-duplicate">複製選取</button><button id="ml-roll-delete">刪除選取</button></div><div class="melody-roll-scroll"><svg id="ml-roll" role="img" aria-label="旋律與和聲鋼琴捲軸"></svg></div>
  <details><summary>進階：音符明細與精確數值</summary><div class="melody-table-scroll"><table><thead><tr><th>音符</th><th>起始拍</th><th>長度</th><th>辨識強度</th><th></th></tr></thead><tbody id="ml-notes"></tbody></table></div></details><p class="melody-audit" id="ml-audit">旋律保護已啟用</p><p class="hint">流暢配和容許大二度／小七度色彩，避開半音與三全音；嚴格配和再排除所有二度／七度。節奏固定在小節拍格；必要時改配或留白。旋律僅作編曲參考，MIDI 拖曳／下載只包含和弦伴奏。音訊最長 120 秒／40 MB，最多 2,000 音、512 拍。</p></div>
  <dialog id="ml-editor"><form id="ml-form"><h2>修正旋律音符</h2><label>音高<select id="ml-pitch" required></select></label><label>起始拍<input id="ml-start" type="number" min="0" step=".001" required></label><label>音長（拍）<input id="ml-duration" type="number" min=".001" step=".001" required></label><p id="ml-edit-error" role="alert"></p><div class="editor-actions"><button id="ml-delete" type="button">移除音符</button><button id="ml-close" type="button">取消</button><button type="submit" class="primary">儲存並檢查和弦</button></div></form></dialog>`;
  this.$=id=>host.querySelector('#ml-'+id);noteNames.forEach((n,i)=>this.$('key').add(new Option(n,i)));
  for(let pitch=0;pitch<128;pitch++)this.$('pitch').add(new Option(noteName(pitch),pitch));
  const score=document.querySelector('.score');if(score)new ResizeObserver(()=>host.style.setProperty('--score-height',score.getBoundingClientRect().height+'px')).observe(score);
  host.querySelectorAll('[data-compare-style]').forEach(b=>b.onclick=()=>onStyle(b.dataset.compareStyle));
  this.history=new NoteHistory();
  this.roll=new PianoRoll(this.$('roll'),{onCommit:notes=>this.commitNotes(notes),onStop:()=>this.onStop(),onEdit:i=>this.editNote(i),onUndo:()=>this.restoreNotes('undo'),onRedo:()=>this.restoreNotes('redo'),onError:e=>this.fail(e)});
  this.$('roll').setAttribute('aria-describedby','ml-roll-help');
  this.setTool=tool=>{this.roll.setTool(tool);host.querySelectorAll('[data-roll-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rollTool===tool)));};
  host.querySelectorAll('[data-roll-tool]').forEach(b=>b.onclick=()=>this.setTool(b.dataset.rollTool));
  this.$('note-length').onchange=()=>{this.roll.length=+this.$('note-length').value;};
  this.$('all').onclick=()=>this.roll.selectAll();this.$('duplicate').onclick=()=>this.roll.duplicate();
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
  this.$('demo').onclick=action(()=>this.importDemo());
  this.$('audio').onclick=action(async()=>{const r=await fetch('./examples/melody-108.wav');if(!r.ok)throw Error('範例讀取失敗');await this.import(new File([await r.arrayBuffer()],'原創旋律-108BPM.wav'));});
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
 get tempoMap(){return this.kind==='midi'&&!this.fixed?this.midi.tempoMap:[{beat:0,bpm:this.bpm}];}
 fail(e){this.$('error').textContent=e.message;this.$('error').hidden=false;}
 setBusy(busy){this.busy=busy;this.roll.disabled=busy;if(busy)this.roll.cancel();for(const id of ['undo','redo','roll-delete','snap','zoom'])this.$(id).disabled=busy;this.$('progress-wrap').hidden=!busy;this.$('progress').value=0;for(const id of ['file','demo','audio','remove','new'])this.$(id).disabled=busy;if(busy)this.onStop();this.updateHistory();}
 changed(kind){const wasPlaying=this.onStop();if(kind==='alignment'||kind==='tempo'&&this.reviewRequired)this.history.clear();this.render();this.onChange(kind,{resume:kind==='tempo'&&!!wasPlaying});}
 get melodyGain(){return this.muted?0:this.mix.melody;}
 get originalAvailable(){return this.kind==='audio'&&Math.abs(this.bpm-(this.sourceBpm||this.bpm))<.001;}
 setMuted(muted){this.muted=!!muted;this.$('mute').textContent=this.muted?'旋律 MUTE':'旋律 ON';this.$('mute').setAttribute('aria-pressed',String(this.muted));this.onMix(false);}
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
    const result=await new Promise((resolve,reject)=>{this.worker=new Worker(new URL('./neural-worker.js?v=2.0.0-alpha.7',import.meta.url),{type:'module'});this.rejectWorker=reject;this.worker.onmessage=({data})=>{if(data.progress!==undefined){this.$('progress').value=data.progress;if(data.progress>.08)this.$('status').textContent='辨識旋律中 · '+Math.round(data.progress*100)+'% · 檔案只留在瀏覽器';}else if(data.error)reject(Error(data.error));else resolve(data.result);};this.worker.onerror=()=>reject(Error('音訊分析失敗，請重新整理後再試。'));this.worker.postMessage({samples,sampleRate:22050,name:file.name},[samples.buffer]);});
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
  this.$('status').textContent=this.name+' · '+this.notes.length+' 個音 · '+Math.ceil(Math.max(4,...this.notes.map(n=>n.end))/barLength(this.meter))+' 小節';
  this.$('bpm').value=f(this.bpm);this.$('key').value=this.key.root;this.$('mode').value=this.key.mode;
  const m=this.meter.numerator+'/'+this.meter.denominator;if(![...this.$('meter').options].some(o=>o.value===m))this.$('meter').add(new Option(m,m));this.$('meter').value=m;
  const variable=this.kind==='midi'&&this.midi.tempoMap.length>1;this.$('fixed-wrap').hidden=!variable;this.$('fixed').checked=this.fixed;
  for(const id of ['bpm','half','double'])this.$(id).disabled=variable&&!this.fixed;
  this.$('track-wrap').hidden=this.kind!=='midi';this.$('offset-wrap').hidden=this.kind!=='audio';this.$('offset').value=f(this.offset);
  this.$('listen').querySelector('[value=original]').disabled=!this.originalAvailable;this.$('listen').value=this.mode;
  this.$('mute').textContent=this.muted?'旋律 MUTE':'旋律 ON';this.$('mute').setAttribute('aria-pressed',String(this.muted));
  this.$('tempo-notice').textContent=this.reviewRequired?'確認前：BPM 用來校正原音的拍格，小節數會隨校正更新。':'旋律與伴奏共用 BPM，變速保留音高、音符拍點與小節數。'+(this.kind==='audio'&&!this.originalAvailable?' 目前以辨識音符變速播放；回到 '+f(this.sourceBpm)+' BPM 可試聽原音訊。':'');
  const keys=inferKeys(this.notes);this.$('analysis').textContent=keys.confidence+' · 調性建議 '+keys.candidates.slice(0,3).map(c=>c.label).join(' / ')+(variable&&!this.fixed?' · 保留 '+this.midi.tempoMap.length+' 段速度變化':this.kind==='audio'?' · 確認後變速保留小節數。':'');this.$('warning').textContent=this.warning||'';if(!this.notes.length){this.$('analysis').textContent='選「畫音符」，在格子點一下開始；不需要輸入 MIDI 數字。';this.$('audit').textContent='尚未加入旋律音符';}if(this.kind==='audio'&&this.notes.length)this.$('analysis').textContent='速度 '+f(this.bpm)+' BPM · '+(this.bpmSource==='file'?'來源：檔名標記':this.bpmSource==='manual'?'來源：手動 / TAP 修正':'來源：起音估計')+' · 調性 '+noteNames[this.key.root]+' '+(this.key.mode==='major'?'大調':'小調')+' · '+(this.keySource==='file'?'來源：檔名標記':this.keySource==='manual'?'來源：手動修正':'候選，請確認')+' · 分析建議 '+keys.candidates.slice(0,3).map(c=>c.label).join(' / ');
  const table=this.$('notes');table.replaceChildren();this.notes.forEach((n,i)=>{const tr=document.createElement('tr');for(const v of [noteName(n.pitch),f(n.start),f(n.end-n.start),Math.round((n.confidence??1)*100)+'%']){const td=document.createElement('td');td.textContent=v;tr.append(td);}const td=document.createElement('td'),b=document.createElement('button');b.textContent='編輯';b.setAttribute('aria-label','編輯第 '+(i+1)+' 音 '+noteName(n.pitch));b.onclick=()=>this.editNote(i);td.append(b);tr.append(td);table.append(tr);});this.draw();
 }
 draw(accompaniment=[]){if(this.active||this.kind)this.roll.draw(this.notes,accompaniment,barLength(this.meter));}
}
