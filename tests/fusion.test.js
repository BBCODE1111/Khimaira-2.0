import test from 'node:test';
import assert from 'node:assert/strict';
import {styles,mutate} from '../dist/style-engine.js';
import {patterns,performance} from '../dist/performance.js';
import {parseChart} from '../dist/solutions.js';
import {protectChart,renderProtected,chartFromSegments} from '../dist/fusion.js';
import {auditHarmony,demoMelody,harmonize} from '../dist/harmony.js';
import {encodeAuditedMidi} from '../dist/export.js';
import {parseMidi} from '../dist/midi.js';

test('without melody the complete v1 performance and voicing are unchanged for every pattern',()=>{
 const bars=parseChart('| Cmaj9 | Am9 | Fmaj9 | G13 |');
 for(const pattern of Object.keys(patterns)){const opts={voicing:'open',human:.8,swing:.2,gate:.71,arpMode:'walk',arpRate:'24',arpOctaves:3};assert.deepEqual(renderProtected(bars,pattern,opts).notes,performance(bars,pattern,opts));}
});
test('all 48 original styles and five rewrite methods stay melody compatible and export safely',()=>{
 const melody=demoMelody(),before=structuredClone(melody),source=chartFromSegments(harmonize(melody).segments);
 assert.equal(Object.keys(styles).length,48);
 for(const [style,cfg]of Object.entries(styles))for(const method of ['style','color','cadence','tritone','original']){
  const candidate=mutate(source,{style,method,key:0,mode:'major',density:3,randomness:'high',seed:7});
  const protectedScore=protectChart(candidate,melody,{style,seed:7});
  const rendered=renderProtected(protectedScore.bars,cfg.pattern,{voicing:cfg.voicing,human:1,swing:.32},melody);
  assert.equal(auditHarmony(melody,rendered.accompaniment).length,0,style+' '+method);
  const decoded=parseMidi(encodeAuditedMidi({melody,accompaniment:rendered.accompaniment}));
  assert.equal(decoded.tracks[0].notes.length,32);assert.deepEqual(melody,before);
 }
});
test('safe slash chords are retained; incompatible manual edits are repaired',()=>{
 const melody=[{pitch:60,start:0,end:4,velocity:.7}];
 const safe=parseChart('| F/A |');assert.deepEqual(protectChart(safe,melody).bars[0].chords,safe[0].chords);
 const fixed=protectChart(parseChart('| B7/F# |'),melody);assert.ok(fixed.changed);assert.equal(auditHarmony(melody,renderProtected(fixed.bars,'arp',{arpMode:'random',arpOctaves:4},melody).accompaniment).length,0);
});
test('3/4 and 6/8 keep real beats and no four-beat gaps across the legacy performance engine',()=>{
 const melody=demoMelody().slice(0,12),h=harmonize(melody,{beatsPerBar:3});
 for(const meter of [{numerator:3,denominator:4},{numerator:6,denominator:8}]){
  const bars=chartFromSegments(h.segments,3),safe=protectChart(bars,melody,{meter});
  for(const b of safe.bars)assert.ok(Math.abs(b.chords.reduce((s,c)=>s+c.beats,0)-3)<1e-6);
  const notes=renderProtected(safe.bars,'sustain',{barBeats:3},melody).notes;
  assert.ok(notes.every(n=>n.beat+n.duration<=12+1e-7));assert.ok(notes.some(n=>n.beat===3));
 }
});
test('all arp rates/modes and dense chromatic input respect protection',()=>{
 const melody=Array.from({length:12},(_,i)=>({pitch:60+i,start:i*.25,end:i*.25+.5,velocity:.7}));
 const safe=protectChart(parseChart('| Cmaj9 |'),melody);
 for(const arpMode of ['up','down','upDown','random','walk'])for(const arpRate of ['4','8','8T','16','24','32']){
  const r=renderProtected(safe.bars,'arp',{arpMode,arpRate,arpOctaves:4,human:1,swing:.32},melody);
  assert.equal(auditHarmony(melody,r.accompaniment).length,0);
 }
});
