import test from 'node:test';
import assert from 'node:assert/strict';
import { harmonize, styles, demoMelody, auditHarmony, compatible, validateMelody } from '../dist/harmony.js';
import { encodeMidi, parseMidi } from '../dist/midi.js';

test('strict policy forbids seconds, sevenths and tritones in either direction', () => {
  for (let interval = 0; interval < 12; interval++) assert.equal(compatible(60 + interval, 60), [0,3,4,5,7,8,9].includes(interval));
  assert.equal(auditHarmony([{ pitch: 60, start: 1, end: 2 }], [{ pitch: 61, start: 0, end: 1 }]).length, 0);
  assert.equal(auditHarmony([{ pitch: 60, start: 1, end: 2 }], [{ pitch: 61, start: 0, end: 1.01 }]).length, 1);
});
test('all styles / 12 transpositions / 4 variants preserve melody and actual-note safety', () => {
  for (let transpose = 0; transpose < 12; transpose++) for (const style of Object.keys(styles)) for (let seed = 0; seed < 4; seed++) {
    const melody = demoMelody().map(n => ({ ...n, pitch: n.pitch + transpose })), before = structuredClone(melody);
    const result = harmonize(melody, { key: { root: transpose, mode: 'major' }, style, seed });
    assert.deepEqual(melody, before); assert.equal(auditHarmony(melody, result.accompaniment).length, 0);
    assert.ok(result.accompaniment.length > 0); assert.equal(result.gaps, 0);
    for (const n of result.accompaniment) assert.ok(n.end > n.start && n.start >= 0 && n.end <= result.totalBeats);
  }
});
test('chromatic, overlapping, sustained and non-4/4 melodies cannot bypass checking', () => {
  const cases = [
    Array.from({ length: 12 }, (_, i) => ({ pitch: 60 + i, start: i * .5, end: i * .5 + .7, velocity: .7 })),
    [{ pitch: 60, start: 0, end: 8, velocity: .7 }, { pitch: 66, start: 2, end: 6, velocity: .7 }],
    Array.from({ length: 12 }, (_, i) => ({ pitch: 60 + i, start: 0, end: 4, velocity: .7 })),
  ];
  for (const melody of cases) for (const style of Object.keys(styles)) {
    const result = harmonize(melody, { style, beatsPerBar: 3 });
    assert.equal(auditHarmony(melody, result.accompaniment).length, 0);
  }
  const dense = harmonize(cases[2]); assert.ok(dense.gaps > 0); assert.equal(dense.accompaniment.length, 0);
});
test('exported accompaniment is the exact checked performance and retains safe timing after PPQ rounding', () => {
  const melody = demoMelody();
  for (const style of Object.keys(styles)) {
    const result = harmonize(melody, { style });
    const exported = parseMidi(encodeMidi({ melody, accompaniment: result.accompaniment }));
    const m = exported.tracks.find(t => t.channel === 0).notes, h = exported.tracks.find(t => t.channel === 1).notes;
    assert.equal(h.length, result.accompaniment.length); assert.equal(auditHarmony(m, h).length, 0);
  }
});
test('styles change performed rhythm while safe options are deterministic for a seed', () => {
  const m = demoMelody(), basic = harmonize(m), rock = harmonize(m, { style: 'rock' });
  assert.notDeepEqual(rock.accompaniment, basic.accompaniment);
  assert.deepEqual(harmonize(m, { style: 'jazz', seed: 8 }), harmonize(m, { style: 'jazz', seed: 8 }));
  assert.throws(() => validateMelody([{ pitch: NaN, start: 0, end: 1 }]), /無效/);
  assert.throws(() => validateMelody([{ pitch: 60, start: 0, end: 513 }]), /512/);
});
