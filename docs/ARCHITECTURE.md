# Architecture · Alpha 1

The website is dependency-free ES modules. There is no server-side audio processing.

| Module | Responsibility |
| --- | --- |
| `midi.js` | Bounded SMF parser, sustain handling, per-track/channel notes, tempo map conversions, type-1 writer at PPQ 960 |
| `analysis.js` / `analysis-worker.js` | YIN pitch, median filtering, RMS onset/release refinement, repeated-note segmentation, heuristic BPM alternatives, duration-weighted key profiles |
| `harmony.js` | Chord candidate compatibility, adaptive phrase splitting, dynamic-programming path selection, actual-note audit |
| `engine/` | Existing KHIMAIRA harmony vocabulary, voicing and performance patterns, reused as local source |
| `export.js` | Encode, reparse, audit exact MIDI timing before download |
| `player.js` | One Web Audio clock, 160 ms lookahead, tempo-map scheduling, original audio alignment, bounded note releases and cancellation |
| `app.js` | Local import flow, editable analysis, SVG piano roll, style controls, safe playback and export |

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
