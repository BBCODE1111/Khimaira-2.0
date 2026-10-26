# KHIMAIRA 2.0 · Melody Lab

**2.0.0-alpha.9 — 2026-10-26 beta review fixes.** A melody-aware harmony workbench, with 48 style presets, editable MIDI notes, audio transcription and MIDI export. This is the separate 2.0 project; the 1.0 website and plug-in sources are retained.

## This revision

- **Q / Quantize** moves selected note onsets (or all notes when none are selected) to the preceding SNAP grid, preserving duration, pitch and velocity. Already aligned notes stay in place; FREE disables quantize. One Undo restores the edit. Press Q with the piano roll focused.
- **PLAY** always restarts from bar 1; **STOP** stops; **Space** toggles playback/stop, using a manually selected bar cue when set. PLAY stays labelled PLAY during playback. Action buttons include small monochrome function icons.


- Smooth harmony weighs notes by duration and beat position. Short offbeat passing notes no longer force chord-per-beat changes. Strict fit remains available; unchanged results offer **LOOSEN FIT**.
- Dominant tritones are allowed when both pitches belong to the sounding chord. Remote major sevenths below the melody are permitted in smooth fit; close semitone clashes remain rejected. The rendered notes and decoded MIDI are audited with the same chord context.
- Style families have different chord vocabularies: seventh chords and ii–V motion, supported secondary dominants and tritone substitutions, Gospel slash/diminished options, Rock power/borrowed chords, Classical inversions and cadential options, Ambient suspensions/pedal options, and Blues sevenths. These are melody-constrained heuristics, not full genre composition models.
- Pickups default to **N.C.**, with a settings toggle. 3/4 uses whole-beat harmonic splits; 6/8 uses dotted-quarter splits. Pop, Ballad, Jazz, Classical, Folk and Ambient have meter-specific patterns. Ballad now uses broken upper voices.
- Accompaniment stays at least two semitones below concurrent melody notes. If necessary, voices move down, are reassigned to chord tones, or are shortened/omitted. Low-register melodies show a hint.
- English-first editor: **IMPORT / DRAW / DEMO**, a compact BPM/key/meter settings chip, then the piano roll. Help is in popovers; mixer and note table are collapsed. The roll shows a chord lane, auto-fitted pitch range, thin accompaniment bars behind melody, and a following playhead. **?** opens shortcuts.
- Phone editor: 44px compact chord strip, 55vh roll, horizontal style chips, touch controls and bottom-centred transient status messages.
- **LOCK** in the chord editor preserves that chord span through generation. **MIDI** opens one export panel: Performance/Sustain, optional melody, separate bass/chord tracks, and chord marker events. A text chord chart is also available.
- **COUNT-IN / CLICK** use the playback audio clock. Projects autosave locally and can be saved/loaded as JSON, including melody notes, chord locks, tempo map and mixer settings. Original audio recordings are not embedded; reimport them for original-audio audition.

## Run and verify

```sh
node --test tests/*.test.js
python3 -m http.server 5180 --directory dist
```

Open [the local workbench](http://localhost:5180). ES modules and Workers require HTTP.

The six supplied MIDI fixtures live in `tests/fixtures/beta-20261026/`. Regression coverage includes all **48 styles × 7 melodies**, genre differences, ii–V/dominants, pickups, meter, register, spelling, chord locks and project validation.

For browser verification, make Playwright available to Node and run:

```sh
node scripts/verify-beta-browser.cjs
node scripts/verify-quantize-browser.cjs
```

It uses an installed Chrome by default (`BROWSER_CHANNEL` and `BASE_URL` are configurable), exercises actual downloads and editor controls, and writes screenshots/sample exports to `docs/qa-20261026/`.

[Revision notes and verification](docs/BETA-20261026.md) · [Earlier validation history](docs/VALIDATION.md) · [Architecture](docs/ARCHITECTURE.md)

## Limits

Audio analysis targets clean monophonic clips, not vocal isolation or polyphonic transcription. BPM/key detection can be wrong; check the result before confirming. Changing playback tempo preserves recognized note positions and pitch; source-audio time stretching is not implemented. Original audio is available only at its calibrated source tempo.

MIDI supports SMF type 0/1, PPQ, ordinary notes, sustain and tempo maps. Changing meters, SMPTE/type 2 and noncentral pitch-bend melody tracks are rejected. MPE, microtuning and detailed expression are not reproduced. Limits: 120 seconds / 40 MB audio, 8 MB MIDI, 2,000 melody notes and 512 quarter-note beats.

Protection covers the edited melody and the actual accompaniment events. It does not guarantee subjective musical quality, correct audio transcription, absence of internal chord tension, or the release/reverb behaviour of instruments in a DAW. In very low or dense melody passages, fewer accompaniment voices may survive.

Validation uses desktop Chrome and touch emulation. Safari, Firefox, physical phones and DAW interoperability still require manual testing. There is no 2.0 plug-in release in this revision.

## Audio transcription build

Use `pnpm install --frozen-lockfile --ignore-scripts`, then `pnpm build:transcriber`. Basic Pitch and TensorFlow run locally; the model, WASM and bundled runtime are served from `dist/vendor/`. User audio is not uploaded. Fonts may load externally. Salamander piano sample attribution is in `dist/research.html`.
