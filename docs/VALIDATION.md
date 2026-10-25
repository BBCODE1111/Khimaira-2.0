# Validation · 2026-10-25 · 2.0.0-alpha.1

## Automated

`node --test tests/*.test.js`: **18 tests passed** on macOS arm64.

- Independent SMF fixture: format 0, running status, note-on velocity zero, track names, tempo, drum exclusion, sustain and pitch-bend detection.
- Variable tempo round trips and beat/seconds conversions; separate melody and accompaniment, 6/8; explicit rejection of malformed, truncated, SMPTE, type 2 and changing-meter input.
- YIN across synthetic fundamentals/harmonics; repeated notes; leading silence and silent-input rejection; tempo ambiguity and relative-major/minor examples.
- Original 108 BPM WAV: detected 32 expected notes, all expected semitone pitches, BPM 108, onset tolerance under 40 ms. This is one synthetic fixture, not a real-recording accuracy benchmark.
- 8 harmony modes × 12 transpositions × 4 seeds = **384 scenarios**; melody unchanged, no forbidden overlapping melody/accompaniment intervals.
- Chromatic/polyphonic cases, held notes, 3/4 and 6/8, no-candidate silence, actual rendered-note audits and MIDI round-trip audits.
- Deliberately sub-tick, non-overlapping notes that collide after MIDI rounding: export correctly refused.

## Browser smoke test

Local in-app Chromium browser:

- Load original eight-bar demo and generate basic chords.
- Jazz and Bossa changes, seeded variation, chord cards and piano roll.
- Edit first melody note E4 → F4 and regenerate harmony.
- Actual MIDI file chooser import: 32 notes, 108 BPM, melody track shown.
- Actual WAV decode → resample → worker analysis → chord generation: 32 notes, 108 BPM.
- Start/stop and progressing playhead; original audio mode and detected-note mode selectable.
- Download separate-track MIDI; downloaded bytes parsed and audited independently.
- Responsive desktop and narrow viewport checks; no console errors during tested flow.

These checks verify UI and scheduling behavior; they are not an independent human listening panel or an all-browser/all-DAW certification. Public Pages CI reruns the automated suite before deploying.

## Before a DAW 2.0 implementation

Collect real monophonic recordings with reference MIDI, evaluate octave/onset/BPM errors, test pickup notes and sustained notes across chord boundaries, compare style variations by ear, and test exported MIDI in intended DAWs. Only then freeze the core interface and choose plugin formats/platform build infrastructure.
