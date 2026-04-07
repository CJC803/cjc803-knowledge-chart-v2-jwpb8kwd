# Knowledge Chart — Functional Requirements (Mock Handoff)

## 1. Purpose
This document translates the current Knowledge Chart mock and implemented behaviors into functional requirements for product, engineering, and operations handoff.

It is intended to accompany the mock so delivery teams can build, validate, and UAT with clear scope and acceptance criteria.

## 2. In Scope
- Route Baseline tab behavior and drilldowns.
- Driver Baseline tab behavior and drilldowns.
- Comparison tab behavior (functioning current-state tab).
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
3. Exclude Peak Season
4. Exclude On-Car Supervisor Days

### FR-2: Filter Application
System shall apply active filters consistently across route and driver tabs for filtered metrics and drilldown data.

### FR-3: Peak Season Rule (Interim)
Until external configuration integration is delivered, Exclude Peak Season shall use ISO week logic where peak is week 40 through week 2 (inclusive).

### FR-4: Supervisor Exclusion
When Exclude On-Car Supervisor Days is enabled, rows where `onCarSupervisor = true` shall be excluded from filtered calculations.

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
In Route tab child data, drivers with 3 or more route days shall receive visual treatment.

### FR-19: Child Metrics Eligible for Visuals
Child visual treatment shall be restricted to Stops, Ov/Un, and SPORH.

## 10. Data Contracts (Current)
### FR-20: Route Bid Flag
Route-level bid indicator shall use `isBidRoute` (read-only).

### FR-21: Supervisor Flag
Day-level supervisor context shall use `onCarSupervisor` boolean.

### FR-22: Ov/Un Rollup Source
Ov/Un aggregation shall use `ovUn`, with fallback to `paidVsPlan` for compatibility.

## 11. Acceptance Criteria (UAT)
## 8. Visual Treatment Requirements
### FR-13: Parent-Level Visuals
Parent-level progress/color visuals shall be shown for Stops, Ov/Un, and SPORH only.

### FR-14: NDPPH Display
NDPPH / Avg NDPPH columns shall be numeric-only (no bar visuals).

### FR-15: Route Child Visual Threshold
In Route tab child data, drivers with 3 or more route days shall receive visual treatment.

### FR-16: Child Metrics Eligible for Visuals
Child visual treatment shall be restricted to Stops, Ov/Un, and SPORH.

## 9. Data Contracts (Current)
### FR-17: Route Bid Flag
Route-level bid indicator shall use `isBidRoute` (read-only).

### FR-18: Supervisor Flag
Day-level supervisor context shall use `onCarSupervisor` boolean.

### FR-19: Ov/Un Rollup Source
Ov/Un aggregation shall use `ovUn`, with fallback to `paidVsPlan` for compatibility.

## 10. Acceptance Criteria (UAT)
### AC-1: Union Challenge Flow
Given a route in Route Baseline,
when user compares Runs (Last 365 Days) and Runs (Current Filters),
then they can explain and evidence baseline-vs-filter differences in one screen.

### AC-2: Filter Matrix Integrity
Given any combination of Start/End Date, DOW, Exclude Peak, Exclude On-Car Supervisor,
when filters are applied,
then filtered values update and baseline values remain invariant.

### AC-3: Route Child Visual Threshold
Given route child rows,
when driver days < 3,
then child visuals are not shown;
when driver days >= 3,
then child visuals are shown for eligible metrics.

### AC-4: Supervisor Transparency
Given drilldown daily rows,
then On-Car Supervisor status is visible and aligned with exclusion behavior.

### AC-5: Comparison Tab Continuity
Given user selection of two or more drivers in Comparison tab,
when comparison metric or mode is changed,
then comparison output updates without affecting baseline-route invariance semantics in other tabs.

## 12. Non-Functional Requirements
### NFR-1: Determinism
For the same dataset and filter state, outputs shall be deterministic across tabs.

### NFR-2: Explainability
All displayed values must be explainable to operations users with clear filtered vs baseline semantics.

### NFR-3: Auditability
Rules for peak exclusion, supervised-day exclusion, and rollup formulas must be documented and testable.

## 13. Handoff Checklist
- [ ] Confirm stakeholders accept baseline/filtered semantics and labels.
- [ ] Confirm acceptance criteria AC-1 through AC-5 in UAT.
- [ ] Confirm QA checklist execution (`docs/sprint-4-qa-uat-checklist.md`).
- [ ] Confirm comparison-tab behavior and terminology are signed off for release notes/training.
- [ ] Confirm unresolved open questions are tracked in backlog before production cutover.
