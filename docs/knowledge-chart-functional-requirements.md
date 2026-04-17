# Knowledge Chart — Functional Requirements (Mock Handoff)

## 1. Purpose
This document translates the current Knowledge Chart mock and implemented behaviors into functional requirements for product, engineering, and operations handoff.

It is intended to accompany the mock so delivery teams can build, validate, and UAT with clear scope and acceptance criteria.

## 2. In Scope
- Route Baseline tab behavior and drilldowns.
- Driver Baseline tab behavior and drilldowns.
- Comparison tab behavior (functioning current-state tab).
- Delivery in both standalone and RTW-embedded contexts.
- Shared filter controls and semantics.
- Baseline vs filtered route-run metrics.
- Read-only bid indicators.
- On-car supervisor handling in daily data.
- Visual treatment rules (parent/child-level thresholds).
- Sprint 4 QA/UAT readiness requirements.

## 3. Out of Scope (for this handoff)
- Recommendation engine scoring/ranking automation.
- Paid Day metric implementation (currently future-state guidance only).
- Peak-season external config DB integration (interim ISO week logic remains in effect).
- Any write-back/edit flows (all indicators and metrics in this scope are read-only).
- RTW parent worksheet redesign beyond embedding entry points/context handoff.

## 4. Users & Primary Jobs
### 4.1 Operations Manager
- Validate/refute route-frequency claims quickly (e.g., union >30-day challenges).
- Compare baseline route run counts vs current filtered conditions.

### 4.2 Scheduler / Dispatcher
- Understand who has driven a route, how often, and with what performance patterns.
- Use route/driver drilldown context (including supervised days and bid status) to support coverage decisions.

## 5. Global Filters (Shared Semantics)
### FR-1: Filter Controls
System shall provide the following global filters:
1. Start Date
2. End Date
3. Day of Week
4. Exclude Peak Season
5. Exclude On-Car Supervisor Days

Day of Week semantics:
- `All` means no day-of-week filter is applied.
- Selecting a specific day (e.g., Monday) limits filtered metrics and drilldown rows to that day only.

### FR-2: Filter Application
System shall apply active filters consistently across route and driver tabs for filtered metrics and drilldown data.

### FR-3: Peak Season Rule (Interim)
Until external configuration integration is delivered, Exclude Peak Season shall use ISO week logic where peak is week 40 through week 2 (inclusive).

### FR-4: Supervisor Exclusion
When Exclude On-Car Supervisor Days is enabled, rows where canonical field `on_car_supervisor = true` (UI mapping may expose `onCarSupervisor`) shall be excluded from filtered calculations.

## 6. Route Baseline Requirements
### FR-5: Route Rows
System shall list routes with:
- Route ID
- Bid indicator (read-only)
- Runs (Last 365 Days)
- Runs (Current Filters)
- Last Driven
- Avg SPM
- Avg NDPPH
- Ov/Un
- Miles
- Stops
- SPORH

### FR-6: Baseline Invariance
`Runs (Last 365 Days)` shall remain invariant regardless of current filter state.

### FR-7: Filtered Count
`Runs (Current Filters)` shall reflect only rows that satisfy active filter state.

### FR-8: Route Drilldown Level 1 (Driver under Route)
Expanding a route shall show drivers who have run that route with:
- Days
- % occurrence
- Last driven
- Avg NDPPH, Avg SPM, Ov/Un, Stops, Miles, SPORH

### FR-9: Route Drilldown Level 2 (Daily Rows)
Expanding a driver under a route shall show day-level rows including On-Car Supervisor status.

## 7. Driver Baseline Requirements
### FR-10: Driver Rows
System shall list drivers with:
- Driver name/id
- Seniority
- Bid Route
- Stops
- Miles
- SPM
- NDPPH
- Ov/Un
- SPORH
- AM/PM split

### FR-11: Driver Drilldown Level 1 (Route under Driver)
Expanding a driver shall show routes they have driven with rollups and % occurrence.

### FR-12: Driver Drilldown Level 2 (Daily Rows)
Expanding a route under a driver shall show day-level rows including On-Car Supervisor status.

## 8. Comparison Tab Requirements
### FR-13: Comparison Tab Availability
System shall provide a functioning Comparison tab that supports side-by-side driver comparisons.

### FR-14: Driver Selection Behavior
Comparison tab shall support selecting multiple drivers and rendering comparative metric output for selected drivers.

### FR-15: Metric/Mode Controls
Comparison tab shall support metric and mode controls used to switch comparison view context (for example absolute vs delta style comparison behaviors).

## 9. Visual Treatment Requirements
### FR-16: Parent-Level Visuals
Parent-level progress/color visuals shall be shown for Stops, Ov/Un, and SPORH only.

### FR-17: NDPPH Display
NDPPH / Avg NDPPH columns shall be numeric-only (no bar visuals).

### FR-18: Route Child Visual Threshold
In Route and Driver tab child data, visual treatment for eligible metrics shall render only when sample size `n >= 6`.

### FR-19: Child Metrics Eligible for Visuals
Child visual treatment shall be restricted to Stops, Ov/Un, and SPORH.

## 10. Data Contracts (Current)
### FR-20: Route Bid Flag
Canonical route-level bid field shall be `is_bid_route` (read-only). UI/view-model mapping may expose this as `isBidRoute`.

### FR-21: Supervisor Flag
Canonical day-level supervisor field shall be `on_car_supervisor` boolean. UI/view-model mapping may expose this as `onCarSupervisor`.

### FR-22: Ov/Un Rollup Source
Ov/Un aggregation shall use `ovUn`, with fallback to `paidVsPlan` for compatibility.

## 11. Acceptance Criteria (UAT)
### AC-1: Union Challenge Flow
Given a route in Route Baseline,
when user compares Runs (Last 365 Days) and Runs (Current Filters),
then both values appear on the same row and user can explain baseline-vs-filter differences from that single view without navigating to another tab.

### AC-2: Filter Matrix Integrity
Given any combination of Start/End Date, DOW, Exclude Peak, Exclude On-Car Supervisor,
when filters are applied,
then filtered values update deterministically and `Runs (Last 365 Days)` remains invariant for each individual filter and for combined filter states.

### AC-3: Route Child Visual Threshold
Given route child rows,
when sample size `n < 6`,
then child visuals are not shown;
when sample size `n >= 6`,
then child visuals are shown for eligible metrics.

### AC-4: Supervisor Transparency
Given drilldown daily rows,
then On-Car Supervisor status is visible and aligned with exclusion behavior.

### AC-5: Comparison Tab Continuity
Given user selection of two or more drivers in Comparison tab,
when comparison metric or mode is changed,
then comparison output updates without affecting baseline-route invariance semantics in other tabs.

### AC-6: RTW Entry and Context
Given user opens Knowledge Chart from RTW for a specific route,
when Knowledge Chart loads in embedded mode,
then route context is pre-applied and visible to the user.

### AC-7: Cross-Mode Consistency
Given the same dataset and filter state,
when user compares standalone and RTW-embedded views,
then route/driver metrics and drilldown values match.

### AC-8: Embedded Fallback
Given RTW context payload is missing or invalid,
when user opens embedded Knowledge Chart,
then system displays a clear fallback state and allows user to continue in standalone mode (where permitted by entitlement).

## 12. Delivery Context Requirements (Standalone + RTW Embedded)
### FR-23: Dual Delivery Modes
System shall support two delivery contexts:
1. Standalone mode (full Knowledge Chart experience)
2. RTW-embedded mode (Knowledge Chart surfaced from Route Target Worksheet)

### FR-24: Cross-Mode Behavioral Parity
Core behaviors shall remain consistent between standalone and RTW-embedded modes, including:
- Filter semantics
- Baseline invariance rules
- Drilldown behavior
- Comparison behavior

### FR-25: RTW Launch Entry Point
RTW shall provide an entry action that opens the Knowledge Chart in embedded mode from the worksheet workflow.

### FR-26: RTW Context Handoff Contract
RTW integration shall define an inbound context contract with:
- Required identifiers (for example route id)
- Optional parameters (for example selected date window, site/depot, and user role)
- Default behavior when optional context is absent

### FR-27: Embedded Fallback Handling
If inbound RTW context is unavailable or invalid, embedded view shall:
- Show a non-blocking error/empty-state message
- Preserve user ability to access standalone mode when permitted

### FR-28: Authorization and Entitlement
RTW-embedded access shall honor the same role-based authorization rules as standalone mode and must not expose out-of-scope route/driver data.

### FR-29: Embedded Performance
RTW-embedded mode shall meet agreed performance targets for:
- Initial load/render
- Filter change response
- First drilldown expansion

### FR-30: Telemetry by Host Context
Telemetry shall record host context (`standalone` vs `rtw_embedded`) and key user actions (open, filter changes, drilldown, comparison interactions, and fallback events).

## 13. Non-Functional Requirements
### NFR-1: Determinism
For the same dataset and filter state, outputs shall be deterministic across tabs.

Filter state shall be maintained as a single shared source of truth so all tabs apply identical filtered semantics.

### NFR-2: Explainability
All displayed values must be explainable to operations users with clear filtered vs baseline semantics.

### NFR-3: Auditability
Rules for peak exclusion, supervised-day exclusion, and rollup formulas must be documented and testable.

## 14. Handoff Checklist
- [ ] Confirm stakeholders accept baseline/filtered semantics and labels.
- [ ] Confirm acceptance criteria AC-1 through AC-8 in UAT.
- [ ] Confirm QA checklist execution (`docs/sprint-4-qa-uat-checklist.md`).
- [ ] Confirm comparison-tab behavior and terminology are signed off for release notes/training.
- [ ] Confirm standalone and RTW-embedded entry points/behavior are signed off for release notes/training.
- [ ] Confirm unresolved open questions are tracked in backlog before production cutover.
