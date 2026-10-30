# Height-channel intervention experiments

> **For agentic workers:** Execute this bounded evaluation plan inline using systematic-debugging, test-driven-development and verification-before-completion. Existing training and core planner behavior must remain unchanged.

**Goal:** Test separate responses to premature goal switching, actual-pose edge validity and insufficient execution clearance on the exact previously recorded maps.

**Architecture:** Evaluation-only adapters around the existing capture pipeline. An explicit intervention flag selects each arm; default capture remains the old learned policy. No map geometry or checkpoint changes, no retraining, and no hand-authored waypoints. A local-route arm is explicitly a policy-plus-executor experiment.

**Tech stack:** Existing Conda environment, NumPy/SciPy, PyTorch, Ray and Isaac Sim; no dependency changes.

**Spec:** User request: design a solution for each of the three identified problems and try the same maps.

## Constraints and decisions

- Only personally owned project directories; preserve unrelated dirty worktree changes.
- Evaluation scripts and output snapshots provide experiment isolation. Do not modify production Agent, PPO, MPPI, training entrypoint or its defaults.
- Old checkpoint SHA256 `a5190d39306e1b643da0d8b6b587e79ece1e982b54e866bd2d67997e41ef9c12`.
- Exact yesterday JSON files, spawn, seed 42 and roof; 128 one-second execution intervals per arm, one environment on physical GPU 1 because GPU 0 is occupied.
- Keep original observations immutable. Use only online map/pose for decisions; reference geometry is post-hoc measurement only.
- Report policy selections separately from execution intervals and local subgoal changes.
- Use physical mapper corner-origin convention for the new observed-space checks; retain the legacy lattice graph unmodified. This makes the new check a mapper-consistent real-pose check, not a claim that only graph-index anchoring changed.
- No training launches are part of this experiment.

## Arms

1. `baseline`: unchanged greedy policy, refreshed every second.
2. `arrival_hold`: retain a chosen goal until 3D error <=0.20 m or four execution intervals elapse. The lease is bounded; no infinite persistence.
3. `pose_mask`: mask policy candidates whose straight connection from actual pose crosses occupied, unknown or out-of-bounds observed voxels. The own-pose unknown cell alone may be exempted in a copied checker, never if occupied. No safety margin or alternate route in this arm.
4. `local_route`: retain one-second policy refresh, but route to the chosen candidate on observed free voxel centers with a 0.40 m conservative distance margin from occupied voxel boxes. Generate intermediate commands automatically. Unknown centers remain blocked. If the top candidate has no path, inspect other candidates in descending learned-policy score; log every rejection and acceptance. No reference map, gate positions or far-point coordinates may enter this code.
5. `hold_route`: combine the predeclared arrival lease and local-route executor to test their interaction, without adding the straight-line-only pose mask that would reject valid detours.

The local route uses six-connected A* and collision-checked path shortcuts, with a bounded local lookahead. Margin is an approximate online-map criterion, not a full dynamics/rotor guarantee. No feasible policy candidate is an explicit experiment stop, never an exploration-success label.

## Review focus

- Target lease expires, and goal arrival is measured in all three dimensions.
- Checker includes endpoints, distinguishes unknown/occupied/out-of-bounds and never changes raw observations.
- Routing goes around a lintel through the actual low opening; a sealed passage stays unreachable.
- No viable candidate is recorded as a failure; masks never select a padded/self action.
- Fixed simulation budgets and unchanged weight/map hashes; labels identify any overridden policy proposal.

## Tasks

- [ ] Run existing offline suite as baseline, snapshot the capture script and source hashes.
- [ ] Write failing unit tests for bounded arrival lease, actual-pose segment checks and a clearance-aware route through a synthetic alternating passage; run RED.
- [ ] Implement pure evaluation helpers in `scripts/height_channels/interventions.py`; run GREEN.
- [ ] Add explicit optional intervention support to capture and suite launcher, with unchanged defaults; log proposal, accepted goal, controller command, masks, current graph node, policy scores and controller predicted-path summaries.
- [ ] Prepare a five-arm triple-alternation suite referencing the same JSON bytes; run baseline first, then the independent arms and predeclared combination sequentially.
- [ ] Analyze gate crossings, no-map-change cycles, horizontal motion, path length, policy selections, contact ticks and explicit end reasons. Do not treat fewer altitude changes as navigation success.
- [ ] Evaluate the most informative intervention on close_pair, reverse_order and midheight_tunnel; mark comparisons on different seeds separately if added.
- [ ] Run appropriate offline checks, review experiment code, build English comparison GIF/page and ZIP, and update the already authorized personal website. Verify public artifact hashes.

## Progress

- Investigation: old capture uses deterministic greedy action selection, so the measured alternation is not action-sampling noise. Legacy lattice replaces current-node coordinates by the true pose after constructing graph edges; actual-pose edge filtering is currently RRT-only. The evaluation refreshes actions after 50 simulation ticks regardless of target arrival.
- Physical GPU 1 is free; no process on GPU 0 will be altered.
- Before any route-arm launch, recorded-input checks showed a point-free policy goal with conservative observed clearance 0.346 m. The route executor therefore projects a known-free goal to the nearest observed safe voxel center within 0.35 m when needed; it never projects an occupied/unknown goal. This displacement is logged, and the high-level policy goal remains unchanged.
- Phase 1 results: fresh baseline passed 66 intervals; arrival arm stalled before rollout while loading USD and was stopped with its logs preserved. Strict pose and route arms stopped at the first interval. CPU reconstruction found all seven graph candidates cross unknown cells only 0.02–0.03 m from the robot, between its position and calibrated sensor position.
- Phase 2 ruling: explicitly enable the existing tested `anchor_rigid_sensor_mount` only in copied intervention planning maps, then repeat baseline/A/B/C/A+C. The 0.1414 m mount is below one 0.2 m voxel, must match measured extrinsics, must end at an observed-free sensor cell, and cannot touch occupied/out-of-bounds cells. This is a calibrated short rigid-mount support assumption, not general unknown-space filling or a changed raw map. Preserve strict-arm failures separately. No USD-thread workaround has been applied.
- Runtime ruling after repeated asset-opening stalls: explicit intervention captures set `PXR_WORK_THREAD_LIMIT=1` before importing Isaac/OpenUSD (unless already configured). This only limits the experimental process's USD work concurrency; no system services/packages/settings are changed. Metadata records the setting; add a fresh baseline under the same setting and preserve the pre-setting runs. Official source: https://openusd.org/25.05/api/thread_limits_8h.html . This is a runtime workaround hypothesis, not a diagnosed root cause of the native issues.
- Route-design diagnosis: initial C and A+C ended with no gate crossings and no goal projections. Full-log counts are C: 59 direct / 5 bent routes; A+C: 114 direct / 14 bent routes. An earlier working note overstated this as zero bends; corrected after scanning all records. The 0.8 m lookahead unnecessarily changed every safe straight command, so those runs did not isolate obstacle detours. Add a separately labelled direct-preserving revision: keep a checked direct command intact, insert short commands only for route bends, and measure lease arrival at its projected executable endpoint. Both invariants have watched RED/GREEN tests; retain the initial short-lookahead runs and keep hypotheses separate.
- Exact-voxel diagnostic refinement: direct-preserving C stopped57 with actual reference clearance0.693m but a conservative occupied-center-minus-halfdiagonal lower bound0.3824m. Retain the0.4m margin and test optional `clearance_model=voxel_boxes`: exact point/segment distance to observed occupied voxel AABBs and a matching dilation footprint at voxel centers. Default remains conservative so completed/in-flight regressions retain their definition. Two explicit counterexamples watched RED/GREEN; an independent reviewer checked160 randomized segments against SciPy minimization and all1320 centers on a translated map atfour margins. This precision claim concerns observed voxel boxes, not the true robot swept volume or control tracking.
