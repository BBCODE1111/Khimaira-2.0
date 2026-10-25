import {parseMidi} from './midi.js?v=2.0.0-alpha.2';
import {inferKeys,audioNotesToBeats,noteName,noteNames} from './analysis.js?v=2.0.0-alpha.2';
import {validateMelody,demoMelody} from './harmony.js?v=2.0.0-alpha.2';
import {barLength} from './fusion.js?v=2.0.0-alpha.2';

const f=n=>Number(n.toFixed(3));
export class MelodyWorkspace {
 constructor(host,{onChange=()=>{},onMix=()=>{},onStop=()=>{}}={}){
  this.host=host;this.onChange=onChange;this.onMix=onMix;this.onStop=onStop;this.notes=[];this.meter={numerator:4,denominator:4};this.bpm=108;this.key={root:0,mode:'major'};this.offset=0;this.buffer=null;this.mix={melody:.35,harmony:1};this.mode='notes';this.token=0;this.busy=false;
  host.innerHTML=`<div class="section-label"><span>MELODY / 旋律音軌 · 2.0</span><span>選用 · 保留原本的和弦工作流程</span></div><p class="hint">放入乾淨單音音訊或旋律 MIDI，自動找音高、速度與調性；下方仍使用 1.0 的和弦、鋼琴音色與演奏工具。</p>
  <div class="melody-upload" id="ml-drop"><label class="file-button">＋ 匯入音訊 / MIDI<input id="ml-file" type="file" accept="audio/*,.mid,.midi" aria-label="匯入旋律音訊或 MIDI"></label><button id="ml-demo">旋律 MIDI 範例</button><button id="ml-audio">音訊辨識範例</button><button id="ml-remove" hidden>移除旋律</button></div>
  <p id="ml-status" role="status">尚未加入旋律，可直接使用原本的和弦工作台。</p><p id="ml-error" role="alert" hidden></p><div id="ml-progress-wrap" hidden><progress id="ml-progress" max="1"></progress><button id="ml-cancel">取消分析</button></div>
  <div id="ml-work" hidden><div class="melody-settings"><label id="ml-track-wrap" hidden>旋律軌<select id="ml-track"></select></label><label>速度 BPM<input id="ml-bpm" type="number" min="30" max="300" step=".5"></label><button id="ml-half">½</button><button id="ml-double">2×</button><label>調性<select id="ml-key"></select></label><label>大小調<select id="ml-mode"><option value="major">大調</option><option value="minor">小調</option></select></label><label>拍號<select id="ml-meter"><option value="4/4">4/4</option><option value="3/4">3/4</option><option value="6/8">6/8</option></select></label><label id="ml-offset-wrap" hidden>音訊第 1 拍（秒）<input id="ml-offset" type="number" min="0" step=".01"></label></div>
  <label id="ml-fixed-wrap" hidden><input type="checkbox" id="ml-fixed"> 改用固定 BPM</label><p class="hint" id="ml-analysis"></p><p class="hint" id="ml-warning"></p>
  <div class="melody-mix"><label>旋律試聽<select id="ml-listen"><option value="notes">辨識音符</option><option value="original">原音訊</option><option value="mute">只聽和聲</option></select></label><label>旋律 <output id="ml-melody-value">35%</output><input id="ml-melody-volume" aria-label="旋律音量" type="range" min="0" max="1" step=".05" value=".35"></label><label>和聲 <output id="ml-harmony-value">100%</output><input id="ml-harmony-volume" aria-label="和聲音量" type="range" min="0" max="1" step=".05" value="1"></label><button id="ml-basic">依旋律重建基本和弦</button></div>
  <p class="hint">旋律預設 35%，和聲 100%；音量可在播放中調整。藍色為旋律、金色為實際伴奏。</p><div class="melody-roll-scroll"><svg id="ml-roll" role="img" aria-label="旋律與和聲鋼琴捲軸"></svg></div>
  <details><summary>查看 / 修正旋律音符</summary><div class="melody-table-scroll"><table><thead><tr><th>音符</th><th>起始拍</th><th>長度</th><th>可信度</th><th></th></tr></thead><tbody id="ml-notes"></tbody></table></div></details><p class="melody-audit" id="ml-audit">旋律保護已啟用</p><p class="hint">依目前辨識音符檢查與和聲重疊的二度、七度、三全音。必要時改配、拆段或留白；先確認辨識旋律。音訊最長 120 秒／40 MB，最多 2,000 音、512 拍。</p></div>
  <dialog id="ml-editor"><form id="ml-form"><h2>修正旋律音符</h2><label>音高（MIDI 0–127）<input id="ml-pitch" type="number" min="0" max="127" step="1" required></label><label>起始拍<input id="ml-start" type="number" min="0" step=".001" required></label><label>音長（拍）<input id="ml-duration" type="number" min=".001" step=".001" required></label><p id="ml-edit-error" role="alert"></p><div class="editor-actions"><button id="ml-delete" type="button">移除音符</button><button id="ml-close" type="button">取消</button><button type="submit" class="primary">儲存並檢查和弦</button></div></form></dialog>`;
  this.$=id=>host.querySelector('#ml-'+id);noteNames.forEach((n,i)=>this.$('key').add(new Option(n,i)));
  const action=fn=>async(...args)=>{this.$('error').hidden=true;try{await fn(...args);}catch(e){this.fail(e);}};
  this.$('file').onchange=e=>{this.import(e.target.files[0]);e.target.value='';};
  this.$('demo').onclick=action(()=>this.importDemo());
  this.$('audio').onclick=action(async()=>{const r=await fetch('./examples/melody-108.wav');if(!r.ok)throw Error('範例讀取失敗');await this.import(new File([await r.arrayBuffer()],'原創旋律-108BPM.wav'));});
  this.$('cancel').onclick=()=>{this.token++;this.worker?.terminate();this.rejectWorker?.(Error('已取消'));this.setBusy(false);this.$('status').textContent='已取消，保留上一段旋律。';};
  for(const type of ['dragover','drop'])this.$('drop').addEventListener(type,e=>{e.preventDefault();if(type==='drop')this.import(e.dataTransfer.files[0]);});
  this.$('remove').onclick=()=>{this.onStop();this.notes=[];this.buffer=null;this.kind=null;this.render();this.onChange('remove');};
  this.$('track').onchange=action(()=>{const t=this.midi.tracks.find(t=>t.id===this.$('track').value);if(t.pitchBend)throw Error('此軌含 Pitch Bend，請先匯出音訊。');validateMelody(t.notes);this.notes=structuredClone(t.notes);this.key=inferKeys(this.notes).candidates[0];this.changed('import');});
  this.$('bpm').onchange=action(()=>this.setTempo(Number(this.$('bpm').value)));
  this.$('half').onclick=action(()=>this.setTempo(this.bpm/2));this.$('double').onclick=action(()=>this.setTempo(this.bpm*2));
  this.$('fixed').onchange=action(()=>{this.fixed=this.$('fixed').checked;if(!this.fixed)this.bpm=this.midi.tempoMap[0].bpm;this.changed('tempo');});
  for(const id of ['key','mode'])this.$(id).onchange=action(()=>{this.key={root:+this.$('key').value,mode:this.$('mode').value};this.changed('key');});
  this.$('meter').onchange=action(()=>{const[numerator,denominator]=this.$('meter').value.split('/').map(Number);this.meter={numerator,denominator};this.changed('meter');});
  this.$('offset').onchange=action(()=>{const value=+this.$('offset').value;const notes=audioNotesToBeats(this.audioNotes,this.bpm,value);validateMelody(notes);this.offset=value;this.notes=notes;this.changed('tempo');});
  this.$('listen').onchange=()=>{this.mode=this.$('listen').value;this.onMix(true);};
  for(const name of ['melody','harmony'])this.$(name+'-volume').oninput=()=>{this.mix[name]=+this.$(name+'-volume').value;this.$(name+'-value').value=Math.round(this.mix[name]*100)+'%';this.onMix(false);};
  this.$('basic').onclick=()=>this.changed('import');
  this.$('close').onclick=()=>this.$('editor').close();
  this.$('form').onsubmit=e=>{e.preventDefault();try{const notes=structuredClone(this.notes),start=+this.$('start').value;notes[this.editing]={...notes[this.editing],pitch:+this.$('pitch').value,start,end:start+(+this.$('duration').value)};this.commitNotes(notes);}catch(e){this.$('edit-error').textContent=e.message;}};
  this.$('delete').onclick=()=>{try{this.commitNotes(this.notes.filter((_,i)=>i!==this.editing));}catch(e){this.$('edit-error').textContent=e.message;}};
 }
 get active(){return this.notes.length>0;}
 get tempoMap(){return this.kind==='midi'&&!this.fixed?this.midi.tempoMap:[{beat:0,bpm:this.bpm}];}
 fail(e){this.$('error').textContent=e.message;this.$('error').hidden=false;}
 setBusy(busy){this.busy=busy;this.$('progress-wrap').hidden=!busy;this.$('progress').value=0;for(const id of ['file','demo','audio','remove'])this.$(id).disabled=busy;if(busy)this.onStop();}
 changed(kind){this.onStop();this.render();this.onChange(kind);}
 setTempo(bpm){if(!Number.isFinite(bpm)||bpm<30||bpm>300)throw Error('BPM 需介於 30–300。');const notes=this.kind==='audio'?audioNotesToBeats(this.audioNotes,bpm,this.offset):this.notes;validateMelody(notes);this.notes=notes;this.bpm=bpm;this.fixed=true;this.changed('tempo');}
 importDemo(){this.notes=demoMelody();this.kind='demo';this.warning='';this.audioNotes=[];this.name='原創旋律 · 108 BPM';this.bpm=108;this.meter={numerator:4,denominator:4};this.key={root:0,mode:'major'};this.buffer=null;this.offset=0;this.fixed=true;this.mode='notes';this.changed('import');}
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
    next={kind:'midi',name:file.name,midi,notes:structuredClone(track.notes),meter:midi.meter,bpm:midi.tempoMap[0].bpm,key:midi.keyHint||inferKeys(track.notes).candidates[0],buffer:null,offset:0,fixed:false,warning:midi.warnings.join(' ')};
    this.$('track').replaceChildren();midi.tracks.forEach(t=>{const o=new Option(t.name+' · '+t.notes.length+' 音',t.id);o.disabled=!eligible.includes(t);this.$('track').add(o);});this.$('track').value=track.id;
   }else{
    this.decodeContext ||=new (window.AudioContext||window.webkitAudioContext)();let buffer;try{buffer=await this.decodeContext.decodeAudioData(bytes);}catch{throw Error('無法解碼，請改用 WAV 或 MP3。');}
    if(token!==this.token)return;if(buffer.duration>120||buffer.duration<.15)throw Error('請使用 0.15–120 秒音訊。');
    const ctx=new OfflineAudioContext(1,Math.ceil(buffer.duration*11025),11025),s=ctx.createBufferSource();s.buffer=buffer;s.connect(ctx.destination);s.start();const mono=await ctx.startRendering();if(token!==this.token)return;
    this.$('status').textContent='辨識音高與節拍中，檔案只留在瀏覽器…';const samples=mono.getChannelData(0).slice();
    const result=await new Promise((resolve,reject)=>{this.worker=new Worker(new URL('./analysis-worker.js?v=2.0.0-alpha.2',import.meta.url),{type:'module'});this.rejectWorker=reject;this.worker.onmessage=({data})=>{if(data.progress!==undefined)this.$('progress').value=data.progress;else if(data.error)reject(Error(data.error));else resolve(data.result);};this.worker.onerror=()=>reject(Error('音訊分析失敗，請重新整理後再試。'));this.worker.postMessage({samples,sampleRate:11025},[samples.buffer]);});
    if(token!==this.token)return;const notes=audioNotesToBeats(result.notes,result.tempo.bpm,result.offset);validateMelody(notes);
    next={kind:'audio',name:file.name,notes,audioNotes:result.notes,buffer,bpm:result.tempo.bpm,offset:result.offset,meter:{numerator:4,denominator:4},key:inferKeys(notes).candidates[0],fixed:true,warning:result.warnings.join(' ')};
   }
   if(token!==this.token)return;Object.assign(this,next,{mode:'notes'});this.changed('import');
  }catch(e){if(token===this.token){this.fail(e);this.$('status').textContent='匯入未完成，上一段旋律仍保留。';}}
  finally{if(token===this.token){this.worker?.terminate();this.worker=null;this.rejectWorker=null;this.setBusy(false);}}
 }
 commitNotes(notes){validateMelody(notes);this.notes=notes.sort((a,b)=>a.start-b.start);if(this.kind==='audio')this.audioNotes=this.notes.map(n=>({...n,start:n.start*60/this.bpm+this.offset,end:n.end*60/this.bpm+this.offset}));this.changed('edit');this.$('editor').close();}
 editNote(i){this.onStop();this.editing=i;const n=this.notes[i];this.$('pitch').value=n.pitch;this.$('start').value=f(n.start);this.$('duration').value=f(n.end-n.start);this.$('edit-error').textContent='';this.$('delete').disabled=this.notes.length<2;this.$('editor').showModal();}
 render(){
  this.$('work').hidden=!this.active;this.$('remove').hidden=!this.active;if(!this.active){this.$('status').textContent='已移除旋律，回到原本和弦工作流程。';return;}
  this.$('status').textContent=this.name+' · '+this.notes.length+' 個音 · '+Math.ceil(Math.max(...this.notes.map(n=>n.end))/barLength(this.meter))+' 小節';
  this.$('bpm').value=f(this.bpm);this.$('key').value=this.key.root;this.$('mode').value=this.key.mode;
  const m=this.meter.numerator+'/'+this.meter.denominator;if(![...this.$('meter').options].some(o=>o.value===m))this.$('meter').add(new Option(m,m));this.$('meter').value=m;
  const variable=this.kind==='midi'&&this.midi.tempoMap.length>1;this.$('fixed-wrap').hidden=!variable;this.$('fixed').checked=this.fixed;
  for(const id of ['bpm','half','double'])this.$(id).disabled=variable&&!this.fixed;
  this.$('track-wrap').hidden=this.kind!=='midi';this.$('offset-wrap').hidden=this.kind!=='audio';this.$('offset').value=f(this.offset);
  this.$('listen').querySelector('[value=original]').disabled=this.kind!=='audio';this.$('listen').value=this.mode;
  const keys=inferKeys(this.notes);this.$('analysis').textContent=keys.confidence+' · 調性建議 '+keys.candidates.slice(0,3).map(c=>c.label).join(' / ')+(variable&&!this.fixed?' · 保留 '+this.midi.tempoMap.length+' 段速度變化':this.kind==='audio'?' · BPM 可能半速／倍速；修改 BPM 不拉伸原音。':'');this.$('warning').textContent=this.warning||'';
  const table=this.$('notes');table.replaceChildren();this.notes.forEach((n,i)=>{const tr=document.createElement('tr');for(const v of [noteName(n.pitch),f(n.start),f(n.end-n.start),Math.round((n.confidence??1)*100)+'%']){const td=document.createElement('td');td.textContent=v;tr.append(td);}const td=document.createElement('td'),b=document.createElement('button');b.textContent='編輯';b.setAttribute('aria-label','編輯第 '+(i+1)+' 音 '+noteName(n.pitch));b.onclick=()=>this.editNote(i);td.append(b);tr.append(td);table.append(tr);});this.draw();
 }
 draw(accompaniment=[]){
  if(!this.active)return;const roll=this.$('roll'),notes=[...this.notes,...accompaniment];roll.replaceChildren();const end=Math.ceil(Math.max(...notes.map(n=>n.end))/barLength(this.meter))*barLength(this.meter),width=Math.max(800,end*26),height=210,low=Math.min(...notes.map(n=>n.pitch))-2,high=Math.max(...notes.map(n=>n.pitch))+2,row=175/(high-low+1),x=t=>36+t/end*(width-46),y=p=>25+(high-p)*row;
  roll.setAttribute('viewBox',`0 0 ${width} ${height}`);roll.style.width=width+'px';const svg=(tag,attrs)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);return el;};
  for(let p=low;p<=high;p++){const l=svg('line',{x1:36,x2:width,y1:y(p),y2:y(p),stroke:'#7e9cb6',opacity:.13});roll.append(l);if(p%12===0){const t=svg('text',{x:2,y:y(p)+4,fill:'#b9c9d5','font-size':10});t.textContent=noteName(p);roll.append(t);}}
  for(let b=0;b<end;b+=barLength(this.meter)){roll.append(svg('line',{x1:x(b),x2:x(b),y1:15,y2:height,stroke:'#a8bfd1',opacity:.25}));const t=svg('text',{x:x(b)+4,y:12,fill:'#b9c9d5','font-size':10});t.textContent='BAR '+(b/barLength(this.meter)+1);roll.append(t);}
  for(const[melody,events]of [[false,accompaniment],[true,this.notes]])events.forEach((n,i)=>{const r=svg('rect',{x:x(n.start),y:y(n.pitch),width:Math.max(2,x(n.end)-x(n.start)),height:Math.max(2,row*.7),rx:1,fill:melody?'#a3d7f3':'#c1a775',opacity:melody?1:.65});if(melody){r.style.cursor='pointer';r.onclick=()=>this.editNote(i);}roll.append(r);});
 }
}
