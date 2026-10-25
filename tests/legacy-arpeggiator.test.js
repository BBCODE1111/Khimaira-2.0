import {test} from 'node:test';
import assert from 'node:assert/strict';
import {arpModes,arpRates,arpOrder,arpPresets,arpeggiate} from '../dist/arpeggiator.js';
import {performance,voicePlan,segments} from '../dist/performance.js';
import {parseChart} from '../dist/solutions.js';
import {parse,midiBytes} from '../dist/music.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const opts={human:0,swing:0,gate:1,arpOctaves:1,arpMode:'up',arpRate:'16'};
function readMidi(bytes){let p=22,tick=0;const active=new Map,notes=[];while(p<bytes.length){let delta=0,b;do{b=bytes[p++];delta=delta*128+(b&127);}while(b&128);tick+=delta;const status=bytes[p++];if(status===0xc0){p++;continue;}if(status===255){assert.equal(bytes[p++],47);assert.equal(bytes[p++],0);continue;}const pitch=bytes[p++],velocity=bytes[p++];if(status===0x90){assert.ok(!active.has(pitch),'overlapping note '+pitch);active.set(pitch,{note:pitch,start:tick,velocity});}else{assert.equal(status,0x80);const n=active.get(pitch);assert.ok(n,'unmatched off');assert.ok(tick>n.start,'zero duration');notes.push({...n,end:tick});active.delete(pitch);}}assert.equal(active.size,0);return {notes,tick};}
test('classic ascending, descending, exclusive/inclusive and alternating note orders',()=>{
 const p=[60,64,67];
 assert.deepEqual(arpOrder(p,'up'),p);assert.deepEqual(arpOrder(p,'down'),[67,64,60]);
 assert.deepEqual(arpOrder(p,'upDown'),[60,64,67,64]);assert.deepEqual(arpOrder(p,'inclusive'),[60,64,67,67,64,60]);
 assert.deepEqual(arpOrder([60,64,67,71],'outsideIn'),[60,71,64,67]);assert.deepEqual(arpOrder([60,64,67,71],'insideOut'),[64,67,60,71]);
 assert.deepEqual(arpOrder(p,'pedal'),[60,64,60,67]);assert.deepEqual(arpOrder([60],'upDown'),[60]);
});
test('all six rates give exact subdivisions and MIDI ticks, including 24 steps and 32 steps per bar',()=>{
 for(const [rate,{step}] of Object.entries(arpRates)){
  const ns=performance(parseChart('| C |'),'arp',{...opts,arpRate:rate});
  assert.equal(ns.length,Math.round(4/step));ns.forEach((n,i)=>{near(n.beat,i*step);near(n.duration,step);});
  const midi=readMidi(midiBytes(ns,4));assert.equal(midi.tick,1920);assert.equal(midi.notes.length,ns.length);
  midi.notes.sort((a,b)=>a.start-b.start).forEach((n,i)=>{assert.equal(n.start,Math.round(i*step*480));assert.equal(n.end-n.start,Math.round(step*480));});
 }
});
test('POLY is simultaneous, octave cycling is bounded, MIXED contains both chords and single notes',()=>{
 const bars=parseChart('| C |'),base=voicePlan(bars)[0].notes.slice(1);
 const poly=performance(bars,'arp',{...opts,arpMode:'poly',arpRate:'8',arpOctaves:3});
 for(let i=0;i<8;i++)assert.deepEqual(poly.filter(n=>n.beat===i*.5).map(n=>n.note),base.map(n=>n+(i%3)*12));
 const mixed=performance(bars,'arp',{...opts,arpMode:'mixed'});assert.equal(mixed.filter(n=>n.beat===0).length,base.length);assert.equal(mixed.filter(n=>n.beat===.25).length,1);assert.equal(mixed.filter(n=>n.beat===1).length,base.length);
});
test('FLOW continues note index across chord changes; RESTART resets order without moving the clock',()=>{
 const bars=parseChart('| C | C |'),base=voicePlan(bars)[0].notes.slice(1);
 const reset=performance(bars,'arp',{...opts,arpRate:'4',arpPhase:'chord'}),flow=performance(bars,'arp',{...opts,arpRate:'4',arpPhase:'flow'});
 assert.deepEqual(reset.map(n=>n.beat),flow.map(n=>n.beat));assert.equal(reset[4].note,base[0]);assert.equal(flow[4].note,base[1]);
});
test('random and walk are repeatable for export, vary by seed, and walk only moves to neighbours',()=>{
 const bars=parseChart('| C | C |'),base=voicePlan(bars)[0].notes.slice(1);
 for(const mode of ['random','walk']){const a=performance(bars,'arp',{...opts,arpMode:mode,arpSeed:7});assert.deepEqual(a,performance(bars,'arp',{...opts,arpMode:mode,arpSeed:7}));assert.notDeepEqual(a,performance(bars,'arp',{...opts,arpMode:mode,arpSeed:8}));if(mode==='walk')for(let i=1;i<16;i++)assert.equal(Math.abs(base.indexOf(a[i].note)-base.indexOf(a[i-1].note)),1);}
});
test('triplets stay even, straight divisions swing in pairs, GATE 100 is gapless and GATE 10 remains short',()=>{
 const bars=parseChart('| C |');
 for(const rate of ['8T','24'])assert.deepEqual(performance(bars,'arp',{...opts,arpRate:rate,swing:.32}),performance(bars,'arp',{...opts,arpRate:rate,swing:0}));
 const swung=performance(bars,'arp',{...opts,arpRate:'32',swing:.25});near(swung[1].beat,.1875);near(swung[0].duration,.1875);near(swung[1].duration,.0625);
 const short=performance(bars,'arp',{...opts,arpRate:'32',gate:.1});assert.ok(short.every(n=>Math.abs(n.duration-.0125)<1e-8));
});
test('every ARP mode/rate/range/phase survives dense harmony, swing, humanization and a MIDI round-trip',()=>{
 const bars=parseChart('| C Bm7b5 E7 | Am7 D7 | Fmaj9 G13 | C69 |'),ss=segments(bars);
 for(const arpMode of Object.keys(arpModes))for(const arpRate of Object.keys(arpRates))for(const arpOctaves of [1,2,3,4])for(const arpPhase of ['chord','flow'])for(const gate of [.1,1]){
  const ns=performance(bars,'arp',{arpMode,arpRate,arpOctaves,arpPhase,gate,swing:.32,human:1,arpSeed:51}),midi=readMidi(midiBytes(ns,16));
  assert.equal(midi.tick,7680);assert.equal(midi.notes.length,ns.length);
  const actual=midi.notes.sort((a,b)=>a.start-b.start||a.note-b.note),expected=ns.map(n=>({note:n.note,start:Math.round(n.beat*480),end:Math.round((n.beat+n.duration)*480),velocity:Math.round(n.velocity*100)})).sort((a,b)=>a.start-b.start||a.note-b.note);
  assert.deepEqual(actual,expected,arpMode+' '+arpRate);
  for(const n of ns){assert.ok(n.note>=21&&n.note<=108);const s=ss.find(s=>n.beat>=s.beat&&n.beat<s.beat+s.beats);assert.ok(s);assert.ok(n.beat+n.duration<=s.beat+s.beats+1e-8);assert.ok(parse(s.symbol).pcs.includes(n.note%12));}
 }
});
test('presets retain original harmony, produce distinct musical events, and empty charts are safe',()=>{
 const bars=parseChart('| Am | F | Dm | E7 |'),original=structuredClone(bars),signatures=[];
 for(const p of Object.values(arpPresets)){const ns=performance(bars,'arp',{...p,gate:p.gate/100,human:p.human/100,swing:p.swing/100});signatures.push(JSON.stringify(ns));assert.ok(ns.length>0);}
 assert.equal(new Set(signatures).size,3);assert.deepEqual(bars,original);assert.deepEqual(arpeggiate([]),[]);
});
