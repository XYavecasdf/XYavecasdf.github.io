# Terminal-state checks: midheight tunnel and reverse order

Read-only CPU inspection of final planner snapshots, raw planner inputs, dense trajectories, summaries and diagnostics. Coordinates are local to each tile; elapsed simulated time is dense sample ×0.02 s. No rollout, GPU work or production change was performed.

## Midheight tunnel: retained utility exhausted, frontiers remain

The run ends at **decision 51 / 51 s** with `utility_done`, no gate crossing, and the representative far point unvisited. It ends at local **(4.91484,4.01616,2.01181)**, away from the tunnel at Y12.7–14.5.

At the final graph update, utility is **8 before graph update and after neighbor update, then 0 after utility update**. The number of positive-utility nodes changes from 1 to 0. All **152 retained graph nodes have utility 0** in the saved final snapshot. Both policy guidepost columns sum to 0 and `global_path` is empty. Thus both existing stop conditions are true: `done_zero_utility=1` and `done_no_guidepost=1`. This is the concrete reason the runner stops; it does not use a complete-coverage test.

Raw frontier presence is different from retained graph utility:

| Final measurement | Count |
|---|---:|
| Global raw frontier coordinates | **210** |
| Tracked local frontier coordinates | **117** |
| Retained graph nodes | 152 |
| Positive-utility graph nodes | **0** |
| Valid actions | 26 |
| Unknown / free / occupied raw voxels | 105752 / 35788 / 8460 |

The 210 global frontiers were independently recomputed from the final raw map using the implementation's six-neighbor unknown and 26-neighbor occupied tests. The final raw input 0052 exactly matches the saved planner map. The last update changes 17 existing voxel states, with no newly known voxels; its map is not merely an unchanged observation.

The utility implementation assigns observations to graph nodes using range, vertical field of view and line checks, then suppresses node utility below `MIN_UTILITY=8`. Consequently, remaining raw frontiers do not guarantee positive retained utility. The saved data identify the final 8→0 transition but do not preserve unthresholded per-node frontier counts before that update; they cannot isolate which frontier removals, visibility changes or threshold effects eliminated the last utility.

The raw map still has 82 frontier points with Y>14.5, and nearest grid samples around the representative target XY (6.9,15.5) are unknown at Z 1,1.5 and 2. These are evidence against equating this stop with mapped coverage; they do not establish that every remaining frontier is reachable. The separate reference analysis shows no route in the ideal old Z 1/2 lattice but a route after adding Z 1.5. This is consistent with a representation limitation, without proving that it alone caused the observed utility exhaustion.

## Reverse order: gate crossings and representative-point visitation differ

The run crosses both required gates and stops on utility completion at **decision 85**. The reported representative-point visitation rule is strictly **minimum XY distance <1.2 m**; it ignores altitude and is separate from crossing the gate planes.

The target is local **(5.1,5.1)**. The dense trajectory's minimum XY distance is **1.949168 m**, at sample 2878, **57.56 s**, local pose **(3.152374,5.177521,2.043598)**. It therefore misses the visitation threshold by **0.749168 m**, so `far_pocket_visited=false` is numerically correct. At that closest point the vehicle is beyond the second gate at Y8.1; crossing into the far side does not force it to approach the selected representative coordinate.

Nearest grid samples around the target are observed free at Z 1,1.5 and 2 in the final map. The ideal point and 0.4 m expanded reference graphs both have a path to this target. These results provide no basis for calling the point physically unreachable. Conversely, observed free voxels and gate crossings do not certify complete exploration or actual visitation of that point.

Reverse order also terminates with zero retained utility (18→0 during the last utility update), despite **103 global raw frontiers**, 78 tracked local frontiers and 26 valid actions. All 232 final node utilities are 0 and the global path is empty. Its end reason records exhaustion of the current planner's utility/guideposts, rather than a validated full-coverage outcome.
