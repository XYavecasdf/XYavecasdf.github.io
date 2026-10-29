# Ideal reference lattice connectivity

This is a bounded CPU-only geometric reference. It does not reconstruct the actual observed planner, policy choices, controller trajectories or sensors.

The reference samples integer local X,Y from 0 through 19 and Z∈{1,2}, then removes nodes on or inside any solid box. Candidate undirected edges have length ≤ 2.99 m and must avoid all closed AABBs. Surface touching is blocked. Exact spawn and far-region target XY are each attached at Z 1.5 through the same radius/edge checks. Every supplied box, including original walls, roof and added gates, participates.

The second reference expands each obstacle box by 0.4 m along every axis. This is a conservative box-clearance construction, not an exact spherical swept-volume test or a physical vehicle model.

| Case | Expansion | Free lattice nodes | Total vertices including endpoints | Clear edges | Start/target degree | Path exists |
|---|---:|---:|---:|---:|---|---|
| seed43_recheck | 0.0m | 566 | 568 | 6369 | 34/36 | Yes |
| seed43_recheck | 0.4m | 566 | 568 | 6151 | 34/32 | Yes |
| triple_alternation | 0.0m | 566 | 568 | 6365 | 34/36 | Yes |
| triple_alternation | 0.4m | 565 | 567 | 6143 | 34/32 | No |
| reverse_order | 0.0m | 582 | 584 | 6992 | 24/12 | Yes |
| reverse_order | 0.4m | 582 | 584 | 6777 | 22/10 | Yes |
| close_pair | 0.0m | 616 | 618 | 8208 | 50/10 | Yes |
| close_pair | 0.4m | 614 | 616 | 8068 | 50/10 | No |
| midheight_tunnel | 0.0m | 564 | 566 | 6368 | 34/36 | No |
| midheight_tunnel | 0.4m | 564 | 566 | 6160 | 34/32 | No |

All ten endpoint positions remain outside solid/expanded obstacles. Seed43_recheck shares the original map24 restricted geometry; the seed has no role in this deterministic reference.

## What the midheight tunnel reveals

The tunnel occupies Y 12.7–14.5 with opening Z 1.0–2.0. Both old lattice heights lie on its solid sill/lintel surfaces. At X 15, Y 13 and 14, neither Z 1 nor Z 2 is a free node. Nodes before and after the tunnel must jump at least from Y 12 to Y 15: a 3 m separation already exceeds the 2.99 m radius. A diagonal Z 1 ↔ Z 2 edge is longer still. Accordingly, the ideal old lattice has no start-to-target path, even with point geometry and full knowledge. The 0.4 m box expansion leaves a continuous center-height interval Z 1.4–1.6 but still contains neither old height.

This is a representation/connectivity limitation under the stated static graph model. It does not by itself predict actual online-planner success or failure: online current-pose nodes, global paths, observations and physical trajectories may differ.

| Supplemental tunnel probe | Expansion | Free lattice nodes | Clear edges | Path exists |
|---|---:|---:|---:|---|
| Add Z 1.5 to the sampled levels | 0.0m | 848 | 14850 | Yes |
| Add Z 1.5 to the sampled levels | 0.4m | 848 | 14370 | Yes |

Adding Z 1.5 produces a collision-checked global route through the same tunnel in both references. These witness polylines are stored in the JSON, substantiating the distinction between continuous geometric feasibility and the old two-height lattice. The extra height is an analytical probe only; no planner settings were changed.

## Limits

Reachability is existential, not a rollout or learned-policy guarantee. Full map knowledge removes sensing/unknown-space constraints; arbitrary available graph edges omit graph-update, utility, guidepost, padding and action-selection restrictions. The graph has no acceleration, tracking, rotor, orientation or timing model. AABB expansion is deliberately conservative around box corners. Start/target Z 1.5 and exact representative XY are specified endpoint assumptions; reaching that representative point differs from complete coverage or the rollout visitation radius. The JSON records connected-component sizes, endpoint degrees, geometric hashes and BFS witness paths for reproducibility.

Analysis wall time: 0.625s; no GPU job or production-code changes.

## Supplemental half-meter XY probe

This analytical probe changes only the global reference XY spacing to 0.5 m (X,Y=0,0.5,…,19.5). It retains Z∈{1,2}, radius 2.99 m, exact endpoint assumptions and closed-AABB segment checks. It does not change the actual planner or test learned-policy/controller execution.

| Case | Expansion | Free lattice nodes | Clear edges | Path exists |
|---|---:|---:|---:|---|
| triple_alternation | 0.0 m | 2727 | 145392 | Yes |
| triple_alternation | 0.4 m | 1854 | 82840 | Yes |
| close_pair | 0.0 m | 2832 | 173273 | Yes |
| close_pair | 0.4 m | 2124 | 120893 | Yes |

**The 0.5 m XY reference restores connectivity for both cases under the 0.4 m AABB expansion while keeping the original two Z levels and radius.** The original 1 m XY reference is reachable with point geometry but disconnected under the 0.4 m AABB expansion for both cases. The refined reference results above test whether more horizontal waypoint locations alone restore that conservative straight-edge connectivity; they are an existence test, not a claim that a local adaptive sampler will construct those nodes or the policy will select a useful route. Stored BFS witness polylines allow review of successful paths.

Additional bounded CPU analysis wall time: 3.111 s.

The expanded-reference witnesses cross each required gate at the intended height. Triple uses vertical staging at `(15,13,1↔2)` and the newly available half-meter position `(15,14.5,1↔2)`; close_pair uses the new position `(15,10.5,1↔2)`. Triple gate-plane crossings are `(14.82,12.1,2)`, `(15,13.6,1)`, `(14.85,15.1,2)`; close-pair crossings are `(14.7875,11.35,2)` and `(15,9.85,1)`. These witness paths use the intended passages rather than bypassing the gates.
