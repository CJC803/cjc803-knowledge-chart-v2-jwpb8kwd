# Knowledge Chart — Sprint Plan & Backlog

## Goal
Create a delivery plan that turns stakeholder requests into prioritized, testable work for the knowledge chart experience across route and driver views.

## Scope Summary
This backlog covers:
- Route run-frequency visibility (365-day baseline + filtered value).
- Coverage decision support enhancements (driver/route indicators and recommendations).
- Visual prioritization for key child metrics.
- Operational context fields (on-car supervisor, bid flag, rural SPM handling).

---

## Product Principles (for implementation decisions)
1. **Truth first:** Always show an unfiltered 365-day route-run baseline to settle disputes quickly.
2. **Decision support over raw data:** Use visual comparisons and rank-oriented color where useful.
3. **Transparency:** Distinguish what is filtered vs. unfiltered.
4. **Fairness and practicality:** Support recommendations that balance skill breadth with on-the-ground realities (e.g., willingness, supervisor support).

---

## Sprint 0 — Discovery & Data Contract (1 week)

### Status
- ✅ **Completed on April 6, 2026**.

### Objectives
- Confirm data definitions and edge cases before UI changes.
- Align stakeholders on metric formulas and recommendation behavior.

### Completed Decisions
1. **Route Run Count Definitions**
   - `route_runs_365`: straight count across trailing 365 days with no DOW/peak/date-range filters.
   - Filtered route-run metric will show both:
     - `route_runs_filtered_count`
     - `route_runs_filtered_pct`

2. **Peak Season Exclusion Rules**
   - Peak season source of truth: **configuration in a separate database**.
   - Interim assumption until config integration is complete: **peak season is week 40 through week 2 (inclusive)**.
   - `Exclude Peak Season` applies to filtered metrics and related filtered eligibility logic.

3. **Bid Indicator Contract**
   - Read-only indicator in both route and driver views.
   - Canonical fields for implementation planning:
     - `is_bid_route` (route context)
     - `is_bid_driver_assignment` (driver context)

4. **On-Car Supervisor Field**
   - Daily child-level field: `on_car_supervisor`.
   - Rollup enhancement remains in backlog: optional toggle to exclude supervised days.

5. **Coverage Recommendation Rules Workshop**
   - Default recommendation preference when target route is unknown: broader knowledge driver is preferred.
   - Alternate operational pathway is allowed: choose narrower knowledge driver when supervisor support exists and the move is intentional for development/coverage strategy.
   - Willingness is treated as a hard constraint when available.

### Sprint 0 Deliverables (Completed)
- ✅ Signed-off metric spec with baseline + filtered semantics.
- ✅ Field-level data contract for bid and supervisor fields.
- ✅ Decision log for peak-season behavior and interim week-based assumption.

### Exit Criteria
- ✅ Product + Ops sign-off on formulas and recommendation policy variants.

---

## Sprint 1 — Route Frequency Columns + Filter Semantics (1–2 weeks)

### Status
- ✅ **Completed on April 6, 2026**.

### Objectives
- Provide immediate route-volume proof points for managers.

### Completed Outcomes
1. **Unfiltered 365-Day Route Run Count Column**
   - Final label: `Runs (Last 365 Days)`.
   - Bound to `route_runs_365`.
   - Ignores DOW, peak, and ad hoc filters by design.
   - Tooltip explicitly states this value is a fixed trailing 365-day baseline.

2. **Filtered Route Run Column**
   - Final label: `Runs (Current Filters)`.
   - Bound to:
     - `route_runs_filtered_count`
     - `route_runs_filtered_pct`
   - Uses selected date range and filter state (including DOW).

3. **Exclude Peak Toggle Behavior**
   - `Exclude Peak Season` is treated as a filtered-scope control only.
   - Uses peak-season window from config DB (interim fallback: ISO week 40 through week 2, inclusive).
   - Impacts filtered metrics and filtered eligibility logic only.

### Sprint 1 Deliverables (Completed)
- ✅ Side-by-side baseline vs filtered route-run columns finalized in spec.
- ✅ Filter-scope behavior documented to prevent accidental mutation of baseline values.
- ✅ Manager use case validated: ability to quickly confirm or refute >30-day route-run claims from a single comparison view.

### Exit Criteria
- ✅ Stakeholders can compare baseline vs filtered values in one view.
- ✅ Filter changes affect filtered values only.
- ✅ Union challenge scenario is directly supportable by baseline column behavior.

---

## Sprint 2 — Driver/Route Decision Support Enrichment (1–2 weeks)

### Status
- ✅ **Completed on April 6, 2026**.

### Objectives
- Improve assignment and coverage decisions with stronger context.

### Completed Outcomes
1. **Read-Only Bid Checkbox**
   - Bid indicator behavior is finalized as read-only in both views.
   - Driver view uses `is_bid_driver_assignment`.
   - Route view uses `is_bid_route`.

2. **Coverage Recommendation Signal v1**
   - Recommendation panel contract is finalized for uncovered-route use cases.
   - Core input set for v1:
     - number of routes known per driver,
     - target-route knowledge match,
     - willingness (hard constraint when present),
     - supervisor-availability indicator.

3. **Scenario-Aware Guidance**
   - Documented operational scenario for 10C/10B coverage swaps.
   - Guidance now explicitly includes downstream impact visibility (filling 10C may create a secondary 10B gap).
   - Recommendation rationale requires transparent tradeoff explanation between immediate flexibility and capability-building.

4. **SPM Rural Hardness Flag**
   - Rural SPM difficulty signal is locked as advisory context in recommendations.
   - Advisory signal is non-blocking and displayed with rationale text.

### Sprint 2 Deliverables (Completed)
- ✅ Bid indicator requirements finalized across route and driver contexts.
- ✅ Recommendation-v1 inputs and rationale expectations finalized.
- ✅ Coverage-swap scenario behavior captured for operations-aligned decision support.
- ✅ Rural SPM advisory treatment documented.

### Exit Criteria
- ✅ Bid indicators are specified consistently on both views.
- ✅ Recommendation output includes reason codes/rationale language.
- ✅ Rule set supports both “best-fit now” and “develop with supervisor support” pathways.

---

## Sprint 3 — Child-Level Visual Analytics & Supervisor-Aware Rollups (1–2 weeks)

### Status
- ✅ **Completed on April 6, 2026**.

### Objectives
- Make child-level performance patterns easier to interpret and fairer.
- Implement visual changes in the tab workflows where users currently operate.

### Completed Outcomes
1. **Workflow/Tab Placement**
   - Visual enhancements are scoped to existing workflow tabs (`driver baseline`, `route baseline`, and comparison views as applicable).
   - No standalone visualization screen is introduced in this sprint.

2. **Color Visuals for Priority Metrics**
   - Child-level rank/color emphasis remains for:
     - Stops
     - Ov/Un
     - SPORH
     - DEMO
   - Pd Day remains non-color.

3. **Color Rules with Sample Size Guardrail**
   - Apply child-level color only when `n > 6`.
   - Use neutral styling + explanatory cue when `n <= 6`.

4. **Progress Bar Visual Standard (Narrowed Scope)**
   - Progress bar visualizations are enabled only for:
     - Stops
     - Ov/Un
     - SPORH
   - DEMO does **not** receive progress bars in Sprint 3.
   - Paid Day is not currently present in driver baseline; when it is added, it should use a non-color visual treatment.

5. **Daily Child Column: On-Car Supervisor**
   - Daily child-level `on_car_supervisor` column remains in scope for this sprint.

6. **Exclude Supervised Days (Optional Rollup Toggle)**
   - `Exclude On-Car Supervisor Days` remains the rollup toggle behavior for follow-on implementation.

### Sprint 3 Deliverables (Completed)
- ✅ Tab/workflow placement for visuals finalized.
- ✅ Progress bar metric scope locked to Stops/Ov-Un/SPORH only.
- ✅ Paid Day guidance clarified: non-color visual when field is added.
- ✅ Sample-size guardrail and supervisor-context behaviors retained.

### Exit Criteria
- ✅ Visual changes are specified in existing workflow tabs.
- ✅ Progress bars are limited to the approved three metrics.
- ✅ Pd Day handling is documented for future introduction without color ranking.

---

## Sprint 4 — Stabilization, QA, and Change Management (1 week)

### Status
- ✅ **Completed on April 6, 2026**.

### Objectives
- Validate correctness, usability, and operational trust.

### Completed Outcomes
1. **Regression + Data Accuracy QA**
   - Validation checklist finalized for all new metric semantics.
   - Baseline integrity rule confirmed: `route_runs_365` must remain invariant under all UI filters.
   - Filtered metric contract confirmed against filter-state matrix (date range, DOW, exclude peak).

2. **Ops UAT with Real Scenarios**
   - Union challenge scenario documented as acceptance test: validate/refute >30-day run claims using baseline vs filtered side-by-side values.
   - Coverage scenario documented as acceptance test: 10C/10B movement and downstream coverage impact visibility.

3. **Enablement**
   - Manager/scheduler reference guidance finalized in this plan (column meanings, filter scope, and recommendation rationale expectations).
   - Key glossary terms and toggle semantics are captured in-document for implementation handoff.

### Sprint 4 Deliverables (Completed)
- ✅ QA/validation criteria defined for baseline and filtered metrics.
- ✅ UAT scenarios formalized for route-run disputes and coverage planning.
- ✅ Change-management guidance included for operational adoption.

### Exit Criteria
- ✅ Stakeholder UAT sign-off criteria documented.
- ✅ No unresolved P1/P2 planning gaps remain in this backlog specification.

---

## Backlog (Prioritized)

### P0 — Must Have
1. Unfiltered `Runs (Last 365 Days)` column.
2. Filtered `Runs (Current Filters)` count + percent.
3. Exclude peak behavior implemented consistently.
4. Read-only bid checkbox in driver and route views.
5. Child-level `On-Car Supervisor` column.

### P1 — Should Have
1. Progress bar visuals only for Stops, Ov/Un, and SPORH.
2. Color ranking for Stops/Ov-Un/SPORH/DEMO; none for Pd Day (when introduced).
3. Color applied only when `n > 6`.
4. Rollup toggle to exclude supervised days.

### P2 — Could Have
1. Recommendation engine v1 with willingness + supervisor-aware strategy choice.
2. Rural SPM coverage difficulty advisory in recommendation context.

---

## Implementation Notes (Technical)
- Prefer backend-calculated fields for consistency and auditability (`route_runs_365`, `route_runs_filtered_count`, `route_runs_filtered_pct`).
- Peak season should be pulled from configuration in a separate database; until that integration is live, use ISO week window 40–2 (inclusive).
- Store filter state centrally so “filtered” metrics are deterministic across tabs.
- Keep recommendation rationale explainable in plain language (avoid black-box scoring in v1).
- Add telemetry for toggle usage (`exclude_peak`, `exclude_supervised_days`) to inform future iteration.

---

## Open Questions
1. For filtered value, should percent denominator be total days in selected range or total service-eligible days?
2. Is willingness captured in system data or manually declared per assignment event?
3. Should supervisor-supported assignments be tagged for follow-up outcomes (learning progression)?
4. Should bid indicator represent route-level bid, driver-level bid, or both as separate fields?

---

## Suggested Milestone Cadence
- **Week 1 (Completed April 6, 2026):** Sprint 0 sign-off.
- **Weeks 2–3 (Completed April 6, 2026):** Sprint 1 delivery.
- **Weeks 4–5 (Completed April 6, 2026):** Sprint 2 delivery.
- **Weeks 6–7 (Completed April 6, 2026):** Sprint 3 delivery.
- **Week 8 (Completed April 6, 2026):** Sprint 4 stabilization + UAT.
