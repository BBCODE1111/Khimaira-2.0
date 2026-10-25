import {MelodyWorkspace} from './melody-workspace.js?v=2.0.0-alpha.4';
import {MelodyPlayer} from './player.js?v=2.0.0-alpha.4';
import {harmonize} from './harmony.js?v=2.0.0-alpha.4';
import {barLength,normalizeChart,chartFromSegments,protectChart,renderProtected,rewriteWithMelody} from './fusion.js?v=2.0.0-alpha.4';
import {encodeAuditedMidi} from './export.js?v=2.0.0-alpha.4';
let melodyLab=null;const melodyPlayer=new MelodyPlayer();
const chartText=chart=>{const text=serialize(chart).replace(/:(\d+(?:\.\d+)?)/g,(_,v)=>':'+Number(Number(v).toFixed(6)));return barBeats()===4?text.replace(/:4(?=\s*\|)/g,''):text;};
const barBeats=()=>melodyLab?.active?barLength(melodyLab.meter):4;
import {arpModes,arpRates,arpPresets} from './arpeggiator.js?v=2.0.0-alpha.4';
import {examplePool,nextExample} from './example-pool.js?v=2.0.0-alpha.4';
import {BeatPlayer,validTempo,clampTempo} from './tempo-player.js?v=2.0.0-alpha.4';
import {insertCadence,invertChord,parallelColor} from './harmony-actions.js?v=2.0.0-alpha.4';
import {playbackSlice,spaceToggles} from './transport.js?v=2.0.0-alpha.4';
import {names,mod,parse,generate,approach,events,guitarShapes,scales,midiBytes,chordTones} from './music.js?v=2.0.0-alpha.4';
import {parseBar,parseChart,chordList,serialize,solve} from './solutions.js?v=2.0.0-alpha.4';
import {styles,mutate,library,styleLabels,cadenceTo} from './style-engine.js?v=2.0.0-alpha.4';
import {patterns,voicePlan} from './performance.js?v=2.0.0-alpha.4';
import {scaleNotes,scalePositions} from './scale-library.js?v=2.0.0-alpha.4';
import {guitarMelody,melodyShapes,melodyEvents} from './guitar-melody.js?v=2.0.0-alpha.4';
import {Piano} from './piano.js?v=2.0.0-alpha.4';
const $=id=>document.getElementById(id);let bars=parseChart('| C | Am | F | G |'),source=structuredClone(bars),selected=0,selectedChord=0,tab='scales',audio=null,timer=null,started=0,run=0,activeNodes=[];
let startBar=0,isPlaying=false,loading=false,player=null,playbackKind='score';
let variation=0,piano=null,scaleChoice='',lastScaleChord='',positionChoice=0,method='style',currentExampleId=null,melodySeed=0,arrangement=[],history=[];
const settings=['key','mode','tempo','style','pattern','freedom','density','voicing','rate','gate','swing','human','randomness','arpMode','arpRate','arpOctaves','arpPhase','arpAccent','arpSeed'];
for(const groupName of ['現代流行與和聲','黑暗／重型與另類','跨文化流行與舞曲','地域調式與器樂靈感']){const group=document.createElement('optgroup');group.label=groupName;Object.keys(styles).filter(s=>(styles[s].group||'現代流行與和聲')===groupName).forEach(s=>group.append(new Option(styleLabels[s]||s,s)));$('style').append(group);}const modalOption=new Option('調式 · 依樂風','modal');modalOption.disabled=true;$('mode').add(modalOption);Object.entries(patterns).filter(([id])=>id==='arp'||!id.startsWith('arp')).forEach(([id,label])=>$('pattern').add(new Option(label,id)));Object.entries(arpModes).forEach(([id,[label]])=>$('arpMode').add(new Option(label,id)));['4','8','8T','16','24','32'].forEach(id=>$('arpRate').add(new Option(arpRates[id].label,id)));$('arpMode').value='upDown';$('arpRate').value='16';$('pattern').value='ballad';
let statusTimer;const status=s=>{clearTimeout(statusTimer);$('status').textContent=s;statusTimer=setTimeout(()=>{$('status').textContent='';},6500);};
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
names.forEach((n,i)=>$('key').add(new Option(n,i)));
try{const old=JSON.parse(localStorage.getItem('khimaira-v2-fusion')||'null');if(old&&old.bars?.length<=128){bars=normalizeChart(old.bars.map(b=>({...b,chords:chordList(b)})),4);source=normalizeChart(old.source||structuredClone(bars),4);for(const id of settings)if(old[id]!=null)$(id).value=old[id];const legacyArp={arpUp:'up',arpDown:'down',arpBounce:'upDown',arpRandom:'random',arpOctave:'up'};if(legacyArp[old.pattern]){$('pattern').value='arp';$('arpMode').value=legacyArp[old.pattern];$('arpRate').value=String(4/Number(old.rate||.5));$('arpOctaves').value=old.pattern==='arpOctave'?'2':'1';}if(!$('pattern').value)$('pattern').value='ballad';}}catch{}
function save(){try{localStorage.setItem('khimaira-v2-fusion',JSON.stringify({bars,source,...Object.fromEntries(settings.map(id=>[id,$(id).value]))}));}catch{status('無法儲存於瀏覽器。');}}
function checkpoint(){history.push(structuredClone(bars));if(history.length>30)history.shift();}
function invalidateMelody(){arrangement=[];$('melodyGrid').replaceChildren();$('melodyNote').textContent='和弦已更新，按 Generate 產生這組進行的頂聲部按法。';}
function selectedSymbol(){return chordList(bars[selected]||{})[selectedChord]?.symbol||'';}
function select(i,j=0){selected=i;selectedChord=j;document.querySelectorAll('.chord-event').forEach(el=>el.classList.toggle('chosen',+el.dataset.bar===i&&+el.dataset.chord===j));if($('selectedTarget'))$('selectedTarget').textContent='BAR '+(i+1)+' · '+selectedSymbol();reference();}
function syncInput(){$('chartInput').value=chartText(source);if(!Array.from($('length').options).some(o=>+o.value===bars.length))$('length').add(new Option(String(bars.length),bars.length));$('length').value=bars.length;$('sourceLine').textContent=chartText(source);}
function render(){if(melodyLab?.active){const count=Math.ceil(Math.max(...melodyLab.notes.map(n=>n.end))/barBeats());bars=Array.from({length:count},(_,i)=>bars[i]||{chords:[]});const protectedScore=protectChart(bars,melodyLab.notes,{meter:melodyLab.meter,key:melodyLab.key,policy:melodyLab.policy,style:$('style').value,seed:variation});bars=protectedScore.bars;melodyLab.protectedCount=protectedScore.changed;selected=Math.min(selected,bars.length-1);selectedChord=Math.min(selectedChord,Math.max(0,(bars[selected]?.chords.length||1)-1));}startBar=Math.min(startBar,bars.length-1);invalidateMelody();const grid=$('grid');grid.replaceChildren();bars.forEach((b,i)=>{const list=chordList(b);const el=document.createElement('div');el.className='bar';el.dataset.index=i;el.innerHTML=`<div class="bar-number"><button class="bar-cue" aria-label="從第 ${i+1} 小節開始" aria-pressed="${i===startBar}">BAR ${String(i+1).padStart(2,'0')}</button><span>${melodyLab?.active?melodyLab.meter.numerator+'/'+melodyLab.meter.denominator:'4/4'}</span></div><div class="beat-ruler">${Array.from({length:Math.ceil(barBeats())},(_,i)=>'<span>'+(i+1)+'</span>').join('')}</div><div class="chord-lane"></div><input class="bar-edit" aria-label="第 ${i+1} 小節和弦" placeholder="C:2 Dm7:1 G7:1" value="${safe(list.map(c=>c.symbol+':'+Number(c.beats.toFixed(6))).join(' '))}"><div class="function">${safe(b.reason||'自由編輯')}</div>`;let beat=0;list.forEach((c,j)=>{const btn=document.createElement('button');btn.className='chord-event'+(selected===i&&selectedChord===j?' chosen':'');btn.dataset.bar=i;btn.dataset.chord=j;btn.style.width=(c.beats/barBeats()*100)+'%';btn.style.setProperty('--chord-size',(c.beats<=1&&c.symbol.length>6?12:c.beats<=1&&c.symbol.length>4?15:c.beats<=1?19:c.symbol.length>8?18:25)+'px');btn.innerHTML=`<strong>${safe(c.symbol)}</strong><small>${Number(c.beats.toFixed(3))} 拍</small>`;btn.title=c.symbol+' · 第 '+Number((beat+1).toFixed(3))+' 拍';btn.onfocus=()=>select(i,j);btn.onclick=()=>{select(i,j);openEditor();};el.querySelector('.chord-lane').append(btn);beat+=c.beats;});el.querySelector('.bar-cue').onclick=()=>cueBar(i);el.onclick=e=>{if(!e.target.closest('button,input'))cueBar(i);};const input=el.querySelector('input');const commit=()=>{try{const chords=parseBar(input.value,barBeats());checkpoint();stop();bars[i]={chords,reason:'手動編輯'};source=structuredClone(bars);save();syncInput();render();status('已將編輯後的進行設為新的原始進行。');}catch(e){input.setAttribute('aria-invalid','true');status(e.message);}};input.onchange=commit;input.onkeydown=e=>{if(e.key==='Enter')input.blur();};grid.append(el);});updateCue();select(selected,selectedChord);syncArp();refreshMelody();}
function pitchLabel(symbol,note){const c=parse(symbol),i=c.intervals.findIndex(n=>mod(c.root+n)===mod(note));return (i<0?names[mod(note)]:chordTones(symbol)[i])+(Math.floor(note/12)-1);}
function diagram(frets){const positive=frets.filter(x=>x>0);const start=Math.max(1,positive.length?Math.min(...positive):1);let s=`<svg viewBox="0 0 260 150" role="img" aria-label="由低音弦至高音弦 ${frets.join(' ')}"><text x="8" y="49" fill="#52604d" font-size="12">${start}fr</text>`;for(let i=0;i<6;i++){const x=48+i*34;s+=`<line x1="${x}" y1="32" x2="${x}" y2="132" stroke="#8b9785"/><text x="${x}" y="20" text-anchor="middle" fill="#30402c" font-size="12">${frets[i]<0?'×':frets[i]===0?'○':''}</text>`;if(frets[i]>0)s+=`<circle cx="${x}" cy="${44+(frets[i]-start)*25}" r="9" fill="#66503c"/>`;}for(let f=0;f<5;f++)s+=`<line x1="48" y1="${32+25*f}" x2="218" y2="${32+25*f}" stroke="#8b9785"/>`;return s+'</svg>';}
function scaleGraphic(scale,start,root){let s=`<svg viewBox="0 0 620 245" role="img" aria-label="${safe(scale.name)} 第 ${start} 至 ${start+4} 格六線指板"><text x="20" y="24" fill="#53634b" font-size="13">POSITION ${start}–${start+4} · 紅點 = 根音</text>`;for(let f=0;f<6;f++)s+=`<line x1="${75+f*100}" y1="55" x2="${75+f*100}" y2="205" stroke="#c4ccbd"/>`;[64,59,55,50,45,40].forEach((t,i)=>{let y=55+i*30;s+=`<text x="34" y="${y+5}" fill="#44513d" font-size="15">${['e','B','G','D','A','E'][i]}</text><line x1="75" y1="${y}" x2="575" y2="${y}" stroke="#6b7960" stroke-width="${1+i*.15}"/>`;for(let f=0;f<5;f++){const pitch=mod(t+start+f);if(scale.pcs.includes(pitch))s+=`<circle cx="${125+f*100}" cy="${y}" r="12" fill="${pitch===root?'#af573f':'#66503c'}"/><text x="${125+f*100}" y="${y+4}" text-anchor="middle" fill="white" font-size="12">${start+f}</text>`;}});for(let f=0;f<5;f++)s+=`<text x="${125+f*100}" y="235" text-anchor="middle" fill="#67735f" font-size="12">${start+f}</text>`;return s+'</svg>';}
function scaleTabGraphic(scale,start){const notes=[];[40,45,50,55,59,64].forEach((t,i)=>{for(let f=start;f<start+5;f++)if(scale.pcs.includes(mod(t+f)))notes.push({string:5-i,fret:f});});const width=70+notes.length*32;let s=`<svg viewBox="0 0 ${width} 170" role="img" aria-label="${safe(scale.name)} 把位上行練習六線譜">`;for(let i=0;i<6;i++)s+=`<text x="12" y="${34+i*24}" fill="#44513d" font-size="14">${['e','B','G','D','A','E'][i]}</text><line x1="40" y1="${30+i*24}" x2="${width-10}" y2="${30+i*24}" stroke="#8c9783"/>`;notes.forEach((n,i)=>{const x=58+i*32,y=30+n.string*24;s+=`<rect x="${x-11}" y="${y-10}" width="22" height="20" fill="#eee8dc"/><text x="${x}" y="${y+5}" fill="#43382b" text-anchor="middle" font-size="15" font-weight="600">${n.fret}</text>`;});return s+'</svg>';}
function reference(){const c=parse(selectedSymbol());$('chordName').textContent=c?c.symbol:'—';$('tones').textContent=c?chordTones(c.symbol).join(' · ')+' / BAR '+(selected+1):'點選任一和弦';$('reference').replaceChildren();if(!c)return;if(tab==='chords'){const full=guitarShapes(c.symbol);const shapes=full.length?full:melodyShapes(c.symbol).slice(0,3);if(!shapes.length)$('reference').textContent='目前無完整把位；可參考較簡單七和弦，或切換音階圖。';shapes.forEach((shape,i)=>{const d=document.createElement('div');d.className='diagram';d.innerHTML=`<div class="diagram-title">VOICING 0${i+1}</div>${diagram(shape.frets)}<div class="fret-label">${shape.frets.map(f=>f<0?'×':f).join('　')}</div>${shape.omitted?.length?'<p class="scale-note">省略音：'+shape.omitted.join(' · ')+'</p>':''}`;$('reference').append(d);});return;}const opts=scales(c.symbol,{style:$('style').value,key:+$('key').value});const context=c.symbol+'|'+$('style').value+'|'+$('key').value;if(lastScaleChord!==context){scaleChoice=styles[$('style').value].world?opts[0]?.name:opts.find(o=>o.level==='和弦相容')?.name||opts[0]?.name;lastScaleChord=context;}const chosen=opts.find(o=>o.name===scaleChoice)||opts[0];if(!chosen)return;const controls=document.createElement('div');controls.className='scale-selector';const select=document.createElement('select');select.setAttribute('aria-label','選擇吉他音階');opts.forEach(o=>select.add(new Option(o.name+' · '+o.level,o.name)));select.value=chosen.name;select.onchange=()=>{scaleChoice=select.value;reference();};const audition=document.createElement('button');audition.textContent='▶ 試聽音階';audition.onclick=()=>previewScale(chosen,c);controls.append(select,audition);$('reference').append(controls);const positions=scalePositions(chosen),pos=positions[positionChoice]||positions[0];const d=document.createElement('div');d.className='diagram scale-card';d.innerHTML=`<div class="diagram-title">${safe(chosen.name)}</div><div class="scale-notes">${scaleNotes(chosen).join(' · ')}</div><div class="scale-level">${safe(chosen.level)}</div><p class="scale-note">${safe(chosen.note)}${chosen.conflicts.length?' 不含目前和弦的 '+safe(chosen.conflicts.join('、'))+'；可當經過色彩，或調整和弦配置。':''}</p><div class="position-tabs">${positions.map((p,i)=>`<button data-position="${i}" class="${i===positionChoice?'active':''}">Pattern ${i+1} · ${p.start}–${p.end}</button>`).join('')}</div><p class="scale-note">五個重疊把位區域 · 依 CAGED 區域延伸；此圖標示音位，不指定每個手指。紅點＝音階根音。</p>${scaleGraphic(chosen,pos.start,chosen.root)}<div class="tab-caption">Pattern ${pos.index} · 第 ${pos.start}–${pos.end} 格 · 上行練習</div><div class="tab-scroll">${scaleTabGraphic(chosen,pos.start)}</div>`;$('reference').append(d);d.querySelectorAll('[data-position]').forEach(btn=>btn.onclick=()=>{positionChoice=+btn.dataset.position;reference();});}

function config(){return {key:+$('key').value,mode:$('mode').value,style:$('style').value,freedom:$('freedom').value,density:+$('density').value,seed:variation,randomness:$('randomness').value,method,loop:$('loop').checked};}
function performanceOptions(){return {barBeats:barBeats(),policy:melodyLab?.policy||'strict',bpm:melodyLab?.bpm||+$('tempo').value,voicing:$('voicing').value,rate:+$('rate').value,gate:+$('gate').value/100,swing:+$('swing').value/100,human:+$('human').value/100,seed:42,arpMode:$('arpMode').value,arpRate:$('arpRate').value,arpOctaves:+$('arpOctaves').value,arpPhase:$('arpPhase').value,arpAccent:$('arpAccent').value,arpSeed:+$('arpSeed').value};}

function syncArp(){
 refreshMelody();
 const enabled=$('pattern').value==='arp';$('arpPanel').hidden=!enabled;if(!enabled)return;
 const opts=performanceOptions(),rate=arpRates[opts.arpRate]||arpRates['16'];
 $('arpHint').textContent=(arpModes[opts.arpMode]||arpModes.upDown)[1]+' 每小節 '+Math.round(barBeats()/rate.step)+' 步。'+(rate.triplet?'三連音保持等距，不套用 SWING。':'');
 const notes=(melodyLab?.active?renderProtected(bars,'arp',opts,melodyLab.notes).notes:events(bars,'arp',opts)).filter(n=>n.beat<barBeats()),pitches=notes.map(n=>n.note);
 if(!notes.length){$('arpPreview').textContent='先載入和弦，即可預覽音序。';return;}
 const low=Math.min(...pitches),high=Math.max(low+12,...pitches),y=n=>54-(n-low)/(high-low)*42;
 $('arpPreview').innerHTML='<svg viewBox="0 0 640 76" role="img" aria-label="第一小節分解音序預覽，橫向為拍點，縱向為音高">'+[0,1,2,3,4].map(b=>`<line x1="${12+b*154}" x2="${12+b*154}" y1="5" y2="59" stroke="currentColor" opacity=".2"/><text x="${12+b*154}" y="73" fill="currentColor" font-size="10">${b<4?b+1:''}</text>`).join('')+notes.map(n=>`<rect x="${12+n.beat*154}" y="${y(n.note)}" width="${Math.max(2,n.duration*154-1)}" height="3" rx="1" fill="currentColor"/>`).join('')+'</svg>';
}
document.querySelectorAll('[data-arp-preset]').forEach(button=>button.onclick=()=>{
 const resume=isPlaying,preset=arpPresets[button.dataset.arpPreset];stop();$('pattern').value='arp';
 for(const [id,value] of Object.entries(preset))if($(id))$(id).value=value;
 syncArp();save();status(preset.description+'。按 PLAY 試聽，MIDI 匯出相同音序。');if(resume)play();
});
$('arpVariate').onclick=()=>{const resume=isPlaying;stop();$('arpSeed').value=(Number($('arpSeed').value)+1)>>>0;syncArp();save();status(['random','walk'].includes($('arpMode').value)?'已換一組隨機音序；試聽和 MIDI 使用相同變體。':'VARIATE 用於 RANDOM / WALK；目前模式維持固定音序。');if(resume)play();};

function styleInfo(){const cfg=styles[$('style').value];$('styleNote').textContent=cfg.description+(melodyLab?.active?' · 旋律保護已啟用：不相容的和弦或延伸音會改配。':'');}
function syncStyleMode(){if(melodyLab?.active){$('mode').disabled=false;$('mode').value=melodyLab.key.mode;return;}const cfg=styles[$('style').value];$('mode').disabled=!!cfg.world;if(cfg.world)$('mode').value='modal';else if($('mode').value==='modal')$('mode').value='major';}
function syncMethod(){document.querySelectorAll('[data-solution]').forEach(b=>b.classList.toggle('active',b.dataset.solution===method));$('methodLabel').textContent=({original:'原始進行',style:'風格改寫',color:'延伸色彩',cadence:'ii–V 接近',tritone:'三全音代理'})[method]+' · 更多設定';}
function applyMutation(next=true){
 if(melodyLab?.reviewRequired){status('請先在旋律區確認辨識結果，再配和弦。');return;}
 checkpoint();stop();if(next)variation++;
 const before=serialize(bars),generate=()=>{const candidate=mutate(mutationSource(),config());return melodyLab?.active?(method==='original'?protectChart(candidate,melodyLab.notes,{meter:melodyLab.meter,key:melodyLab.key,policy:melodyLab.policy,style:$('style').value,seed:variation}).bars:rewriteWithMelody(candidate,melodyLab.notes,{meter:melodyLab.meter,key:melodyLab.key,policy:melodyLab.policy,style:$('style').value,seed:variation,previous:bars})):candidate;};
 let candidate=generate();for(let retry=0;method!=='original'&&serialize(candidate)===before&&retry<8;retry++){variation++;candidate=generate();}
 bars=candidate;selected=selectedChord=startBar=0;render();save();styleInfo();syncMethod();
 status(serialize(bars)===before?'目前條件下沒有另一組相容和弦；可修改旋律或換樂風再試。':(styleLabels[$('style').value]||$('style').value)+' · 變體 '+variation+' · 已更新上方和弦，旋律保持原樣。');
}
$('chartInput').addEventListener('input',()=>{$('seedMood').hidden=true;});
$('applyChart').onclick=()=>{if(melodyLab?.reviewRequired){status('請先確認旋律，再載入和弦。');return;}try{const parsed=parseChart($('chartInput').value,barBeats());checkpoint();stop();bars=parsed;source=structuredClone(bars);selected=selectedChord=startBar=0;variation=0;save();syncInput();render();status('LOAD 已載入輸入框的原譜；套用樂風請按 GENERATE。旋律不相容處會自動改配。');}catch(e){status(e.message);}};
function generateFromInput(chosenMethod){try{const text=$('chartInput').value.trim();if(text!==chartText(source)||source.length!==+$('length').value){const changed=text!==chartText(source),parsed=text?parseChart(text,barBeats()):[];const count=changed?Math.max(+$('length').value,parsed.length):+$('length').value;source=Array.from({length:count},(_,i)=>structuredClone(parsed[i]||{chords:[]}));variation=0;}method=chosenMethod;applyMutation();syncInput();$('chartInput').removeAttribute('aria-invalid');}catch(e){$('chartInput').setAttribute('aria-invalid','true');status(e.message);}}
$('generate').onclick=()=>generateFromInput(method==='original'?'style':method);
document.querySelectorAll('[data-solution]').forEach(btn=>btn.onclick=()=>generateFromInput(btn.dataset.solution));
$('undo').onclick=()=>{if(!history.length){status('目前沒有可還原的變更。');return;}stop();bars=history.pop();selected=selectedChord=startBar=0;save();render();status('已還原上一組和弦。');};
$('clear').onclick=()=>{$('seedMood').hidden=true;currentExampleId=null;checkpoint();stop();bars=bars.map(()=>({chords:[]}));source=structuredClone(bars);save();syncInput();render();};
$('useCurrent').onclick=()=>{source=structuredClone(bars);syncInput();save();status('目前的和聲已設為下一次改寫的起點。');};
$('length').onchange=()=>{status('小節數已設定；按生成套用，輸入中的和弦會保留。');};
for(const id of settings.filter(id=>id!=='tempo'))$(id).onchange=()=>{const resume=isPlaying&&['pattern','arpMode','arpRate','arpOctaves','arpPhase','arpAccent','gate','swing','human','voicing'].includes(id);stop();if(id==='style'){const cfg=styles[$('style').value];$('pattern').value=cfg.pattern;$('voicing').value=cfg.voicing;$('swing').value=id==='style'&&['Jazz','Major blues','Minor blues','Lo-fi hip-hop'].includes($('style').value)?16:0;}if(id==='style'){if(styles[$('style').value].defaultMode==='minor'||['Minor blues','Neoclassical rock','Dorian folk','Phrygian dominant'].includes($('style').value))$('mode').value='minor';else if($('style').value==='Major blues')$('mode').value='major';method='style';currentExampleId=null;populateLibrary();const bpm={House:118,Funk:104,'Lo-fi hip-hop':78,Chill:80,Ambient:66,EDM:124,'R&B':84,'Neo-soul':82,'Neoclassical rock':128,'Major blues':96,'Minor blues':88};if(!melodyLab?.active&&(bpm[$('style').value]||styles[$('style').value].tempo))$('tempo').value=styles[$('style').value].tempo||bpm[$('style').value];syncStyleMode();syncMethod();}if(['style','freedom','density','mode','key','randomness'].includes(id)){styleInfo();reference();status('方向已設定，按「GENERATE」套用到和弦譜。');}if(melodyLab?.active){if(id==='key'||id==='mode'){melodyLab.key={root:+$('key').value,mode:$('mode').value};melodyLab.keySource='manual';melodyLab.render();render();}else if(id==='style'){$('mode').value=melodyLab.key.mode;$('tempo').value=Number(melodyLab.bpm.toFixed(3));}refreshMelody();}else if(id==='style')applyTempo(true);syncArp();save();if(resume)play();};
$('styleGroove').onclick=()=>{stop();const cfg=styles[$('style').value];$('pattern').value=cfg.pattern;$('voicing').value=cfg.voicing;$('swing').value=['Jazz','Major blues','Minor blues','Lo-fi hip-hop'].includes($('style').value)?16:0;syncArp();save();status('已套用 '+$('style').value+' 的演奏與配置；MIDI 會使用同一組音符。');};
function currentPool(){return examplePool($('style').value);}
function populateLibrary(){const items=currentPool();$('library').replaceChildren();items.forEach(p=>$('library').add(new Option(p.title,p.id)));$('presetNote').textContent=items.length+' 組範例 · '+(styles[$('style').value].dark?'猛烈／陰鬱／詭異／莊嚴交錯輪替。':'明亮／憂鬱／夢幻／張力交錯輪替。');}
function loadSeed(p){if(!p)return;if(melodyLab?.reviewRequired){status('請先確認旋律，再載入和弦範例。');return;}const resume=isPlaying||loading;checkpoint();stop();currentExampleId=p.id;const transposeTo=+$('key').value;const raw=parseChart(p.chart);const n=+$('length').value;bars=Array.from({length:n},(_,i)=>{const b=structuredClone(raw[i%raw.length]);b.chords=b.chords.map(c=>{const x=parse(c.symbol);return {...c,symbol:names[mod(x.root+transposeTo)]+x.q+(c.symbol.includes('/')?'/'+names[mod(x.bass+transposeTo)]:'')};});b.reason=p.type==='song'?'歌曲短句 · 可改寫':'風格練習';return b;});source=structuredClone(bars);$('mode').value=melodyLab?.active?melodyLab.key.mode:p.mode;$('pattern').value=styles[$('style').value].pattern;$('voicing').value=p.open?'open':styles[$('style').value].voicing;$('gate').value=p.feel?.gate??82;$('human').value=p.feel?.human??45;variation=0;selected=selectedChord=startBar=0;save();syncInput();render();styleInfo();$('library').value=p.id;$('seedMood').textContent='靈感起點 · '+p.title;$('seedMood').hidden=false;$('presetNote').textContent=currentPool().length+' 組範例 · 可自由編輯；播放中按 INSPIRE 直接換組。';status('已載入 '+p.title+'；INSPIRE 換下一組，GENERATE 改寫。');if(resume)play();}
$('loadPreset').onclick=()=>loadSeed(currentPool().find(p=>p.id===$('library').value));
$('nextSong').onclick=()=>loadSeed(nextExample(currentPool(),currentExampleId));
$('voicingTab').onclick=()=>{tab='chords';$('voicingTab').classList.add('active');$('scaleTab').classList.remove('active');reference();};$('scaleTab').onclick=()=>{tab='scales';$('scaleTab').classList.add('active');$('voicingTab').classList.remove('active');reference();};
$('resolve').onclick=()=>{try{const result=insertCadence(bars,selected,selectedChord,{loop:$('loop').checked});checkpoint();stop();bars=result.bars;save();render();status('已插入 ii–V，解決到 '+result.target+'；目標和弦與其他小節保持原樣。');}catch(e){status(e.message);}};
function editHarmony(transform,message){try{const symbol=transform(selectedSymbol());checkpoint();stop();bars[selected].chords[selectedChord].symbol=symbol;save();render();status(message);}catch(e){status(e.message);}}
$('invert').onclick=()=>editHarmony(invertChord,'已使用和弦內音轉位；延伸音不作傳統轉位低音。');
$('borrow').onclick=()=>editHarmony(parallelColor,'已切換平行大小調色彩，保留延伸音設定及仍相容的低音。這是手動借用，可 UNDO。');
const qualities=[['','Major · 大三和弦'],['m','Minor · 小三和弦'],['5','Power · 五度和弦'],['dim','Diminished · 減三'],['aug','Augmented · 增三'],['sus2','Sus2'],['sus4','Sus4'],['6','Major 6'],['m6','Minor 6'],['maj7','Major 7'],['m7','Minor 7'],['7','Dominant 7'],['dim7','Diminished 7'],['m7b5','Half diminished'],['mMaj7','Minor major 7'],['maj9','Major 9'],['m9','Minor 9'],['9','Dominant 9'],['69','6/9'],['add9','Add9'],['madd9','Minor add9'],['11','Dominant 11'],['m11','Minor 11'],['maj11','Major 11'],['13','Dominant 13'],['m13','Minor 13'],['maj13','Major 13'],['7alt','Altered dominant'],['7sus4','7sus4']];
names.forEach((n,i)=>{$('editRoot').add(new Option(n,i));$('editBass').add(new Option(n,i));});qualities.forEach(([v,n])=>$('editQuality').add(new Option(n,v)));
function editorSymbol(){const ext=['edit9','edit11','edit13','edit5'].map(id=>$(id).value).filter(Boolean);return names[+$('editRoot').value]+$('editQuality').value+(ext.length?'('+ext.join(',')+')':'')+($('editBass').value===''?'':'/'+names[+$('editBass').value]);}
function editorPreview(){const symbol=editorSymbol(),c=parse(symbol);$('editorPreview').innerHTML=safe(symbol)+'<small>'+safe(c?chordTones(symbol).join(' · '):'此組合無法辨識')+'</small>';$('editorApply').disabled=!c;}
function openEditor(){const c=parse(selectedSymbol());if(!c)return;$('editorTitle').textContent='BAR '+(selected+1)+' · '+c.symbol;$('editRoot').value=c.root;$('editBass').value=c.bass===c.root?'':c.bass;['edit9','edit11','edit13','edit5'].forEach(id=>$(id).value='');let q=c.q;const m=q.match(/^([^()]*)\((.*)\)$/);if(m){q=m[1];m[2].split(',').forEach(t=>{const id=t.includes('9')?'edit9':t.includes('11')?'edit11':t.includes('13')?'edit13':'edit5';$(id).value=t;});}if(!qualities.some(([v])=>v===q)&&!Array.from($('editQuality').options).some(o=>o.value===q))$('editQuality').add(new Option(q,q));$('editQuality').value=q;$('editorSplit').disabled=bars[selected].chords.length>=4||bars[selected].chords[selectedChord].beats<1;editorPreview();$('chordEditor').showModal();}
['editRoot','editQuality','editBass','edit9','edit11','edit13','edit5'].forEach(id=>$(id).onchange=editorPreview);$('editChord').onclick=openEditor;
$('editorApply').onclick=()=>{const symbol=editorSymbol();if(!parse(symbol))return;checkpoint();stop();bars[selected].chords[selectedChord].symbol=symbol;bars[selected].reason='手動選擇和弦與延伸音';$('chordEditor').close();save();render();status('已套用 '+selectedSymbol()+(symbol!==selectedSymbol()?'（依旋律改配，原選 '+symbol+'）':'')+'。');};
$('editorSplit').onclick=()=>{const c=bars[selected].chords[selectedChord];if(c.beats<1||bars[selected].chords.length>=4)return;checkpoint();stop();bars[selected].chords.splice(selectedChord,1,{...c,beats:c.beats/2},{...c,beats:c.beats/2});$('chordEditor').close();save();render();};
$('editorDelete').onclick=()=>{checkpoint();stop();const list=bars[selected].chords,removed=list.splice(selectedChord,1)[0];if(list.length)list[Math.max(0,selectedChord-1)].beats+=removed.beats;selectedChord=Math.max(0,selectedChord-1);$('chordEditor').close();save();render();};
$('melodyGenerate').onclick=()=>{stop();const [minFret,maxFret]=$('melodyRegion').value.split(',').map(Number);arrangement=guitarMelody(bars,{seed:++melodySeed,minFret,maxFret});$('melodyGrid').innerHTML=arrangement.map(s=>{const v=s.shape;return `<div class="melody-card ${v?'':'missing'}"><div class="melody-top">BAR ${Math.floor(s.beat/4)+1} · 拍 ${s.beat%4+1} · ${s.beats} 拍</div><h3>${safe(s.symbol)}</h3>${v?`<div class="melody-top">MELODY ${pitchLabel(s.symbol,v.top)}</div>${diagram(v.frets)}<div class="melody-frets">${v.frets.map(f=>f<0?'×':f).join(' ')}</div><p>${v.omitted.length?'省略音 '+v.omitted.join(' · '):'完整和弦音'} · 最高音帶旋律</p>`:'<p>這個區域沒有符合跨度與低音條件的按法。可改選全指板或簡化延伸音。</p>'}</div>`;}).join('');const missing=arrangement.filter(s=>!s.shape).length;$('melodyNote').textContent=missing?'有 '+missing+' 個和弦沒有合適按法；請放寬把位或編輯和弦後再生成。':'第 '+melodySeed+' 組 · 四音和弦、至多跨四格 · 圖示由低 E 到高 e；× 弦需悶音，請依手掌調整指法。';};
async function previewArrangement(){if(!arrangement.length){status('請先 Generate chord melody。');return;}await startPerformance(playbackSlice(melodyEvents(arrangement),startBar,bars.length),{label:'吉他按法與頂聲部',kind:'melody'});}
$('melodyPlay').onclick=previewArrangement;
$('melodyMidi').onclick=()=>{if(!arrangement.length||arrangement.some(s=>!s.shape)){status('請先生成所有和弦都有按法的一組 chord melody。');return;}downloadNotes(melodyEvents(arrangement),'chord-melody');};
function updateCue(){
 $('startPoint').textContent='FROM BAR '+(startBar+1);
 document.querySelectorAll('.bar-cue').forEach((el,i)=>el.setAttribute('aria-pressed',String(i===startBar)));
 if(!isPlaying&&!loading)$('position').textContent='READY · BAR '+(startBar+1);
}
function cueBar(i){const resume=isPlaying||loading;stop();startBar=i;select(i);updateCue();if(resume)play();else status('將從第 '+(i+1)+' 小節開始。按 PLAY 或空白鍵播放。');}
function stop({natural=false}={}){melodyPlayer.stop();run++;isPlaying=false;loading=false;clearTimeout(timer);timer=null;if(player){player.stop({natural});player=null;}else if(!natural)piano?.stop();$('play').textContent='PLAY';$('play').setAttribute('aria-pressed','false');updateCue();document.querySelectorAll('.playing,.sounding').forEach(el=>el.classList.remove('playing','sounding'));}
let appliedTempo=clampTempo($('tempo').value);$('tempo').value=appliedTempo;
function updateTempoHint(){
 if(melodyLab?.active){$('tempoHint').textContent='與旋律同步 · '+(melodyLab.kind==='audio'?'BPM 修正只改拍格，不拉伸原音。':melodyLab.tempoMap.length>1?'保留 MIDI 速度變化；請在旋律區切換固定 BPM。':'使用旋律速度；更改後重新從選定小節播放。');return;}
 $('tempoHint').textContent=`每拍 ${(60/appliedTempo).toFixed(2)} 秒 · 4/4 每小節 ${(240/appliedTempo).toFixed(2)} 秒。播放中可直接變速。`;
}
function applyTempo(commit=false){
 if(melodyLab?.active){if(commit&&Math.abs(Number($('tempo').value)-melodyLab.bpm)>.001){try{melodyLab.setTempo(Number($('tempo').value));}catch(e){$('tempo').value=Number(melodyLab.bpm.toFixed(3));status(e.message);}}return;}
 let value=Number($('tempo').value);
 if(!validTempo(value)){if(!commit)return;value=$('tempo').value.trim()&&Number.isFinite(value)?Math.max(30,Math.min(260,value)):appliedTempo;$('tempo').value=value;}
 appliedTempo=value;player?.setTempo(value);updateTempoHint();save();
}
$('tempo').oninput=()=>applyTempo();$('tempo').onchange=()=>applyTempo(true);$('tempo').onblur=()=>applyTempo(true);
$('tempo').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();applyTempo(true);$('tempo').blur();}};
async function previewScale(scale,c){
 const root=scale.root??c.root,offsets=scale.pcs.map(pc=>mod(pc-root)).sort((a,b)=>a-b);
 const notes=[...offsets,12].map((n,i)=>({note:60+root+n,beat:i*.5,duration:.42,velocity:.65}));
 await startPerformance({notes,beats:notes.length*.5,startBar:0},{label:scale.name+' · 上行試聽',kind:'scale'});
}
async function play(){if(melodyLab?.active){await playWithMelody();return;}await startPerformance(playbackSlice(events(bars,$('pattern').value,performanceOptions()),startBar,bars.length),{label:patterns[$('pattern').value],kind:'score'});}
async function startPerformance(clip,{label,kind}){
 stop();applyTempo(true);if(!clip.notes.length){status('起播點後沒有音符，請選擇其他小節或生成和弦。');return;}
 const token=run;loading=true;playbackKind=kind;$('position').textContent='LOADING PIANO';
 try{piano ||=new Piano;await piano.load();if(token!==run)return;}
 catch{if(token===run){stop();status('鋼琴採樣載入失敗，請重試。MIDI 匯出仍可使用。');}return;}
 loading=false;isPlaying=true;$('play').setAttribute('aria-pressed','true');
 player=new BeatPlayer(piano,clip.notes,clip.beats,{bpm:appliedTempo,loop:kind!=='scale'&&$('loop').checked});
 let lastVisible=-1;
 function tick(){
  if(token!==run)return;if(!player.pump()){stop({natural:true});return;}
  const localBeat=Math.max(0,player.beatAt())%clip.beats,beat=clip.startBar*4+localBeat,idx=Math.min(bars.length-1,Math.floor(beat/4)),within=beat%4;
  if(kind!=='scale'){
   document.querySelectorAll('.bar').forEach((el,j)=>{el.classList.toggle('playing',j===idx);if(j===idx&&idx!==lastVisible){const grid=$('grid');if(el.offsetLeft<grid.scrollLeft||el.offsetLeft+el.offsetWidth>grid.scrollLeft+grid.clientWidth)grid.scrollTo({left:el.offsetLeft-grid.offsetLeft,behavior:'instant'});}});lastVisible=idx;
   document.querySelectorAll('.chord-event').forEach(el=>{let at=0;const cs=chordList(bars[+el.dataset.bar]);for(let j=0;j<+el.dataset.chord;j++)at+=cs[j].beats;el.classList.toggle('sounding',+el.dataset.bar===idx&&within>=at&&within<at+cs[+el.dataset.chord].beats);});
  }
  $('position').textContent=(kind==='scale'?'SCALE':`BAR ${idx+1} / ${bars.length}`)+` · BEAT ${Math.floor(within)+1} · ${player.bpm} BPM`;
  $('position').dataset.beat=beat.toFixed(3);timer=setTimeout(tick,25);
 }
 tick();status((kind==='scale'?'':('從 BAR '+(clip.startBar+1)+' 試聽 · '))+label);
}
function togglePlayback(){if(isPlaying||loading)stop();else play();}
$('play').onclick=togglePlayback;$('stop').onclick=stop;
$('loopButton').onclick=()=>{$('loop').checked=!$('loop').checked;$('loopButton').setAttribute('aria-pressed',String($('loop').checked));if(melodyLab?.active)melodyPlayer.setLoop($('loop').checked);else if(playbackKind!=='scale')player?.setLoop($('loop').checked);};
document.addEventListener('keydown',e=>{if(spaceToggles(e)&&!$('chordEditor').open&&!document.querySelector('#ml-editor[open]')){e.preventDefault();togglePlayback();}});
$('dockMidi').onclick=()=>exportMidi();
let downloadURL=null;function downloadNotes(notes,suffix){if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(new Blob([midiBytes(notes,bars.length*4)],{type:'audio/midi'}));const a=document.createElement('a');a.href=downloadURL;a.download='KHIMAIRA-'+suffix+'.mid';a.click();status('已下載 '+suffix+' MIDI。');}
function exportMidi(sustained=false){if(melodyLab?.active){exportWithMelody(sustained);return;}const notes=events(bars,sustained?'sustain':$('pattern').value,performanceOptions());if(!notes.length){status('尚無可匯出的音符。');return;}if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(new Blob([midiBytes(notes,bars.length*4)],{type:'audio/midi'}));const a=document.createElement('a');a.href=downloadURL;a.download='KHIMAIRA-'+names[+$('key').value]+'-'+bars.length+'bars-'+(sustained?'sustain':$('pattern').value==='arp'?'arp-'+$('arpMode').value+'-'+$('arpRate').value+'-'+$('arpOctaves').value+'oct':$('pattern').value)+'.mid';a.click();status(sustained?'已匯出原樣長音：音符準確填滿每個和弦拍數。':'已匯出目前演奏：音序、音長、力度與試聽使用同一組資料。');}
$('midi').onclick=()=>exportMidi();$('midiSustain').onclick=()=>exportMidi(true);

function mutationSource(){
 const cleaned=source.map(b=>({...b,chords:chordList(b).filter(c=>parse(c.symbol))}));
 return melodyLab?.active?normalizeChart(cleaned,4):cleaned;
}
function refreshMelody(){
 if(!melodyLab?.active)return;
 const result=renderProtected(bars,$('pattern').value,performanceOptions(),melodyLab.notes);
 melodyLab.draw(result.accompaniment);
 const repaired=melodyLab.protectedCount||0;if(melodyLab.reviewRequired){melodyLab.$('audit').textContent='等待確認旋律 · 尚未產生伴奏';$('length').disabled=true;return;}
 melodyLab.$('audit').textContent=(melodyLab.policy==='musical'?'流暢配和 · 0 個半音／三全音衝突 · ':'嚴格配和 · 0 個衝突 · ')+result.notes.length+' 個伴奏音'+(repaired?' · '+repaired+' 段依旋律改配':'')+(result.adjusted?' · '+result.adjusted+' 個演奏音已改配，保留節奏':'')+(result.removed?' · '+result.removed+' 個無相容音的演奏位置留白':'');
 $('length').disabled=true;
}
function importMelodyChange(kind){
 if(!melodyLab.active){$('length').disabled=false;$('tempo').disabled=false;bars=normalizeChart(bars,4);source=normalizeChart(source,4);syncStyleMode();syncInput();render();updateTempoHint();styleInfo();return;}
 $('key').value=melodyLab.key.root;$('mode').value=melodyLab.key.mode;$('mode').disabled=false;$('tempo').value=Number(melodyLab.bpm.toFixed(3));
 $('tempo').disabled=melodyLab.tempoMap.length>1;
 if(melodyLab.reviewRequired){bars=Array.from({length:Math.ceil(Math.max(...melodyLab.notes.map(n=>n.end))/barBeats())},()=>({chords:[]}));source=structuredClone(bars);}
 else if(kind==='import'||kind==='meter'){
  checkpoint();const result=harmonize(melodyLab.notes,{key:melodyLab.key,beatsPerBar:barBeats(),policy:melodyLab.policy,style:'basic'});
  bars=chartFromSegments(result.segments,barBeats(),result.totalBeats);source=structuredClone(bars);selected=selectedChord=startBar=0;
 }
 if((kind==='tempo'&&melodyLab.kind==='audio')||kind==='edit'){
  const count=Math.ceil(Math.max(...melodyLab.notes.map(n=>n.end))/barBeats());
  bars=Array.from({length:count},(_,i)=>structuredClone(bars[i]||bars.at(-1)||{chords:[]}));source=structuredClone(bars);
 }
 syncInput();render();updateTempoHint();styleInfo();save();status('旋律已同步。原本的樂風、GENERATE、和弦編輯與 ARP 都可繼續使用。');
}
async function playWithMelody(){
 stop();const token=run;loading=true;$('position').textContent='LOADING PIANO';
 try{
  const result=renderProtected(bars,$('pattern').value,performanceOptions(),melodyLab.notes);
  const started=await melodyPlayer.play({melody:melodyLab.notes,accompaniment:result.accompaniment,tempoMap:melodyLab.tempoMap,totalBeats:bars.length*barBeats(),sourceBuffer:melodyLab.buffer,offset:melodyLab.offset,mode:melodyLab.mode,instrument:melodyLab.instrument,melodyGain:melodyLab.mix.melody,harmonyGain:melodyLab.mix.harmony,startBeat:startBar*barBeats(),loop:$('loop').checked,
   onTick:beat=>{const idx=Math.min(bars.length-1,Math.floor(beat/barBeats())),within=beat%barBeats();$('position').textContent='BAR '+(idx+1)+' / '+bars.length+' · BEAT '+(Math.floor(within)+1);$('position').dataset.beat=beat.toFixed(3);document.querySelectorAll('.bar').forEach((el,i)=>el.classList.toggle('playing',i===idx));document.querySelectorAll('.chord-event').forEach(el=>{let at=0;const list=chordList(bars[+el.dataset.bar]);for(let j=0;j<+el.dataset.chord;j++)at+=list[j].beats;el.classList.toggle('sounding',+el.dataset.bar===idx&&within>=at&&within<at+(list[+el.dataset.chord]?.beats||0));});},
   onStop:()=>{isPlaying=false;loading=false;$('play').textContent='PLAY';$('play').setAttribute('aria-pressed','false');document.querySelectorAll('.playing,.sounding').forEach(el=>el.classList.remove('playing','sounding'));updateCue();}});
  if(!started||token!==run)return;loading=false;isPlaying=true;$('play').textContent='STOP';$('play').setAttribute('aria-pressed','true');status('原版鋼琴 · 旋律 '+Math.round(melodyLab.mix.melody*100)+'% / 和聲 '+Math.round(melodyLab.mix.harmony*100)+'%');
 }catch(e){stop();status('試聽未完成：'+e.message);}
}
function exportWithMelody(sustained){
 try{const result=renderProtected(bars,sustained?'sustain':$('pattern').value,performanceOptions(),melodyLab.notes);
 const bytes=encodeAuditedMidi({melody:melodyLab.notes,accompaniment:result.accompaniment,policy:melodyLab.policy,tempoMap:melodyLab.tempoMap,meter:melodyLab.meter});
 if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(new Blob([bytes],{type:'audio/midi'}));const a=document.createElement('a');a.href=downloadURL;a.download='KHIMAIRA-2-'+(sustained?'sustain':$('pattern').value)+'-melody.mid';a.click();status('已匯出旋律＋和聲分軌 MIDI，保留速度圖與拍號。');
 }catch(e){status(e.message);}
}
melodyLab=new MelodyWorkspace($('melodyWorkspace'),{onChange:importMelodyChange,onStop:()=>stop(),onMix:restart=>{if(restart){const playing=isPlaying;stop();if(playing)play();}else melodyPlayer.setMix(melodyLab.mix.melody,melodyLab.mix.harmony);}});
window.addEventListener('pagehide',()=>{stop();melodyLab.worker?.terminate();});

updateTempoHint();syncStyleMode();syncMethod();populateLibrary();styleInfo();syncInput();render();
