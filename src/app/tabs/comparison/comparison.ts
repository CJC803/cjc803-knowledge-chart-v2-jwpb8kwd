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
  paidVsPlan: number;
  sporh: number;
};

type ComparisonRow = {
  id: string;
  name: string;
  routeId?: string | null;
  driverId?: string | null;
  onRoute: boolean;
  deltas: Baseline;
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

  baselineMode: BaselineMode = 'route';
  selectedRouteId: string | null = null;

  readonly maxDrivers = 8;
  selectedDriverIds: string[] = [];

  readonly maxRoutes = 8;
  selectedManualRouteIds: string[] = [];

  readonly chartMetricOptions: Array<{ key: MetricKey; label: string }> = [
    { key: 'ndpph', label: 'NDPPH' },
    { key: 'stops', label: 'Stops' },
    { key: 'miles', label: 'Miles' },
    { key: 'spm', label: 'SPM' },
    { key: 'paidVsPlan', label: 'Ov/Un' },
    { key: 'sporh', label: 'SPORH' },
  ];

  selectedChartMetrics: MetricKey[] = ['ndpph'];

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
  rows: ComparisonRow[] = [];

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

  toggleManualRoute(routeId: string) {
    const idx = this.selectedManualRouteIds.indexOf(routeId);

    if (idx >= 0) {
      this.selectedManualRouteIds = this.selectedManualRouteIds.filter((id) => id !== routeId);
      this.recomputeRowsOnly();
      return;
    }

    if (this.selectedManualRouteIds.length >= this.maxRoutes) {
      this.selectedManualRouteIds = [...this.selectedManualRouteIds.slice(1), routeId];
      this.recomputeRowsOnly();
      return;
    }

    this.selectedManualRouteIds = [...this.selectedManualRouteIds, routeId];
    this.recomputeRowsOnly();
  }

  clearSelectedDrivers() {
    this.selectedDriverIds = [];
    this.recomputeRowsOnly();
  }

  clearSelectedRoutes() {
    this.selectedManualRouteIds = [];
    this.recomputeRowsOnly();
  }

  toggleChartMetric(metric: MetricKey) {
    const idx = this.selectedChartMetrics.indexOf(metric);

    if (idx >= 0) {
      if (this.selectedChartMetrics.length === 1) return;
      this.selectedChartMetrics = this.selectedChartMetrics.filter((m) => m !== metric);
      return;
    }

    if (this.selectedChartMetrics.length >= 4) return;
    this.selectedChartMetrics = [...this.selectedChartMetrics, metric];
  }

  isChartMetricSelected(metric: MetricKey) {
    return this.selectedChartMetrics.includes(metric);
  }

  metricLabel(metric: MetricKey) {
    return this.chartMetricOptions.find((o) => o.key === metric)?.label ?? metric;
  }

  metricValueFromBaseline(obj: Baseline, metric: MetricKey): number {
    return (obj as any)[metric] ?? 0;
  }

  deltaClass(value: number): string {
    if (value > 0) return 'pos';
    if (value < 0) return 'neg';
    return 'neutral';
  }

  deltaArrow(value: number): string {
    if (value > 0) return '▲';
    if (value < 0) return '▼';
    return '—';
  }

  formatDeltaValue(value: number, metric: MetricKey): string {
    const decimals = metric === 'stops' || metric === 'miles' ? 1 : 2;
    const abs = Math.abs(value).toFixed(decimals);
    if (value > 0) return `+${abs}`;
    if (value < 0) return `-${abs}`;
    return Number(0).toFixed(decimals);
  }

  chartAbsWidthFor(rowId: string, metric: MetricKey) {
    const vals = this.rows.map((r) => Math.abs(this.metricValueFromBaseline(r.deltas, metric)));
    const max = Math.max(...vals, 1);
    const row = this.rows.find((x) => x.id === rowId);
    if (!row) return 0;
    const v = Math.abs(this.metricValueFromBaseline(row.deltas, metric));
    return Math.min((v / max) * 50, 50);
  }

  chartBarLeftFor(rowId: string, metric: MetricKey) {
    const row = this.rows.find((x) => x.id === rowId);
    if (!row) return 50;
    const v = this.metricValueFromBaseline(row.deltas, metric);
    const w = this.chartAbsWidthFor(rowId, metric);
    return v >= 0 ? 50 : 50 - w;
  }

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

    const baseline = this.baseline;
    const driverBaselines: any[] = this.latestData.driverBaselines ?? [];
    const routeBaselines: any[] = this.latestData.routeBaselines ?? [];
    const daily: any[] = this.latestData.dailyHistory ?? [];

    const byDriverBaseline = new Map<string, any>();
    driverBaselines.forEach((b: any) => byDriverBaseline.set(b.driverId, b));

    const byRouteBaseline = new Map<string, any>();
    routeBaselines.forEach((r: any) => {
      if (r?.routeId) byRouteBaseline.set(r.routeId, r);
    });

    const computeDriverFromDaily = (driverId: string): Baseline | null => {
      const rows = daily.filter((r) => r.driverId === driverId);
      if (!rows.length) return null;

      const stops = avg(rows, 'stops', 0);
      const miles = avg(rows, 'miles', 0);
      const spm = avgMetric(rows, 'spm', 2, () => (miles ? +(stops / miles).toFixed(2) : 0));
      const ndpph = avg(rows, 'ndpph', 1);
      const paidVsPlan = avgMetric(rows, 'paidVsPlan', 2, () => avg(rows, 'ovUn', 2));
      const sporh = avg(rows, 'sporh', 1);

      return { stops, miles, spm, ndpph, paidVsPlan, sporh };
    };

    const computeRouteFromDaily = (routeId: string): Baseline | null => {
      const rows = daily.filter((r) => r.routeId === routeId);
      if (!rows.length) return null;

      const stops = avg(rows, 'stops', 0);
      const miles = avg(rows, 'miles', 0);
      const spm = avgMetric(rows, 'spm', 2, () => (miles ? +(stops / miles).toFixed(2) : 0));
      const ndpph = avg(rows, 'ndpph', 1);
      const paidVsPlan = avgMetric(rows, 'paidVsPlan', 2, () => avg(rows, 'ovUn', 2));
      const sporh = avg(rows, 'sporh', 1);

      return { stops, miles, spm, ndpph, paidVsPlan, sporh };
    };

    if (this.baselineMode === 'manual') {
      if (this.selectedManualRouteIds.length < 2) {
        this.rows = [];
        return;
      }

      const rows = this.selectedManualRouteIds
        .map((routeId) => {
          const routeBase = byRouteBaseline.get(routeId);

          const compareStats: Baseline | null = routeBase
            ? {
                stops: toNum(routeBase?.avgStops ?? routeBase?.stops, 0),
                miles: toNum(routeBase?.avgMiles ?? routeBase?.miles, 0),
                spm: toNum(routeBase?.avgSPM ?? routeBase?.spm, 0),
                ndpph: toNum(routeBase?.avgNDPPH ?? routeBase?.ndpph, 0),
                paidVsPlan: toNum(routeBase?.avgOvUn ?? routeBase?.paidVsPlan, 0),
                sporh: pickFirstNumber(
                  [routeBase?.avgSPORH, routeBase?.avgSporh, routeBase?.sporh],
                  0
                ),
              }
            : computeRouteFromDaily(routeId);

          if (!compareStats) return null;

          return {
            id: routeId,
            routeId,
            driverId: null,
            name: routeId,
            onRoute: false,
            deltas: {
              stops: +(compareStats.stops - baseline.stops).toFixed(1),
              miles: +(compareStats.miles - baseline.miles).toFixed(1),
              spm: +(compareStats.spm - baseline.spm).toFixed(2),
              ndpph: +(compareStats.ndpph - baseline.ndpph).toFixed(2),
              paidVsPlan: +(compareStats.paidVsPlan - baseline.paidVsPlan).toFixed(2),
              sporh: +(compareStats.sporh - baseline.sporh).toFixed(2),
            },
          } as ComparisonRow;
        })
        .filter(Boolean) as ComparisonRow[];

      rows.sort((a, b) => a.name.localeCompare(b.name));
      this.rows = rows;
      return;
    }

    if (this.selectedDriverIds.length < 2) {
      this.rows = [];
      return;
    }

    const rows = this.selectedDriverIds
      .map((driverId) => {
        const meta = this.drivers.find((d) => d.driverId === driverId) || {};
        const driverBase = byDriverBaseline.get(driverId);

        const compareStats: Baseline | null = driverBase
          ? {
              stops: toNum(driverBase?.avgStops ?? driverBase?.stops, 0),
              miles: toNum(driverBase?.avgMiles ?? driverBase?.miles, 0),
              spm: toNum(driverBase?.avgSPM ?? driverBase?.spm, 0),
              ndpph: toNum(driverBase?.avgNDPPH ?? driverBase?.ndpph, 0),
              paidVsPlan: toNum(driverBase?.avgOvUn ?? driverBase?.paidVsPlan, 0),
              sporh: pickFirstNumber(
                [
                  driverBase?.avgSPORH,
                  driverBase?.avgSporh,
                  driverBase?.sporh,
                  computeDriverFromDaily(driverId)?.sporh,
                ],
                0
              ),
            }
          : computeDriverFromDaily(driverId);

        if (!compareStats) return null;

        return {
          id: driverId,
          driverId,
          routeId: meta.bidRoute ?? null,
          name: meta.name ?? driverId,
          onRoute: this.isDriverOnRoute(driverId),
          deltas: {
            stops: +(compareStats.stops - baseline.stops).toFixed(1),
            miles: +(compareStats.miles - baseline.miles).toFixed(1),
            spm: +(compareStats.spm - baseline.spm).toFixed(2),
            ndpph: +(compareStats.ndpph - baseline.ndpph).toFixed(2),
            paidVsPlan: +(compareStats.paidVsPlan - baseline.paidVsPlan).toFixed(2),
            sporh: +(compareStats.sporh - baseline.sporh).toFixed(2),
          },
        } as ComparisonRow;
      })
      .filter(Boolean) as ComparisonRow[];

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

    function avgMetric(
      list: any[],
      field: string,
      decimals: number,
      fallback: () => number
    ) {
      const vals = list
        .map((r) => r?.[field])
        .filter((v) => Number.isFinite(Number(v)));

      if (!vals.length) return fallback();
      const n = vals.reduce((s, v) => s + toNum(v, 0), 0) / vals.length;
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
      const spm = avgMetric(daily, 'spm', 2, () => (miles ? +(stops / miles).toFixed(2) : 0));
      const ndpph = avg(daily, 'ndpph', 1);
      const paidVsPlan = avgMetric(daily, 'paidVsPlan', 2, () => avg(daily, 'ovUn', 2));
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
      const spm = avgMetric(rows, 'spm', 2, () => (miles ? +(stops / miles).toFixed(2) : 0));
      const ndpph = avg(rows, 'ndpph', 1);
      const paidVsPlan = avgMetric(rows, 'paidVsPlan', 2, () => avg(rows, 'ovUn', 2));
      const sporh = avg(rows, 'sporh', 1);
      return { stops, miles, spm, ndpph, paidVsPlan, sporh };
    }

    return null;

    function avg(list: any[], field: string, decimals: number) {
      if (!list.length) return 0;
      const n = list.reduce((s, r) => s + toNum(r?.[field], 0), 0) / list.length;
      return +n.toFixed(decimals);
    }

    function avgMetric(
      list: any[],
      field: string,
      decimals: number,
      fallback: () => number
    ) {
      if (!list.length) return 0;
      const vals = list
        .map((r) => r?.[field])
        .filter((v) => Number.isFinite(Number(v)));

      if (!vals.length) return fallback();
      const n = vals.reduce((s, v) => s + toNum(v, 0), 0) / vals.length;
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
    const baselineRoutes = (this.latestData?.routeBaselines ?? [])
      .map((r: any) => r?.routeId)
      .filter((v: any) => !!v);

    const dailyRoutes = (this.latestData?.dailyHistory ?? [])
      .map((r: any) => r?.routeId)
      .filter((v: any) => !!v);

    const uniqueRouteIds = [...new Set([...baselineRoutes, ...dailyRoutes])].sort((a, b) =>
      String(a).localeCompare(String(b))
    );

    return uniqueRouteIds.map((routeId) => ({ routeId }));
  }

  get baselineLabel(): string {
    if (this.baselineMode === 'center') return 'Center Average';
    if (this.baselineMode === 'manual') return 'Manual Baseline';
    if (this.baselineMode === 'route') {
      return this.selectedRouteId ? `Route: ${this.selectedRouteId}` : 'Route Baseline';
    }
    return 'Baseline';
  }
}

function toNum(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickFirstNumber(candidates: any[], fallback = 0): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}