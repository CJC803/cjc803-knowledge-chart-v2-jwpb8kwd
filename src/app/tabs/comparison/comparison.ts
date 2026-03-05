import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from '../../services/data';

type BaselineMode = 'center' | 'manual' | 'route';
type MetricKey = 'stops' | 'miles' | 'spm' | 'ndpph' | 'paidVsPlan' | 'sporh';

type Baseline = {
  stops: number;
  miles: number;
  spm: number;
  ndpph: number;
  paidVsPlan: number; // Ov/Un
  sporh: number;
};

@Component({
  selector: 'app-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comparison.html',
  styleUrls: ['./comparison.scss'],
})
export class ComparisonComponent {
  private dataService = inject(DataService);

  // UI state
  baselineMode: BaselineMode = 'route';
  selectedRouteId: string | null = null;

  readonly maxDrivers = 8;
  selectedDriverIds: string[] = [];

  // ✅ Chart metrics (1–4 selectable)
  readonly chartMetricOptions: Array<{ key: MetricKey; label: string }> = [
    { key: 'ndpph', label: 'NDPPH' },
    { key: 'stops', label: 'Stops' },
    { key: 'miles', label: 'Miles' },
    { key: 'spm', label: 'SPM' },
    { key: 'paidVsPlan', label: 'Ov/Un' },
    { key: 'sporh', label: 'SPORH' },
  ];

  selectedChartMetrics: MetricKey[] = ['ndpph']; // must remain 1–4

  manualBaseline: Baseline = {
    stops: 120,
    miles: 65,
    spm: 1.85,
    ndpph: 25,
    paidVsPlan: 0.0,
    sporh: 5.5,
  };

  private latestData: any = null;
  drivers: any[] = [];
  private driversOnSelectedRoute = new Set<string>();

  baseline: Baseline | null = null;

  rows: Array<{
    driverId: string;
    name: string;
    onRoute: boolean;
    deltas: Baseline;
  }> = [];

  constructor() {
    combineLatest([this.dataService.data$, this.dataService.viewConfig$])
      .pipe(
        map(([data]) => {
          this.latestData = data;

          if (!data) {
            this.drivers = [];
            this.rows = [];
            this.baseline = null;
            this.driversOnSelectedRoute = new Set();
            return;
          }

          this.drivers = (data.drivers ?? []).slice();

          if (this.baselineMode === 'route' && !this.selectedRouteId) {
            const first = (data.routeBaselines ?? [])[0]?.routeId ?? null;
            this.selectedRouteId = first;
          }

          this.recompute();
        })
      )
      .subscribe();
  }

  // ---------- UI actions ----------
  onBaselineModeChange(mode: BaselineMode) {
    this.baselineMode = mode;
    this.recompute();
  }

  onRouteChange(routeId: string | null) {
    this.selectedRouteId = routeId;
    this.recompute();
  }

  toggleDriver(driverId: string) {
    const idx = this.selectedDriverIds.indexOf(driverId);

    if (idx >= 0) {
      this.selectedDriverIds = this.selectedDriverIds.filter((id) => id !== driverId);
      this.recomputeRowsOnly();
      return;
    }

    if (this.selectedDriverIds.length >= this.maxDrivers) {
      this.selectedDriverIds = [...this.selectedDriverIds.slice(1), driverId];
      this.recomputeRowsOnly();
      return;
    }

    this.selectedDriverIds = [...this.selectedDriverIds, driverId];
    this.recomputeRowsOnly();
  }

  clearSelectedDrivers() {
    this.selectedDriverIds = [];
    this.recomputeRowsOnly();
  }

  // ✅ Chart metric selection (1–4)
  toggleChartMetric(metric: MetricKey) {
    const idx = this.selectedChartMetrics.indexOf(metric);

    // remove
    if (idx >= 0) {
      if (this.selectedChartMetrics.length === 1) return; // must keep at least 1
      this.selectedChartMetrics = this.selectedChartMetrics.filter((m) => m !== metric);
      return;
    }

    // add
    if (this.selectedChartMetrics.length >= 4) return;
    this.selectedChartMetrics = [...this.selectedChartMetrics, metric];
  }

  isChartMetricSelected(metric: MetricKey) {
    return this.selectedChartMetrics.includes(metric);
  }

  metricLabel(metric: MetricKey) {
    return this.chartMetricOptions.find((o) => o.key === metric)?.label ?? metric;
  }

  // ---------- helpers used in template ----------
  driverName(driverId: string) {
    const d = this.drivers.find((x) => x.driverId === driverId);
    return d?.name ?? driverId;
  }

  isDriverOnRoute(driverId: string) {
    return this.driversOnSelectedRoute.has(driverId);
  }

  get sortedDrivers() {
    const list = this.drivers.slice();
    list.sort((a, b) => {
      const an = (a?.name ?? a?.driverId ?? '').toString();
      const bn = (b?.name ?? b?.driverId ?? '').toString();

      if (this.baselineMode === 'route' && this.selectedRouteId) {
        const ao = this.isDriverOnRoute(a.driverId) ? 0 : 1;
        const bo = this.isDriverOnRoute(b.driverId) ? 0 : 1;
        if (ao !== bo) return ao - bo;
      }

      return an.localeCompare(bn);
    });
    return list;
  }

  // ✅ chart helpers (metric-aware)
  chartValueFor(driverId: string, metric: MetricKey) {
    const r = this.rows.find((x) => x.driverId === driverId);
    if (!r) return 0;
    return (r.deltas as any)[metric] ?? 0;
  }

  chartWidthFor(driverId: string, metric: MetricKey) {
    const vals = this.rows.map((r) => Math.abs((r.deltas as any)[metric] ?? 0));
    const max = Math.max(...vals, 1);
    const v = Math.abs(this.chartValueFor(driverId, metric));
    return Math.min((v / max) * 100, 100);
  }

  // ---------- recompute pipeline ----------
  recompute() {
    if (!this.latestData) return;

    this.recomputeDriversOnRoute();
    this.baseline = this.computeBaseline();
    this.recomputeRowsOnly();
  }

  recomputeRowsOnly() {
    if (!this.latestData || !this.baseline) {
      this.rows = [];
      return;
    }

    if (this.selectedDriverIds.length < 2) {
      this.rows = [];
      return;
    }

    const baseline = this.baseline;

    const driverBaselines: any[] = this.latestData.driverBaselines ?? [];
    const daily: any[] = this.latestData.dailyHistory ?? [];

    const byDriverBaseline = new Map<string, any>();
    driverBaselines.forEach((b: any) => byDriverBaseline.set(b.driverId, b));

    const computeFromDaily = (driverId: string): Baseline | null => {
      const rows = daily.filter((r) => r.driverId === driverId);
      if (!rows.length) return null;

      const stops = avg(rows, 'stops', 0);
      const miles = avg(rows, 'miles', 0);
      const spm = miles ? +(stops / miles).toFixed(2) : 0;
      const ndpph = avg(rows, 'ndpph', 1);
      const paidVsPlan = avg(rows, 'paidVsPlan', 2);
      const sporh = avg(rows, 'sporh', 1);

      return { stops, miles, spm, ndpph, paidVsPlan, sporh };
    };

    const rows = this.selectedDriverIds
      .map((driverId) => {
        const meta = this.drivers.find((d) => d.driverId === driverId) || {};
        const base = byDriverBaseline.get(driverId);

        const driverStats: Baseline | null = base
          ? {
              stops: toNum(base?.avgStops ?? base?.stops, 0),
              miles: toNum(base?.avgMiles ?? base?.miles, 0),
              spm: toNum(base?.avgSPM ?? base?.spm, 0),
              ndpph: toNum(base?.avgNDPPH ?? base?.ndpph, 0),
              paidVsPlan: toNum(base?.avgOvUn ?? base?.paidVsPlan, 0),
              sporh: pickFirstNumber(
                [base?.avgSPORH, base?.avgSporh, base?.sporh, computeFromDaily(driverId)?.sporh],
                0
              ),
            }
          : computeFromDaily(driverId);

        if (!driverStats) return null;

        return {
          driverId,
          name: meta.name ?? driverId,
          onRoute: this.isDriverOnRoute(driverId),
          deltas: {
            stops: +(driverStats.stops - baseline.stops).toFixed(1),
            miles: +(driverStats.miles - baseline.miles).toFixed(1),
            spm: +(driverStats.spm - baseline.spm).toFixed(2),
            ndpph: +(driverStats.ndpph - baseline.ndpph).toFixed(2),
            paidVsPlan: +(driverStats.paidVsPlan - baseline.paidVsPlan).toFixed(2),
            sporh: +(driverStats.sporh - baseline.sporh).toFixed(2),
          },
        };
      })
      .filter(Boolean) as any[];

    rows.sort((a, b) => {
      if (this.baselineMode === 'route' && this.selectedRouteId) {
        const ao = a.onRoute ? 0 : 1;
        const bo = b.onRoute ? 0 : 1;
        if (ao !== bo) return ao - bo;
      }
      return a.name.localeCompare(b.name);
    });

    this.rows = rows;

    function avg(list: any[], field: string, decimals: number) {
      const n = list.reduce((s, r) => s + toNum(r?.[field], 0), 0) / list.length;
      return +n.toFixed(decimals);
    }
  }

  private recomputeDriversOnRoute() {
    this.driversOnSelectedRoute = new Set<string>();

    if (this.baselineMode !== 'route' || !this.selectedRouteId || !this.latestData) return;

    const daily: any[] = this.latestData.dailyHistory ?? [];
    daily
      .filter((r) => r.routeId === this.selectedRouteId)
      .forEach((r) => {
        if (r.driverId) this.driversOnSelectedRoute.add(r.driverId);
      });
  }

  private computeBaseline(): Baseline | null {
    const data = this.latestData;
    if (!data) return null;

    if (this.baselineMode === 'manual') return { ...this.manualBaseline };

    const daily: any[] = data.dailyHistory ?? [];
    const routes: any[] = data.routeBaselines ?? [];

    if (this.baselineMode === 'center') {
      if (routes.length) {
        const stops = avg(routes, 'avgStops', 0);
        const miles = avg(routes, 'avgMiles', 0);
        const spm = avg(routes, 'avgSPM', 2);
        const ndpph = avg(routes, 'avgNDPPH', 1);
        const paidVsPlan = avg(routes, 'avgOvUn', 2);
        const sporh = avgFirst(routes, ['avgSPORH', 'avgSporh', 'sporh'], 1);
        return { stops, miles, spm, ndpph, paidVsPlan, sporh };
      }

      if (!daily.length) return null;

      const stops = avg(daily, 'stops', 0);
      const miles = avg(daily, 'miles', 0);
      const spm = miles ? +(stops / miles).toFixed(2) : 0;
      const ndpph = avg(daily, 'ndpph', 1);
      const paidVsPlan = avg(daily, 'paidVsPlan', 2);
      const sporh = avg(daily, 'sporh', 1);
      return { stops, miles, spm, ndpph, paidVsPlan, sporh };
    }

    if (this.baselineMode === 'route') {
      if (!this.selectedRouteId) return null;

      const route = routes.find((r) => r.routeId === this.selectedRouteId);
      if (route) {
        const stops = toNum(route?.avgStops ?? route?.stops, 0);
        const miles = toNum(route?.avgMiles ?? route?.miles, 0);
        const spm = toNum(route?.avgSPM ?? route?.spm, 0);
        const ndpph = toNum(route?.avgNDPPH ?? route?.ndpph, 0);
        const paidVsPlan = toNum(route?.avgOvUn ?? route?.paidVsPlan, 0);
        const sporh = pickFirstNumber([route?.avgSPORH, route?.avgSporh, route?.sporh], 0);
        return { stops, miles, spm, ndpph, paidVsPlan, sporh };
      }

      const rows = daily.filter((r) => r.routeId === this.selectedRouteId);
      if (!rows.length) return null;

      const stops = avg(rows, 'stops', 0);
      const miles = avg(rows, 'miles', 0);
      const spm = miles ? +(stops / miles).toFixed(2) : 0;
      const ndpph = avg(rows, 'ndpph', 1);
      const paidVsPlan = avg(rows, 'paidVsPlan', 2);
      const sporh = avg(rows, 'sporh', 1);
      return { stops, miles, spm, ndpph, paidVsPlan, sporh };
    }

    return null;

    function avg(list: any[], field: string, decimals: number) {
      if (!list.length) return 0;
      const n = list.reduce((s, r) => s + toNum(r?.[field], 0), 0) / list.length;
      return +n.toFixed(decimals);
    }

    function avgFirst(list: any[], fields: string[], decimals: number) {
      if (!list.length) return 0;
      const nums = list
        .map((r) => pickFirstNumber(fields.map((f) => r?.[f]), NaN))
        .filter((v) => Number.isFinite(v));
      if (!nums.length) return 0;
      const n = nums.reduce((s, v) => s + v, 0) / nums.length;
      return +n.toFixed(decimals);
    }
  }

  get routesList(): any[] {
    return (this.latestData?.routeBaselines ?? []).slice();
  }

  get baselineLabel(): string {
    if (this.baselineMode === 'center') return 'Center Average';
    if (this.baselineMode === 'manual') return 'Manual Baseline';
    if (this.baselineMode === 'route')
      return this.selectedRouteId ? `Route: ${this.selectedRouteId}` : 'Route Baseline';
    return 'Baseline';
  }
}

/** Convert to number safely; fallback if NaN/Infinity/null/undefined */
function toNum(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Pick first finite number from candidates */
function pickFirstNumber(candidates: any[], fallback = 0): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}