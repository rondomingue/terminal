# Sacred Signal
Browser audio-reactive geometry studio using your SacredGeo_001.svg.

Run from this directory:

    python3 -m http.server 8765 --bind 127.0.0.1 --directory dist

Open http://127.0.0.1:8765. Load a song, play, and adjust visual controls. Export video restarts the song and records 1080×1920 canvas at 30 FPS together with audio. Finish & download stops early; otherwise recording ends with the song. Keep the tab visible during recording. Browser support chooses WebM or MP4; Chrome/Edge recommended for recording. Long exports accumulate in memory.

Audio is processed locally with Web Audio FFT: low 25–250 Hz, mid 250–2500 Hz, high 2500–12000 Hz. Demo mode simulates energy without sound. No song is bundled. Fonts are requested from Google Fonts; all audio processing stays local.

Verification: JavaScript syntax check; browser preview, demo controls, test WAV load, live spectral response, and recorder completion. The browser reported video exported with audio; downloaded media was not independently decoded. The supplied MOV reference could not be decoded with local AVFoundation.

Remote publication is pending user authorization following an automatic approval review rejection. A private Site was registered, but no source was uploaded and no version deployed.

## Layered geometry and percussion focus
All five supplied SVGs render as independently enabled layers, with opacity, scale, and response routing controls. Percussion mode (default) uses positive spectral flux, an adaptive threshold, and short retrigger limits for kick-like (35–180 Hz), snare-like (180–3500 Hz), and cymbal-like (4500–14000 Hz) attacks. It estimates transients in the mix, not isolated drum instruments. Hit threshold suppresses weaker triggers. For stronger instrument specificity, use a drum stem as input. Export retains the full loaded audio.

Run `node tests/percussion.cjs` for attack-band, sustain rejection, decay, and reset checks. Browser-verified all layer controls and the percussion demo; no console errors. The update remains local because remote publication has not been authorized.

Stories export uses a portrait 9:16 canvas at 1080×1920, 30 FPS. Preview matches export framing. MP4/H.264 is preferred when supported; browsers without MP4 recording export WebM with a conversion notice. The original audio remains included.

Phone layouts below 600px use a fixed bottom player, 44px playback and demo controls, larger sliders and checkboxes, safe-area padding, and compact two-column geometry controls. Select fields use 16px text to avoid mobile input zoom. The portrait preview is constrained to 68svh. Browser viewport verification was blocked by debugger synchronization timeouts; responsive visual QA remains unverified.

Video waveforms: a default-on overlay beneath the geometry draws kick, snare, and cymbal frequency-band waveforms and transient meters into the export canvas. Each waveform reads time-domain samples from its own highpass/lowpass analysis branch without changing the audible mix. These are filtered mix bands, not separated drum stems. Paused audio gives a flat trace; demo waveforms are labeled simulated. Use Video waveforms to hide the overlay. JavaScript syntax and percussion regression checks pass; browser visual QA for this addition has not been completed.

Clip recording: select 1 minute (default), 2 minutes, or Full song. Seek to a desired position and press Set start at playhead. The visible bracket shows source start/end and actual duration; clips stop at the selected endpoint or song end, whichever comes first. Full song records from zero. Export names include bracket seconds. Bracket calculations and JavaScript syntax were verified; timed browser recording QA remains pending.
