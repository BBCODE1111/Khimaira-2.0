import {validateMelody} from './harmony.js?v=2.0.0-alpha.9';
import {parse} from './music.js?v=2.0.0-alpha.9';
export function validateProject(data){
 if(data?.format!=='khimaira-project'||data.version!==1)throw Error('Unsupported project format.');
 if(!Array.isArray(data.bars)||!data.bars.length||data.bars.length>512)throw Error('Invalid chart length.');
 const m=data.melody;
 if(m){
  if(!Array.isArray(m.notes))throw Error('Invalid melody.');if(m.notes.length)validateMelody(m.notes);
  if(!Number.isFinite(m.bpm)||m.bpm<30||m.bpm>300||!Number.isInteger(m.key?.root)||m.key.root<0||m.key.root>11||!['major','minor'].includes(m.key.mode))throw Error('Invalid tempo or key.');
  if(!Number.isInteger(m.meter?.numerator)||m.meter.numerator<1||m.meter.numerator>32||![1,2,4,8,16,32].includes(m.meter.denominator))throw Error('Invalid meter.');
  if(!['strict','musical'].includes(m.policy)||!['warm','keys','sine'].includes(m.instrument)||!['melody','harmony'].every(k=>Number.isFinite(m.mix?.[k])&&m.mix[k]>=0&&m.mix[k]<=1))throw Error('Invalid melody settings.');
  if(m.tempoMap&&(!Array.isArray(m.tempoMap)||!m.tempoMap.length||m.tempoMap.length>1000||m.tempoMap.some((t,i)=>!Number.isFinite(t.beat)||t.beat<0||i&&t.beat<=m.tempoMap[i-1].beat||!Number.isFinite(t.bpm)||t.bpm<=0||t.bpm>1000)))throw Error('Invalid tempo map.');
 }
 for(const chart of [data.bars,data.source||data.bars]){
  if(!Array.isArray(chart)||chart.length>512)throw Error('Invalid chart.');
  for(const bar of chart){if(!Array.isArray(bar.chords)||bar.chords.length>64||bar.chords.some(c=>!(c.symbol==='N.C.'||parse(c.symbol))||!Number.isFinite(c.beats)||c.beats<=0||c.beats>32))throw Error('Invalid chord.');}
 }
 return structuredClone(data);
}
