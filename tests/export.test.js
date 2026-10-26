import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeAuditedMidi } from '../dist/export.js';
import { parseMidi } from '../dist/midi.js';
import { harmonize, demoMelody, auditHarmony } from '../dist/harmony.js';
test('export audits quantized bytes and refuses a newly introduced sub-tick clash', () => {
  const melody = [{ pitch: 60, start: .0002, end: .0003 }];
  const accompaniment = [{ pitch: 61, start: .0004, end: .0005 }];
  assert.equal(auditHarmony(melody, accompaniment).length, 0);
  assert.throws(() => encodeAuditedMidi({ melody, accompaniment }), /MIDI tick|timing/);
});
test('audited export retains separate melody and accompaniment tracks', () => {
  const melody = demoMelody(), result = harmonize(melody, { style: 'jazz' });
  const file = parseMidi(encodeAuditedMidi({ melody, accompaniment: result.accompaniment }));
  assert.equal(file.tracks[0].notes.length, 32);
  assert.equal(file.tracks[1].notes.length, result.accompaniment.length);
});
