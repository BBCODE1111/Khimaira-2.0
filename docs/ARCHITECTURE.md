> Current revision: [alpha.8 beta fixes](BETA-20261026.md). Older entries below describe their historical versions; strict all-note/core-only and accompaniment-only limitations have changed.

# Architecture · Alpha 6

The workbench uses native ES modules; the audio transcription worker uses a bundled Basic Pitch / TensorFlow runtime. There is no server-side audio processing.

| Module | Responsibility |
| --- | --- |
| `midi.js` | Bounded SMF parser, sustain handling, per-track/channel notes, tempo map conversions, type-1 writer at PPQ 960 |
| `analysis.js` / `analysis-worker.js` | Retained legacy YIN pitch, median filtering, RMS onset/release refinement, repeated-note segmentation, heuristic BPM alternatives, duration-weighted key profiles |
| `harmony.js` | Chord candidate compatibility, adaptive phrase splitting, dynamic-programming path selection, actual-note audit |
| `engine/` | Existing KHIMAIRA harmony vocabulary, voicing and performance patterns, reused as local source |
| `export.js` | Encode, reparse, audit exact MIDI timing before download |
| `player.js` / `piano.js` | One Web Audio clock, tempo-map/loop/cue scheduling, original audio alignment, original Salamander piano with strict in-note releases in melody mode, live gain buses |
| `app.js` | Original 1.0 workbench and all legacy controls, plus the melody integration boundary |
| `melody-workspace.js` | Optional audio/MIDI import, analysis, note edits, meter, tempo map, piano roll and independent mixer |
| `fusion.js` | Preserve compatible v1 candidates; repair incompatible chords/basses; audit and filter actual legacy performance events |

## Timing contract

All musical positions use quarter-note beats, regardless of displayed meter. Audio transcription retains seconds; beats are `(seconds - firstBeatOffset) * BPM / 60`. Changing audio BPM does not alter the original buffer. MIDI playback integrates its full piecewise tempo map. Exports preserve that map unless a fixed-tempo override is selected.

Rhythmic templates run on full bars; voice slots are remapped at their scheduled attacks to the active chord, rather than restarting the pattern for each harmony segment. Sustains retain span-based voice leading; ARP retains its existing global step grid. Actual note lengths are checked against the reference melody. Melody synth releases end at note-off. Harmony sample releases may extend within the audited compatibility window. Imported MIDI sustain is expanded into sounding note lengths. External instruments may add tails, modulation or tuning and require separate listening checks.

## Harmony contract

Strict mode allows interval classes `{0, 3, 4, 5, 7, 8, 9}` relative to every simultaneous melody note. Alpha 4 adds the explicitly labelled musical-color mode (UI default), which also permits `{2, 10}` while rejecting semitones and tritones. The same selected policy is passed to chord search, performance repair, audible release checks and re-parsed MIDI auditing. This is a conservative product policy, not a universal definition of consonance. Chord extensions can still contain internal tension; the guarantee concerns accompaniment against the melody.

The candidate pool is a set of conventional chord qualities across 12 roots. Prefer full chords, then split on half-beat grid positions in the web workbench if none fit (the standalone API retains its optional note-boundary split mode). At the minimum span or split-depth limit, use a compatible reduced chord or silence. A dynamic-programming path balances melody chord tones, key membership, shared notes, root motion and seeded style preferences. Render a bar-based rhythm template, map notes to active harmony, repair incompatible pitches or shorten/omit impossible sounds, then reject any failed actual-note audit.

The strict mode intentionally does not allow passing-tone exceptions or unresolved extensions. The selected policy must remain explicit in the UI and in the audit label; zero hard clashes in musical-color mode does not claim zero musical tension.

## References

- de Cheveigné & Kawahara, *YIN, a fundamental frequency estimator for speech and music* (2002): https://pubmed.ncbi.nlm.nih.gov/12002874/ — original algorithm; the implementation here is a small independent JavaScript implementation.
- Web Audio decoding and complete-file requirements: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
- MIDI tempo and PPQ timing: https://learn.microsoft.com/en-us/windows/win32/multimedia/timing-information

Key inference uses standard Krumhansl major/minor pitch-class profiles as a heuristic, with a small final-tonic preference. The Apache-2.0 Basic Pitch model is bundled as of alpha 4; no third-party source recordings are bundled. The example melody and rendered WAV were generated for this project.

## Legacy compatibility boundary

Without an imported melody, original mutations, voice planning, performance, sampled piano and MIDI export remain available. With melody, all chart render paths pass `protectChart`, including manual edits and undo; playback/export use `renderProtected`. The same original style engine runs first. Style changes do not overwrite imported tempo or key. Meter length is passed into legacy segment/voice planning, so 3/4 and 6/8 do not acquire four-beat gaps.

Volume: one melody bus defaults to 0.35 and a separate piano master retains its original 0.68 at harmony 100%. Melody sine amplitude is reduced from alpha 1; original audio is normalized downward only. Slider input updates gain targets without restarting playback.

Reference-scale and guitar-chord-melody audition remain separate tools; they do not play the imported melody simultaneously and do not carry its compatibility claim. Imported melody is a reference only: main score exports and drag payloads omit the Melody track physically, preserving the tempo conductor and harmony track. Export first audits quantized reference+accompaniment, then rounds accompaniment inward and audits the delivered notes against the unquantized reference. The internal encoder still supports dual-track exports for regression tests.


## Direct note editing (alpha 3)

`piano-roll.js` owns SVG pointer capture, pitch/time coordinates, scrollable 128-semitone rows, sticky piano/ruler, snap/zoom, selection and keyboard gestures. Pointer movement changes only the preview; pointer release commits one immutable note snapshot. Escape, pointer cancellation and window blur restore the preview. Released-pointer hit testing preserves double-click editing despite capture retargeting. Pure vertical moves preserve imported microtiming; both resize edges preserve the opposite edge.

`note-edit.js` provides bounded coordinate transforms and a 50-snapshot note undo/redo history. `MelodyWorkspace.commitNotes` validates the entire result, snapshots prior notes, synchronizes audio-derived seconds, stops playback and triggers the existing `edit` integration path. `protectChart` and `renderProtected` then refresh the accompaniment; playback/export consume the same edited notes. New import/track resets history and viewport; tempo/offset regridding clears old beat-based history. Audio edits select detected-note audition and explicitly distinguish the untouched source waveform.


## Alpha 4 repairs

`neural-worker.js` resamples at its boundary (workspace supplies mono 22,050 Hz), calls the vendored Basic Pitch / TensorFlow WASM runtime, and passes activations to `transcription.js`. A dominant-line dynamic-programming decoder penalizes brief pitch jumps, bridges short same-pitch dropouts and preserves strong new onsets. Model tensor scopes are disposed per window and the worker is terminated at completion/cancel. No source recordings, recording-derived activations or licensed sample-pack audio are committed.

`sourceHints` recognizes conventional BPM and explicit major/minor tokens in filenames. The workspace tracks file/estimate/manual provenance separately, keeps labelled loop silence at beat zero, and requires an audio review action before automatic accompaniment. These labels do not constrain or rewrite predicted pitches. Unlabelled freely sung phrases retain BPM/key ambiguity; TAP and manual values remain available.

`rewriteWithMelody` searches safe half-bar harmony spans using the original style's qualities and candidate preferences, with a penalty for repeating the previous displayed choices. `applyMutation` retries based on the final rendered chord chart, not the pre-protection candidate. Strict mode retains its original interval contract; musical-color mode uses the separately displayed wider interval set.

`renderProtected` replaces unsafe ornaments with nearest safe chord tones where possible, otherwise clips only the conflicting remainder. Duplicate attacks are consolidated. Adjacent held common tones tie across boundaries; rhythmic attacks remain independent. A short natural piano release is bounded by the next conflicting melody, same-pitch reattack and score end; the extended audible events also reach MIDI auditing. Playback carries `gateEnd` separately to shape the release. `melody-synth.js` provides deterministic harmonic waveforms, low-pass filtering and short-note-safe envelopes without pitch-obscuring detune.

## Alpha 5 editor

PianoRoll owns an index selection set and transient pointer gesture. Marquee, move, resize and draw previews do not mutate the project until pointer-up; one gesture is one history step. Group movement uses one bounded delta so it preserves relative timing and intervals at pitch/timeline limits. Empty melodies are editable and undoable; pure harmony generation still requires a nonempty reference. Touch uses explicit select/draw/erase/pan tools, a sticky horizontally scrollable toolbar and shared nudge actions. Numerical editing remains optional.

## Alpha 6 melody-first arrangement

`melody-arranger.js` scores diatonic core triads against duration-weighted phrase coverage, represented core tones and root presence. The workbench's basic rebuild and style GENERATE use that core, with a half-bar split only when materially improved melodic coverage supports a different arrival. Safe style colors preserve the core root and tones (power chords may omit the third). Previous colors may be avoided on explicit GENERATE; quick comparisons are deterministic. Legacy advanced harmonic mutations remain separate.

With `followMelody` enabled in workbench performance options, meter anchors and melodic harmonic arrivals augment the genre template; dense phrases reduce weak-subdivision velocities. Sustained textures retain held notes. Every actual event still passes the chosen interval audit and the accompaniment-only export contract.

Piano buffers store a bounded 2%-of-local-peak attack offset; melody-mode `Piano.note` starts at that offset. Both melody and harmony now reach the same compressor input, so the compressor lookahead does not delay only the piano. V1-only calls retain the original source offset.
