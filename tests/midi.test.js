import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMidi, encodeMidi, beatToSeconds, secondsToBeat } from '../dist/midi.js';
const near = (a, b, epsilon = 1e-6) => assert.ok(Math.abs(a - b) < epsilon, `${a} vs ${b}`);
const raw = track => new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,(track.length>>>24)&255,(track.length>>>16)&255,(track.length>>>8)&255,track.length&255,...track]);

test('format 0 running status, zero-velocity note off, track name, tempo and drum exclusion', () => {
  const bytes = raw([0,255,3,4,76,101,97,100,0,255,81,3,7,161,32,0,144,60,100,0,153,36,90,0x83,0x60,144,60,0,0,62,100,0x83,0x60,62,0,0,137,36,0,0,255,47,0]);
  const midi = parseMidi(bytes);
  assert.equal(midi.tracks.length, 1); assert.equal(midi.tracks[0].name, 'Lead · CH 1');
  assert.deepEqual(midi.tracks[0].notes.map(n => [n.pitch, n.start, n.end]), [[60, 0, 1], [62, 1, 2]]);
  assert.equal(midi.tempoMap[0].bpm, 120); assert.ok(midi.hasTempo);
});
test('sustain pedal holds notes until release; bent tracks are explicitly identified', () => {
  const midi = parseMidi(raw([0,144,60,100,0,176,64,127,0x83,0x60,128,60,0,0x83,0x60,176,64,0,0,224,1,65,0,255,47,0]));
  assert.equal(midi.tracks[0].notes[0].end, 2); assert.equal(midi.tracks[0].pitchBend, true);
  assert.equal(midi.hasTempo, false); assert.ok(midi.warnings.some(w => w.includes('120')));
});
test('tempo map conversion is continuous and invertible at tempo changes', () => {
  const map = [{ beat: 0, bpm: 120 }, { beat: 4, bpm: 60 }, { beat: 8, bpm: 180 }];
  near(beatToSeconds(4, map), 2); near(beatToSeconds(8, map), 6); near(beatToSeconds(11, map), 7);
  for (let beat = 0; beat < 20; beat += .125) near(secondsToBeat(beatToSeconds(beat, map), map), beat);
});
test('export round-trips two independent tracks, durations, tempo changes and 6/8', () => {
  const melody = [{ pitch: 67, start: .25, end: 2.25, velocity: .8 }, { pitch: 69, start: 3, end: 3.5, velocity: .6 }];
  const accompaniment = [{ pitch: 48, start: 0, end: 3, velocity: .5 }];
  const map = [{ beat: 0, bpm: 108 }, { beat: 3, bpm: 90 }];
  const midi = parseMidi(encodeMidi({ melody, accompaniment, tempoMap: map, meter: { numerator: 6, denominator: 8 } }));
  assert.equal(midi.tracks.length, 2); assert.equal(midi.meter.numerator, 6); assert.equal(midi.meter.denominator, 8);
  melody.forEach((n, i) => { const actual = midi.tracks.find(t => t.channel === 0).notes[i]; assert.equal(n.pitch, actual.pitch); near(n.start, actual.start); near(n.end, actual.end); });
  near(midi.tempoMap[0].bpm, 108, .001); near(midi.tempoMap[1].bpm, 90, .001); assert.equal(midi.tempoMap[1].beat, 3);
});
test('rejects truncated/corrupt files and unsupported timing rather than guessing', () => {
  assert.throws(() => parseMidi(new Uint8Array([77,84])), /截斷/);
  assert.throws(() => parseMidi(raw([0,60,100])), /running status/);
  assert.throws(() => parseMidi(raw([0,255,81,3,0,0,0])), /不能為零/);
  const smpte = raw([0,255,47,0]); smpte[12] = 0xe7; assert.throws(() => parseMidi(smpte), /SMPTE/);
  const format2 = raw([0,255,47,0]); format2[9] = 2; assert.throws(() => parseMidi(format2), /format 2/);
});
test('changing meters are explicitly rejected by the first prototype', () => {
  assert.throws(() => parseMidi(raw([0,255,88,4,4,2,24,8,0,144,60,100,0x83,0x60,128,60,0,0,255,88,4,3,2,24,8,0,255,47,0])), /變換拍號/);
});
