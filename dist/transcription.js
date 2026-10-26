import {estimateTempo,inferKeys} from './analysis.js?v=2.0.0-alpha.9';
// File labels are source metadata, never acoustic ground truth. Show their provenance.
export function sourceHints(name){
 const text=name.replace(/\.[^.]+$/,'');
 const bpmMatch=text.match(/(?:^|[_\s-])(\d{2,3})(?:\s?bpm)?(?=[_\s-]|$)/i);
 const bpm=bpmMatch&&+bpmMatch[1]>=40&&+bpmMatch[1]<=240?+bpmMatch[1]:null;
 const keyMatch=text.match(/(?:^|[_\s-])([A-G])([#b]?)(maj(?:or)?|min(?:or)?|m)(?=[_\s-]|$)/i);
 const roots={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
 const key=keyMatch?{root:(roots[keyMatch[1].toUpperCase()]+(keyMatch[2]==='#'?1:keyMatch[2]==='b'?-1:0)+12)%12,mode:/^maj/i.test(keyMatch[3])?'major':'minor'}:null;
 return {bpm,key};
}
// Decode one dominant melodic line, instead of treating vocal vibrato/harmonics as polyphony.
// Small pitch changes need sustained evidence; silence is a competing path.
export function decodeMelody(frames,onsets=[],{frameTime=i=>i*256/22050,minFrames=8}={}){
 let previous=[],costs=[];const rows=[],backs=[];
 for(let t=0;t<frames.length;t++){
  const row=frames[t],best=row.map((p,i)=>({pitch:i+21,p})).filter(n=>n.pitch>=36&&n.pitch<=96).sort((a,b)=>b.p-a.p).slice(0,6),peak=best[0]?.p||0;
  const states=[{pitch:null,p:Math.max(.001,1-peak)*.48},...best],next=[],back=[];
  states.forEach((n,i)=>{let score=Infinity,from=0;previous.forEach((p,j)=>{const d=n.pitch===null||p.pitch===null?0:Math.abs(n.pitch-p.pitch);const change=n.pitch===p.pitch?0:n.pitch===null||p.pitch===null?1.1:2.4+Math.min(2,d*.12);const value=costs[j]+change;if(value<score){score=value;from=j;}});next[i]=(t?score:0)-Math.log(Math.max(.001,n.p));back[i]=from;});
  const floor=Math.min(...next);costs=next.map(v=>v-floor);previous=states;rows.push(states);backs.push(back);
 }
 if(!rows.length)return [];
 let index=costs.indexOf(Math.min(...costs));const path=Array(rows.length);
 for(let t=rows.length-1;t>=0;t--){path[t]=rows[t][index];index=backs[t][index];}
 const runs=[];for(let i=0;i<path.length;i++){const p=path[i];if(runs.at(-1)?.pitch===p.pitch){runs.at(-1).endFrame=i+1;runs.at(-1).sum+=p.p;}else runs.push({pitch:p.pitch,startFrame:i,endFrame:i+1,sum:p.p});}
 // Bridge only brief dropouts of the same pitch; preserve actual rests and semitone notes.
 for(let i=1;i<runs.length-1;i++){const a=runs[i-1],r=runs[i],b=runs[i+1];if(r.endFrame-r.startFrame<minFrames&&a.pitch!==null&&a.pitch===b.pitch){a.endFrame=b.endFrame;a.sum+=r.sum+b.sum;runs.splice(i,2);i--;}}
 const articulated=[];
 for(const run of runs){
  if(run.pitch===null)continue;let start=run.startFrame;const p=run.pitch-21;
  for(let t=start+minFrames+2;t<run.endFrame-minFrames;t++){
   const onset=onsets[t]?.[p]||0,previous=frames.slice(Math.max(start,t-14),t).map(row=>row[p]);
   if(onset>.82&&onset>(onsets[t-1]?.[p]||0)&&onset>=(onsets[t+1]?.[p]||0)&&Math.min(...previous)<Math.max(...previous)*.84&&frames[t][p]-Math.min(...previous)>.08){
    const cut=t-2;articulated.push({...run,startFrame:start,endFrame:cut,sum:run.sum*(cut-start)/(run.endFrame-run.startFrame)});start=cut;t+=minFrames;
   }
  }
  articulated.push({...run,startFrame:start,sum:run.sum*(run.endFrame-start)/(run.endFrame-run.startFrame)});
 }
 return articulated.filter(r=>r.endFrame-r.startFrame>=minFrames).map(r=>({pitch:r.pitch,start:Math.max(0,frameTime(r.startFrame)),end:frameTime(r.endFrame),velocity:.7,confidence:Math.min(1,r.sum/(r.endFrame-r.startFrame))}));
}
export function transcriptionResult(notes,duration,name){
 if(!notes.length)throw Error('未辨識出穩定旋律；請換乾聲或使用旋律 MIDI。');
 const hints=sourceHints(name),tempo=estimateTempo(notes.map(n=>n.start)),keys=inferKeys(notes);
 const bpm=hints.bpm||tempo.bpm,key=hints.key||keys.candidates[0];
 // Labelled loops retain leading rests. An unlabelled phrase still needs beat-one review.
 const offset=hints.bpm?0:notes[0].start;
 return {notes,tempo:{...tempo,bpm},key,offset,hints,coverage:notes.reduce((s,n)=>s+n.end-n.start,0)/duration,
  reviewRequired:!hints.bpm||!hints.key,
  warnings:[hints.bpm?'速度採檔名 BPM 標記，保留開頭休止。':'速度由旋律起音估計；自由節奏人聲無法單靠起音唯一確定 BPM。',hints.key?'調性採檔名標記；音高仍由音訊辨識，不強制貼齊音階。':'調性是候選，請比較相對大小調並確認。','辨識主旋律，非多軌分離。先比較原音與辨識音符；顫音、滑音及殘響仍可能需要修正。']};
}
