# Sprint 4 QA + UAT Checklist

This checklist captures Sprint 4 stabilization expectations for Knowledge Charts.

## 1) Regression & Data Accuracy

### Route baseline invariance
- [ ] `Runs (Last 365 Days)` remains unchanged when any UI filter changes.
- [ ] Verify against each filter independently:
  - [ ] Date range
  - [ ] Day of week
  - [ ] Exclude peak season (ISO week 40–2)
  - [ ] Exclude on-car supervisor days
- [ ] Verify against combined filters (all above enabled).

### Filtered metric correctness
- [ ] `Runs (Current Filters)` updates when filter state changes.
- [ ] Filtered runs never exceeds total route occurrences in selected scope.
- [ ] `Exclude Peak Season` removes rows from weeks 40–2 only.
- [ ] `Exclude On-Car Supervisor Days` removes only rows with canonical field `on_car_supervisor = true` (UI mapping may expose `onCarSupervisor`).

## 2) Visual QA

### Parent level
- [ ] Stops, Ov/Un, SPORH visuals appear only when sample size `n >= 6`.
- [ ] NDPPH / Avg NDPPH are numeric-only (no visual bar treatment).

### Child level
- [ ] Stops, Ov/Un, SPORH visuals appear only when sample size `n >= 6`.
- [ ] On-Car Supervisor column is present in daily child tables.

## 3) Ops UAT Scenarios

### Scenario A: union >30 day challenge
- [ ] User can identify route quickly in Route Baseline.
- [ ] User can read `Runs (Last 365 Days)` without changing filters.
- [ ] User can apply filters and compare against `Runs (Current Filters)`.
- [ ] User can explain discrepancy using baseline vs filtered semantics.

### Scenario B: 10C/10B coverage movement
- [ ] User can inspect route/driver history by drilldown.
- [ ] User can see bid indicator on route baseline rows.
- [ ] User can inspect supervised vs unsupervised days in child rows.

### Scenario C: RTW embedded access and parity
- [ ] User can open Knowledge Chart from RTW entry point.
- [ ] Route context from RTW is pre-applied in embedded mode when provided.
- [ ] With same filter state, key metrics match between standalone and embedded modes.
- [ ] If RTW context is invalid/missing, embedded mode shows fallback state without blocking access (where entitlement allows).

## 4) Execution Aid

Run local automated checks:

```bash
npm run qa:sprint4
```

Run build verification:

```bash
npm run build
```
