# Actual desktop/mobile microphone validation protocol

Protocol date: 2026-10-13. Status: **actual-device tests not run**. The cloud
browser capability probe below was executed, but it cannot replace a desktop or
phone microphone session. No source audio, personal recordings or individual
speaker/token traces are committed by this protocol.

## Observed cloud capability

Read-only inspection found `/usr/bin/chromium`, reporting
`Chromium 154.0.8037.57 built on Debian GNU/Linux 13 (trixie)`, and an installed
Python Playwright module/CLI. No `/dev/snd/*` nodes or `/proc/asound` were
present; neither `DISPLAY` nor `WAYLAND_DISPLAY` was set. These observations
alone do not prove every possible remote device route absent.

A real headless Chromium process was then launched through Playwright against
a temporary local HTTP capability page. Loopback is a secure browser context.
The browser context granted microphone permission for this probe; **no fake
audio/device flags, synthetic MediaStream, file replay or virtual microphone
were used**. The page called `enumerateDevices()` and `getUserMedia({audio:true})`.
The observed result was:

```json
{
  "secureContext": true,
  "mediaDevices": true,
  "deviceKinds": [],
  "capture": "failed",
  "errorName": "NotFoundError",
  "errorMessage": "Requested device not found"
}
```

The probe returned a Linux HeadlessChrome/154 user agent. It acquired no stream;
the browser and temporary server were closed. This establishes an executable
browser/API path and no input device accessible through that path, not real
microphone reliability, mobile behavior or performance. A Chromium browser
emulating a mobile viewport/user agent remains a cloud browser; it does not
become Android Chrome or iOS Safari.

Relevant API documentation is the W3C [Media Capture and Streams specification](https://www.w3.org/TR/mediacapture-streams/)
and [Web Audio specification](https://www.w3.org/TR/webaudio/). These links specify
the intended API contracts; they were not accessible/read as part of this
capability probe. Runtime claims above come from observed execution.

## Freeze before recording

Record the exact application Git SHA and content digests of both locale HTML
files and all DSP assets, the collector's source SHA/hash (if instrumentation is
needed), tracking mode, slider values, language page and chart/profile settings.
Use production default Classic and actual HTML defaults for the primary run.
Any opt-in candidate is a separately identified comparison. A changed code or
configuration requires a new session, not a relabelled prior result.

For each physical device/browser record manufacturer/model, OS/browser version,
microphone make/type and connection, device sample-rate settings, browser zoom,
viewport/orientation, power mode, foreground/background state and test date.
Record requested capture constraints and actual `MediaStreamTrack.getSettings()`
values, including sample rate/channel count and echo cancellation, noise
suppression and automatic gain control when exposed, plus AudioContext sample
rate/state. An absent setting is **unknown**, not proof that processing is off.
Do not publish device identifiers, microphone labels or personal identities.

Preregister a quiet-room baseline, distance and angle (suggested built-in mic:
20 cm, normal conversational level) and one representative everyday-noise
condition. Record measured background level if a calibrated meter exists;
otherwise document the condition without inventing dB values. Specify an
ordered, repeatable script before examining estimates. Do not discard weak,
high-pitched or poorly tracked vowels after seeing errors.

## Required physical matrix

| Physical setup | Required browser | Purpose |
| --- | --- | --- |
| Desktop/laptop with an actual input microphone | Current supported Chrome or Firefox; record version | Real capture, permissions, resource cleanup and sustained desktop scheduling |
| Actual Android phone with built-in microphone | Chrome; record version | Android capture, orientation/background recovery and sustained scheduling |
| Actual iPhone/iPad with built-in microphone | Safari; record iOS/version | Safari AudioContext/user-gesture lifecycle, interruption and navigation behavior |

Run both Chinese and English pages on each setup. Use the same frozen build
served by a trusted HTTPS origin accessible to physical devices; desktop
loopback can be used for the desktop. A phone opening a laptop's ordinary LAN
HTTP address is not generally a secure context. Do not disable browser security
or TLS checks to bypass this requirement. Record the served build hash so a
stale deployed page cannot be mistaken for the tested revision. Deployment is
not part of this protocol's execution claim.

## Session sequence and evidence

1. Open a fresh page and inspect site permission state. Deny the first request;
   confirm an actionable message in the selected locale, stopped state and
   usable controls. Restore permission through browser settings, start again,
   and confirm a live input track and running AudioContext.
2. Perform the predetermined vowel script. Include sustained vowels, transitions,
   silence and ordinary speech. Compare raw accepted F1/F2 with displayed
   smoothed values in `?lab=1`, without using displayed values as references.
   Repeat the same scheduled script in the other locale.
3. Pause, reset, stop and restart. Repeat ten start/stop cycles, including one
   rapid stop during a pending start. Confirm capture tracks end and the browser
   microphone indicator turns off after stopping; check failures leave no
   abandoned capture and later starts acquire fresh resources.
4. During capture background the page for 15 seconds and return. On phones,
   rotate orientation, lock/unlock the screen and exercise one supported audio
   interruption (for example a local alarm). Record whether the track ends,
   context suspends, feedback freezes, and whether recovery requires an explicit
   restart. Unsupported interruption cases are marked unrun.
5. Navigate away while running, and test back/forward restoration. Verify
   microphone release on departure and document actual restart behavior. Close
   the tab and verify the capture indicator disappears. Do not infer cleanup
   from a stopped UI label alone.
6. Run a foreground sustained-capture session for ten minutes. Record processing
   attempts/completions, callback gaps, CPU time distribution, long tasks and
   dropped updates when a collector is available; note visible freezes, thermal
   warnings, battery/power state and crashes. Background throttling is reported
   separately. A Node benchmark or `requestAnimationFrame` unit test is not
   evidence for these physical-device timings.

Use bounded, minimal diagnostics; excessive console logging or profiling can
alter scheduling. Record collector overhead with a separate control run. Do not
invent an end-to-end latency from processing CPU time. Claim input-to-display
latency only with a declared timing method, synchronized stimulus/capture and
documented clock offsets. Without instrumentation, report lifecycle observations
and visible behavior; mark quantitative timing unavailable.

## Actual-microphone acoustic measurement

Device lifecycle tests and the independent corpus accuracy gate are separate
requirements. A speaker playing a corpus file through a loudspeaker into a
physical microphone can test a reproduction/capture chain, but is not a new
speaker population and changes the acoustic channel. Mark this separately; do
not substitute it for independent speakers speaking into the actual device.

For quantitative live acoustic validation, obtain consent and record actual
English vowel tokens from previously unused speakers. If the four numerical
targets are claimed for a device condition, that condition must itself use a
frozen population of >=20 independent speakers and >=200 reviewed tokens; a
small smoke session cannot establish those targets. Do not pool a strong desktop
condition with a weak mobile condition to hide device-specific failures.

Collect accepted unsmoothed estimates, acceptance times/window coordinates and
the **same captured PCM stream** used by the application. A private diagnostic
tap from the actual MediaStream/AudioContext requires a reviewed, pinned
collector with measured overhead and a documented sample/time mapping. The
current lab panel alone does not export such a synchronized record. Until that
collector is available, numeric live formant error remains unmeasured; screenshots
are not a substitute. If a browser recorder produces compressed audio, document
codec/time-base changes and validate alignment; do not assume it equals the
application's input PCM.

An independent annotator, blinded to application estimates, marks vowel
intervals and reviews F1/F2 measurements of the captured waveform against
spectrograms, using declared settings appropriate to each voice and a second
reviewer for disputed estimates. Praat Burg is an annotation aid, not an
automatic physical truth source. Record agreement/uncertainty and apply the
preregistered ambiguity rules before revealing algorithm errors. Withhold final
labels from tuning. References from a separate external microphone must not be
treated as the exact app-input reference without a measured channel/time mapping.

Use the same preregistered population, windows, raw accepted-estimate semantics,
nearest-rank p90 and denominators as the independent protocol. A missing detection
remains in the coverage denominator. Report coverage and paired F1/F2 errors for
each physical device, condition and mode; also report per-speaker aggregates and
speaker-cluster uncertainty where planned. Publish aggregate counts and metrics
only, with build/configuration provenance. Keep recordings, references and
individual traces private under their acquisition/retention terms.

## Acceptance and minimum external action

No device is validated until physical capture is observed and all applicable
permission/start-stop/navigation/suspension/ten-minute cases have actual results.
Classify each case as passed, failed, unsupported or unrun. Any capture leak,
unrecoverable start, wrong-locale error or unexplained foreground freeze must be
reported as a failure and investigated. Numeric accuracy passes only when all
four thresholds are met on the same complete eligible population; otherwise
report failed/unrun without weakening the targets.

The current blocker is physical access: this cloud's real Chromium capture
request returns `NotFoundError`. A virtual sound device or mock would change
that probe but would not supply a desktop/phone hardware test. The minimum
external action is an operator with a real desktop microphone, Android Chrome
and iOS Safari running the frozen build and returning the completed aggregate
session record. Remote device access that exposes real capture and diagnostics
can also satisfy the requirement if its hardware and provenance are documented.
For acoustic targets, provide the synchronized private captures/independent
references or a lawful route for the evaluator to access them. No actual-device
session, mobile performance result or microphone accuracy pass has occurred in
this assessment.
