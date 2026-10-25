# Architecture · Alpha 2

The website is dependency-free ES modules. There is no server-side audio processing.

| Module | Responsibility |
| --- | --- |
| `midi.js` | Bounded SMF parser, sustain handling, per-track/channel notes, tempo map conversions, type-1 writer at PPQ 960 |
| `analysis.js` / `analysis-worker.js` | YIN pitch, median filtering, RMS onset/release refinement, repeated-note segmentation, heuristic BPM alternatives, duration-weighted key profiles |
| `harmony.js` | Chord candidate compatibility, adaptive phrase splitting, dynamic-programming path selection, actual-note audit |
| `engine/` | Existing KHIMAIRA harmony vocabulary, voicing and performance patterns, reused as local source |
| `export.js` | Encode, reparse, audit exact MIDI timing before download |
| `player.js` / `piano.js` | One Web Audio clock, tempo-map/loop/cue scheduling, original audio alignment, original Salamander piano with strict in-note releases in melody mode, live gain buses |
| `app.js` | Original 1.0 workbench and all legacy controls, plus the melody integration boundary |
| `melody-workspace.js` | Optional audio/MIDI import, analysis, note edits, meter, tempo map, piano roll and independent mixer |
| `fusion.js` | Preserve compatible v1 candidates; repair incompatible chords/basses; audit and filter actual legacy performance events |

## Timing contract

All musical positions use quarter-note beats, regardless of displayed meter. Audio transcription retains seconds; beats are `(seconds - firstBeatOffset) * BPM / 60`. Changing audio BPM does not alter the original buffer. MIDI playback integrates its full piecewise tempo map. Exports preserve that map unless a fixed-tempo override is selected.

Generated events are clipped to their vetted harmonic span. Browser synth releases end at note-off. Imported MIDI sustain is expanded into sounding note lengths. External instruments may add tails, modulation or tuning and require separate listening checks.

## Harmony contract

Allowed interval classes relative to every simultaneous melody note: `{0, 3, 4, 5, 7, 8, 9}`. This is a conservative product policy, not a universal definition of consonance. Chord extensions can still contain internal tension; the guarantee concerns accompaniment against the melody.

The candidate pool is a set of conventional chord qualities across 12 roots. Prefer full chords, then split on actual note boundaries if none fit. At the minimum span or split-depth limit, use a compatible reduced chord or silence. A dynamic-programming path balances melody chord tones, key membership, shared notes, root motion and seeded style preferences. Render each span with existing performance patterns, clip durations, then reject any failed actual-note audit.

The strict mode intentionally does not allow passing-tone exceptions or unresolved extensions. Future relaxed modes must be opt-in and must not silently weaken this contract.

## References

- de Cheveigné & Kawahara, *YIN, a fundamental frequency estimator for speech and music* (2002): https://pubmed.ncbi.nlm.nih.gov/12002874/ — original algorithm; the implementation here is a small independent JavaScript implementation.
- Web Audio decoding and complete-file requirements: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
- MIDI tempo and PPQ timing: https://learn.microsoft.com/en-us/windows/win32/multimedia/timing-information

Key inference uses standard Krumhansl major/minor pitch-class profiles as a heuristic, with a small final-tonic preference. No trained model or third-party recording is bundled. The example melody and rendered WAV were generated for this project.

## Legacy compatibility boundary

Without an imported melody, original mutations, voice planning, performance, sampled piano and MIDI export remain available. With melody, all chart render paths pass `protectChart`, including manual edits and undo; playback/export use `renderProtected`. The same original style engine runs first. Style changes do not overwrite imported tempo or key. Meter length is passed into legacy segment/voice planning, so 3/4 and 6/8 do not acquire four-beat gaps.

Volume: one melody bus defaults to 0.35 and a separate piano master retains its original 0.68 at harmony 100%. Melody sine amplitude is reduced from alpha 1; original audio is normalized downward only. Slider input updates gain targets without restarting playback.

Reference-scale and guitar-chord-melody audition remain separate tools; they do not play the imported melody simultaneously and do not carry its compatibility claim. Imported melody is included in the main score MIDI exports.
