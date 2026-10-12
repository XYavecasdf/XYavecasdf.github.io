# ConsonantScope v1

User-authorized implementation of the in-chat design: a separate GitHub Pages sibling of VowelScope, preserving its cream/teal visual system and linking back to the original. Browser-local audio only. Chinese and English interface toggle.

Pulmonic consonant table plus aspiration, affricate and coarticulation extensions. Five explicitly qualified inventory profiles with A/B highlighting; profiles are educational phonological conventions, not measured acoustic norms. Retain every chart symbol when comparing.

Controlled recording/upload: Mandarin b/p, d/t, g/k in CV and VCV contexts; English b/p, d/t, g/k in specified contexts. 3-second recordings; PCM capture through AudioWorklet. Replay whole audio and selected burst/onset interval. Upload maximum 20 MiB, duration maximum 10 seconds; recordings are not uploaded to a server. WAV/CSV exports through explicit user actions. No cross-session persistence of voice recordings.

Waveform and locally computed STFT powered by vendored MIT FFT.js. Automatic positive-VOT boundary suggestions are conservative unvalidated heuristics, not AutoVOT/wav2VOT inference or correctness judgments. Manual boundary correction supports signed VOT; fully voiced intervocalic closures should use manual inspection. Closure start is manual and only reported in VCV context. Never infer actual phoneme identity from the prescribed target.

Reject silence, sustained vowel without a burst, weak signal, clipping and ambiguous candidates. Display unavailable rather than fabricating a measurement. Store per-trial target, language, context, sample rate, provenance and markers. Synthetic examples are explicitly labelled artificial signals and only demonstrate analysis, never native pronunciation.

Validation: FFT frequency recovery; known positive delay; silence/vowel/noise rejection; signed manual measurements; closure validity; WAV encoding; data integrity. Browser verification where available, with microphone-device limitations reported.
