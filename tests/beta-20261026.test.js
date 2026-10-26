import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {parseMidi} from '../dist/midi.js';
import {demoMelody,compatible,auditHarmony,overlaps} from '../dist/harmony.js';
import {arrangeMelody,detectPickup} from '../dist/melody-arranger.js';
import {styles} from '../dist/style-engine.js';
import {parse,pitchName,spellChord} from '../dist/music.js';
import {inferKeys} from '../dist/analysis.js';
import {chartFromSegments,renderProtected,preserveLocks} from '../dist/fusion.js';
import {encodeAuditedMidi} from '../dist/export.js';
import {validateProject} from '../dist/project.js';
const compare=['American pop','Rock','Jazz','Bossa nova','House','Classical','Lo-fi hip-hop','Ambient'];
const fixtures=readdirSync(new URL('./fixtures/beta-20261026/',import.meta.url)).filter(f=>f.endsWith('.mid')).map(name=>{
 const midi=parseMidi(readFileSync(new URL('./fixtures/beta-20261026/'+name,import.meta.url))),notes=midi.tracks[0].notes;
 return {name,notes,meter:midi.meter,key:midi.keyHint||inferKeys(notes).candidates[0],tempoMap:midi.tempoMap};
});
const demo={name:'demo',notes:demoMelody(),key:{root:0,mode:'major'},meter:{numerator:4,denominator:4},tempoMap:[{beat:0,bpm:108}]};
function arrange(f,style,seed=0){return arrangeMelody(f.notes,{key:f.key,meter:f.meter,beatsPerBar:f.meter.numerator*4/f.meter.denominator,style,seed});}
test('dominant tritones need both chord tones; remote major sevenths are allowed but close semitones are rejected',()=>{
 assert.equal(compatible(53,71,'musical','G7'),true);
 assert.equal(compatible(53,71,'musical','F'),false);
 assert.equal(compatible(59,72,'musical','Cmaj7'),true);
 for(const p of [71,73,61])assert.equal(compatible(p,72,'musical','Cmaj7'),false);
 assert.equal(compatible(53,71,'strict','G7'),false);
});
test('demo has at least five visible genre charts, a G dominant in bar four and a ii–V',()=>{
 assert.ok(new Set(compare.map(style=>arrange(demo,style).segments.map(s=>s.symbol).join('|'))).size>=5);
 const segments=arrange(demo,'Jazz').segments;
 assert.ok(segments.some(s=>s.start===12&&parse(s.symbol).root===7&&['7','9','13'].includes(parse(s.symbol).q)));
 assert.ok(segments.some((s,i)=>parse(s.symbol).root===2&&parse(segments[i+1]?.symbol)?.root===7));
});
test('bebop passing tones do not cause chord-per-beat churn; generation still varies',()=>{
 const f=fixtures.find(f=>f.name.startsWith('bebop')),charts=new Set();
 for(const style of compare){const r=arrange(f,style);assert.ok(r.segments.length/(r.totalBeats/4)<=2);charts.add(r.segments.map(s=>s.symbol).join('|'));}
 assert.ok(charts.size>=5);assert.notDeepEqual(arrange(f,'Jazz',0).segments,arrange(f,'Jazz',1).segments);
});
test('pickup is N.C. by default and can be harmonized; 3/4 boundaries stay on quarter beats',()=>{
 const pickup=fixtures.find(f=>f.name.startsWith('pop-sync'));assert.ok(detectPickup(pickup.notes));assert.equal(arrange(pickup,'American pop').segments[0].symbol,'N.C.');
 assert.notEqual(arrangeMelody(pickup.notes,{key:pickup.key,pickup:false}).segments[0].symbol,'N.C.');
 const waltz=fixtures.find(f=>f.name.startsWith('waltz'));
 for(const style of compare)for(const s of arrange(waltz,style).segments)assert.equal(s.start,Math.round(s.start));
});
test('sharp-key spelling applies to chords, slash bass and piano-roll pitches',()=>{
 const key={root:4,mode:'minor'};assert.equal(pitchName(66,key,true),'F#4');assert.equal(spellChord('Gbsus2/Db',key),'F#sus2/C#');
 const f=fixtures.find(f=>f.name.startsWith('rock-pent'));for(const style of compare)assert.doesNotMatch(arrange({...f,key},style).segments.map(s=>s.symbol).join('|'),/Gb|Db/);
});
test('336 arrangements preserve every melody, stay below it, remain conflict-free and export all tracks',()=>{
 for(const f of [...fixtures,demo])for(const [style,cfg] of Object.entries(styles)){
  const before=structuredClone(f.notes),r=arrange(f,style),barBeats=f.meter.numerator*4/f.meter.denominator,chart=chartFromSegments(r.segments,barBeats,r.totalBeats);
  const result=renderProtected(chart,cfg.pattern,{policy:'musical',followMelody:true,barBeats,meter:f.meter,voicing:cfg.voicing,human:0},f.notes);
  assert.ok(result.accompaniment.length,f.name+' '+style);for(let i=0;i<chart.length;i++)if(chart[i].chords.some(c=>c.symbol!=='N.C.'))assert.ok(result.accompaniment.some(n=>overlaps(n,{start:i*barBeats,end:(i+1)*barBeats})),f.name+' '+style+' empty bar '+i);assert.equal(auditHarmony(f.notes,result.accompaniment,{policy:'musical'}).length,0);
  for(const n of result.accompaniment){assert.ok(n.end<=r.totalBeats+1e-7);for(const m of f.notes)if(overlaps(n,m))assert.ok(n.pitch<=m.pitch-2,`${f.name} ${style}: ${n.pitch} above ${m.pitch}`);}
  const bytes=encodeAuditedMidi({melody:f.notes,accompaniment:result.accompaniment,policy:'musical',includeMelody:true,separateBass:true,chordMarkers:r.segments,tempoMap:f.tempoMap,meter:f.meter});
  const decoded=parseMidi(bytes);assert.equal(decoded.tracks.find(t=>t.channel===0).notes.length,f.notes.length);assert.ok(new TextDecoder().decode(bytes).includes('KHIMAIRA bass'));assert.deepEqual(f.notes,before);
 }
});
test('individual locked chord spans survive a replacement chart with different splits',()=>{
 const previous=[{chords:[{symbol:'C',beats:1},{symbol:'G7',beats:2,locked:true},{symbol:'C',beats:1}]}];
 const next=[{chords:[{symbol:'Dm7',beats:2},{symbol:'F',beats:2}]}];
 assert.deepEqual(preserveLocks(next,previous)[0].chords,[{symbol:'Dm7',beats:1,locked:false},{symbol:'G7',beats:2,locked:true},{symbol:'F',beats:1,locked:false}]);
});
test('project validation preserves notes and locks and rejects malformed import before application',()=>{
 const project={format:'khimaira-project',version:1,bars:[{chords:[{symbol:'C',beats:4,locked:true}]}],melody:{notes:demo.notes,key:demo.key,meter:demo.meter,bpm:108,tempoMap:demo.tempoMap,policy:'musical',instrument:'warm',mix:{melody:.35,harmony:1}}};
 assert.deepEqual(validateProject(project),project);
 assert.throws(()=>validateProject({...project,melody:{...project.melody,bpm:0}}));assert.throws(()=>validateProject({...project,bars:[{chords:[{symbol:'invalid',beats:4}]}]}));
});

test('an old dominant context cannot justify a tritone after the harmony has changed',()=>{
 const chart=[{chords:[{symbol:'G7',beats:2},{symbol:'C',beats:2}]}],melody=[{pitch:71,start:0,end:4}];
 const r=renderProtected(chart,'ambient',{policy:'musical',followMelody:true,human:0},melody);
 for(const n of r.accompaniment)if(n.chord==='G7')assert.ok(n.end<=2);
});
