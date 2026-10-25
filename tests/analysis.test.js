import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { yinPitch, analyzePCM, estimateTempo, inferKeys, audioNotesToBeats } from '../dist/analysis.js';
import { demoMelody } from '../dist/harmony.js';

test('YIN recognizes fundamentals with harmonics across a practical melody range', () => {
  for (let pitch = 40; pitch <= 84; pitch += 2) {
    const frequency = 440 * 2 ** ((pitch - 69) / 12), frame = new Float32Array(1024);
    for (let i = 0; i < frame.length; i++) { const phase = i / 11025 * Math.PI * 2 * frequency; frame[i] = .3 * (Math.sin(phase) + .3 * Math.sin(phase * 2) + .1 * Math.sin(phase * 3)); }
    const result = yinPitch(frame, 11025); assert.equal(result.pitch, pitch); assert.ok(Math.abs(result.midi - pitch) < .2);
  }
  assert.equal(yinPitch(new Float32Array(1024), 11025), null);
});
test('actual WAV fixture yields 32 pitches, repeated notes, and 108 BPM without hand-authored note input', () => {
  const wav = fs.readFileSync(new URL('../dist/examples/melody-108.wav', import.meta.url));
  const pcm = new Float32Array((wav.length - 44) / 4);
  for (let i = 0; i < pcm.length; i++) pcm[i] = wav.readInt16LE(44 + i * 4) / 32768;
  const analysis = analyzePCM(pcm, 11025), truth = demoMelody();
  assert.deepEqual(analysis.notes.map(n => n.pitch), truth.map(n => n.pitch));
  assert.ok(Math.abs(analysis.tempo.bpm - 108) <= 1);
  analysis.notes.forEach((n, i) => assert.ok(Math.abs(n.start - truth[i].start * 60 / 108) < .04));
});
test('leading silence and empty input are handled honestly', () => {
  assert.throws(() => analyzePCM(new Float32Array(11025), 11025), /未找到/);
  const pcm = new Float32Array(22050); for (let i = 11025; i < pcm.length; i++) pcm[i] = .3 * Math.sin((i - 11025) / 11025 * 2 * Math.PI * 440);
  const result = analyzePCM(pcm, 11025); assert.equal(result.notes[0].pitch, 69); assert.ok(Math.abs(result.offset - 1) < .04);
  assert.equal(result.tempo.confidence, '不足以判定');
});
test('tempo ambiguity has alternatives; estimated tempo is never an exact-confidence claim', () => {
  const result = estimateTempo(Array.from({ length: 20 }, (_, i) => i * .5));
  assert.ok(Math.abs(result.bpm - 120) <= 1); assert.ok(result.candidates.some(b => Math.abs(b - 60) < 2));
  assert.match(result.confidence, /確認/); assert.equal(estimateTempo([0, 1]).confidence, '不足以判定');
});
test('key inference suggests rather than forces a key; audio grid changes preserve seconds', () => {
  const keys = inferKeys(demoMelody()); assert.equal(keys.candidates[0].root, 0); assert.equal(keys.candidates[0].mode, 'major');
  assert.ok(keys.candidates.some(k => k.root === 9 && k.mode === 'minor'));
  const audio = [{ pitch: 60, start: 1, end: 1.5, velocity: .7 }];
  for (const bpm of [60, 120, 240]) { const notes = audioNotesToBeats(audio, bpm, .5); assert.equal(notes[0].start * 60 / bpm + .5, 1); assert.equal(notes[0].end * 60 / bpm + .5, 1.5); }
  assert.throws(() => audioNotesToBeats(audio, 120, 1.1), /第 1 拍/);
});
