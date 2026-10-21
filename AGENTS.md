# Repository engineering guidance

VowelScope work follows `vowelscope/AGENTS.md` and the persistent research files
under `docs/`. The active goal is independent acoustic accuracy and real-browser
microphone reliability, not completion of individual engineering milestones.

Preserve existing local commits and work in the isolated cloud checkout on its
development branch. Do not create another worktree unless requested. Keep raw
recordings, per-token references/predictions, caches and runtime output outside
this public checkout. Communicate research progress in Chinese, code/docs in English.

Mandatory targets on one frozen unseen population: F1 MAE <=80 Hz, F2 MAE <=160 Hz,
F2 p90 <=350 Hz and coverage >=95%, initially >=20 speakers and >=200 vowel tokens.
Never lower thresholds, tune on final labels, silently omit failed detections or
substitute synthetic audio/CI results for real-device evidence. Report blocking
rights/access/hardware conditions precisely. Do not publish a new default detector
or push unsafe production changes without user approval.
