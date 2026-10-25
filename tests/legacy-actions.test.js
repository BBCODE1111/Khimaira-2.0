import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseChart,serialize} from '../dist/solutions.js';
import {insertCadence,invertChord,parallelColor} from '../dist/harmony-actions.js';
import {playbackSlice,spaceToggles} from '../dist/transport.js';
import {parse,events,mod} from '../dist/music.js';
import {mutate,cadenceTo} from '../dist/style-engine.js';

test('local ii V preserves C and resolves to the next Am, keeping source and target immutable',()=>{
 const input=parseChart('| C | Am |'),before=serialize(input),r=insertCadence(input,0,0);
 assert.deepEqual(r.bars[0].chords,[{symbol:'C',beats:2},{symbol:'Bm7b5',beats:1},{symbol:'E7',beats:1}]);
 assert.deepEqual(r.bars[1],input[1]);assert.equal(serialize(input),before);
});
test('intrabar targets, slash root, four beats and surrounding events are preserved',()=>{
 for(const target of ['F','Am/E','Cmaj9']){const input=parseChart(`| C:2 ${target}:2 | G |`),r=insertCadence(input,0,0);
 assert.equal(r.bars[0].chords.length,4);assert.deepEqual(r.bars[0].chords.at(-1),input[0].chords[1]);
 assert.equal(r.bars[0].chords.reduce((s,c)=>s+c.beats,0),4);
 assert.equal(parse(r.bars[0].chords[2].symbol).root,mod(parse(target).root+7));}
});
test('last bar wraps only when looping and invalid or crowded targets do not destroy chords',()=>{
 const b=parseChart('| C | Am |');assert.throws(()=>insertCadence(b,1,0));assert.equal(insertCadence(b,1,0,{loop:true}).target,'C');
 for(const chart of ['| C | | Am |','| C | Bm7b5 |','| C | Cdim7 |','| C | Csus4 |','| C:2 Dm7:1 G7:1 | Am |'])assert.throws(()=>insertCadence(parseChart(chart),0,0));
});
test('parallel color keeps 11/13, explicit tensions and compatible bass; special chords reject',()=>{
 assert.equal(parallelColor('Cmaj13/E'),'Cm13');assert.equal(parallelColor('Cm11/G'),'Cmaj11/G');
 assert.equal(parallelColor('Cmaj7(9,#11)/G'),'Cm7(9,#11)/G');
 for(const c of ['Caug','Cdim7','Csus4','C7alt','CmMaj7'])assert.throws(()=>parallelColor(c));
});
test('inversion only uses structural chord tones and returns to root',()=>{
 let s='Cmaj13';const bass=[];for(let i=0;i<4;i++){s=invertChord(s);bass.push(parse(s).bass);}assert.deepEqual(bass,[4,7,11,0]);
 assert.equal(invertChord('C/Gb'),'C');assert.equal(invertChord('Cdim7/Gb'),'Cdim7/A');
 assert.equal(cadenceTo('Cm7(b5)'),null);
});
test('seek clips notes at selected bar, rebases time and never exceeds the segment',()=>{
 const out=playbackSlice([{note:60,beat:0,duration:6},{note:64,beat:5,duration:4},{note:67,beat:0,duration:1}],1,2);
 assert.equal(out.beats,4);assert.deepEqual(out.notes.map(n=>[n.beat,n.duration]),[[0,2],[1,3]]);
 const real=playbackSlice(events(parseChart('| C | Am | F | G |'),'sustain'),2,4);
 assert.equal(real.beats,8);assert.ok(real.notes.length);assert.ok(real.notes.every(n=>n.beat>=0&&n.beat+n.duration<=8));
});
test('space ignores repeated keys, modifiers and editing controls',()=>{
 assert.equal(spaceToggles({code:'Space'}),true);
 for(const e of [{code:'Enter'},{code:'Space',repeat:true},{code:'Space',metaKey:true},{code:'Space',target:{closest:()=>true}}])assert.equal(spaceToggles(e),false);
});
test('one-shot automatic cadence does not pretend to resolve past the final bar',()=>{
 const out=mutate(parseChart('| C | Am | F | G |'),{method:'cadence',density:3,loop:false,randomness:'low'});
 assert.equal(out[0].chords.length,3);assert.equal(out[3].chords.length,1);
 assert.equal(invertChord('C6/G'),'C6');
});
