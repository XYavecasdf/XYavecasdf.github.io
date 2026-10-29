# Triple-alternation failure evidence

The seed-42 run exhausted **128 decisions**, crossed only `high_1`, and did not visit the representative far-region point. It remained in a repeated height-changing motion before the low gate while the planner retained positive utility. This supports a failure involving action selection, graph clearance and physical waypoint execution; it does **not** establish a model-only failure or a physically impossible layout.

This read-only CPU analysis used `triple_alternation/restricted/analysis.json`, `evaluation/{planner_diagnostics.json,selected_actions.json,exploration.npz,final_planner.npz}`, all relevant raw `planner_inputs`, and reference geometry. No GPU evaluation or production changes were made. Coordinates are local to map24; world coordinates add `(20,-40,0)`. Each decision spans 1 simulated second; dense samples are 0.02 s apart.

## Where progress stopped

The three gates span X14–16 and are centered at Y12.1 (`high_1`, opening Z1.4–2.9), Y13.6 (`low`, Z0.1–1.6), and Y15.1 (`high_2`, Z1.4–2.9). Each gate is 0.2 m thick.

The only crossing is `high_1` at **51.364 s**, decision52, local center **(14.96194,12.1,2.13784)**. The trajectory then reaches at most Y12.99446; it never reaches the low-gate plane Y13.6.

From decisions **54–128**, targets alternate every decision between **(15,15,2)** (38 selections) and **(15,13,1)** (37 selections). Actual dense positions stay within:

- X14.72390–15.18552;
- Y12.67321–12.89024;
- Z1.05849–2.21022.

During those 75 decisions, the vehicle travels **69.085 m**, including **64.724 m accumulated absolute altitude change**, with only **0.186 m net horizontal displacement**. The existing stall rule returns no flags because it measures 3D net displacement; repeated altitude motion exceeds its displacement threshold. Thus “no stall flags” misses this horizontal plateau.

| Decision | Starting actual pose | Target | Ending actual pose |
|---|---|---|---|
| 52 | (14.9911,11.8821,2.1157) | (15,13,1) | (14.9389,12.7546,1.8260) |
| 53 | (14.9389,12.7546,1.8260) | (15,13,1) | (14.8226,12.8479,1.1242) |
| 54 | (14.8226,12.8479,1.1242) | (15,15,2) | (14.8905,12.7644,2.0760) |
| 55 | (14.8905,12.7644,2.0760) | (15,13,1) | (14.9155,12.8712,1.2413) |
| 128 | (14.7647,12.8494,1.2054) | (15,15,2) | (14.9887,12.7639,2.0798) |

The high target repeatedly induces a climb with little forward motion; the next low target induces descent. The captured data do not include MPPI rollout costs or control commands sufficient to identify why forward progress is rejected.

## Four selected straight segments are genuinely blocked in reference geometry

The endpoints themselves are outside reference obstacles: no selected waypoint is inside a solid, and neither repeated target has clearance below 0.4 m. However, target clearance is not edge clearance. Independent exact closed-segment/AABB intersection tests confirm the analyzer's four flagged actual-start-to-selected-target segments:

| Decision / sim interval | Actual starting Y,Z | Solid intersected | Segment entry Y,Z | Segment exit Y,Z |
|---|---|---|---|---|
| 72 / 71–72 s | 12.84709,1.40949 | low lintel | 13.54166,1.60000 | 13.70000,1.64343 |
| 80 / 79–80 s | 12.78623,1.32826 | low lintel | 13.68177,1.60000 | 13.70000,1.60553 |
| 106 / 105–106 s | 12.84206,1.40185 | low lintel | 13.55694,1.60000 | 13.70000,1.63966 |
| 110 / 109–110 s | 12.79489,1.46341 | low lintel | 13.50000,1.63499 | 13.70000,1.68366 |

All four target **(15,15,2)**. The low lintel occupies X14–16, Y13.5–13.7, Z1.6–3.0. Their actual starting poses are **0.396–0.520 m from the preceding low target (15,13,1)**. Those tracking offsets turn the requested straight connection into an obstacle-intersecting segment on these four occasions.

This is not proof of actual collision: the realized trajectory stays before that lintel, may curve, and records zero rotor-contact ticks. Most other high-target straight segments narrowly avoid point solids but have little clearance; over the entire run, 44 selected segments have sampled reference clearance below 0.4 m. It is therefore inaccurate to describe the whole plateau as repeatedly attempting an exactly blocked point segment: four segments are solid-intersecting, while many more are clearance-constrained.

The final graph still contains the direct edge **(15,13,1) ↔ (15,15,2)**. That ideal node-to-node segment is point-clear through the low opening; it differs from the connection starting at the actual vehicle pose. Final utilities at those nodes are 16 and 72. The final global path is `(15,13,1) → (15,15,2) → (15,16,2)`.

The separate ideal-reference analysis found a start-to-target path for this case with exact point geometry, but none after expanding every obstacle AABB by 0.4 m. That expansion is a conservative box-clearance reference, not an exact body or MPPI dynamics model. Together, these facts identify a concrete graph/clearance/execution compatibility concern without proving that a continuous physically executable trajectory is absent.

## Positive utility persists after observations stop changing

Across decisions54–128, the graph's utility sum remains positive, ranging **417–462**, with **four valid actions** each decision. There are initially some new observations: this interval adds 139 newly known voxels and 20 state changes to already known voxels; 58 of its 75 decisions produce no raw occupancy-map state change.

The last map change is decision102. Raw maps in `planner_inputs/0103.npz` through `0129.npz` are **byte-for-byte identical**. Inputs0103–0128 are the pre-action observations for decisions103–128; 0129 is the final post-action observation. Robot states continue changing, so the complete planner inputs are not identical.

For decisions **103–128**, all 26 decisions switch target height; the raw occupancy map gains no known voxels and changes no existing states. The vehicle travels **22.633 m**, including 21.141 m absolute altitude change, with only **0.0369 m net XY displacement**. Utility remains exactly **452**, positive-utility nodes remain 9, and valid actions remain 4. Terminal `done_zero_utility`, `done_no_guidepost` and `agent_done` are all 0. The run ends because of the decision cap, not planner completion.

At sampled plateau inputs, both repeated targets are marked free, the low opening point `(15,13.6,1)` is free, but `(15,13.6,2)` inside the reference lintel is unknown. Unknown occupancy alone does not prove a graph bug: the retained ideal lattice edge passes below that point. Full graph candidates, selected action indices, per-action scores and controller cost breakdowns were not stored at every decision.

## Comparison and causal limits

`reverse_order` crosses both named gates in 85 decisions, with 16 target-height switches and zero rotor-contact ticks, then ends on utility completion. Its representative far-region point is nevertheless unvisited. Different map/gate geometry makes this a useful contrast, not a controlled explanation of the triple failure or a full-coverage success claim.

The strongest supported diagnosis is a persistent two-target cycle coupled to low horizontal progress near tightly alternating gates, despite positive planner utility. Four actual-start straight requests intersect the low lintel, and the graph's ideal point-clear edge lacks the conservative clearance connectivity of the expanded reference. Useful next instrumentation would record selected action IDs/scores, current-pose edge checks, graph candidate clearances, and MPPI predicted trajectories/cost terms during this plateau. The current data cannot isolate policy preferences, graph construction, observation uncertainty, controller cost/horizon or waypoint timing as the sole cause.
