import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from '../../services/data';

type DriverRollup = {
  driverId: string;
  days: number;
  pct: number;
  lastDriven: string;

  // rollups (so you can show stats BEFORE expanding)
  avgStops: number;
  avgMiles: number;
  avgSPM: number;
  avgNDPPH: number;
  avgOvUn: number;
  avgSPORH: number | null;
};

@Component({
  selector: 'app-route-baseline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './route-baseline.html',
  styleUrls: ['./route-baseline.scss'],
})
export class RouteBaselineComponent {
  readonly Math = Math;
  private dataService = inject(DataService);

  // UI state
  expandedRouteId: string | null = null;

  // Drilldown: route -> driver -> days
  private expandedDriverByRoute = new Map<string, string | null>();

  // Data cache
  private dailyCache: any[] = [];

  constructor() {
    this.dataService.data$.subscribe((d) => {
      this.dailyCache = d?.dailyHistory ?? [];
    });
  }

  // ---------- Route expand/collapse ----------
  toggleRoute(routeId: string) {
    const next = this.expandedRouteId === routeId ? null : routeId;
    this.expandedRouteId = next;

    // reset nested driver state when closing route
    if (next !== routeId) {
      this.expandedDriverByRoute.delete(routeId);
    }
  }

  // ---------- Drilldown: Driver under Route ----------
  toggleDriver(routeId: string, driverId: string) {
    const current = this.expandedDriverByRoute.get(routeId) ?? null;
    this.expandedDriverByRoute.set(routeId, current === driverId ? null : driverId);
  }

  isDriverExpanded(routeId: string, driverId: string) {
    return (this.expandedDriverByRoute.get(routeId) ?? null) === driverId;
  }

  // ---------- Daily helpers ----------
  getDailyForRoute(routeId: string) {
    return this.dailyCache.filter((d) => d.routeId === routeId);
  }

  getOccurrences(routeId: string) {
    return this.getDailyForRoute(routeId).length;
  }

  getLastDriven(routeId: string) {
    const rows = this.getDailyForRoute(routeId);
    if (!rows.length) return '—';
    const latest = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return latest?.date ?? '—';
  }

  spmForRow(row: any) {
    const stops = this.toNum(row?.stops, 0);
    const miles = this.toNum(row?.miles, 0);
    const spm = miles ? stops / miles : 0;
    return spm ? spm.toFixed(2) : '—';
  }

  // ---------- Drivers list under a route (NOW includes rollups) ----------
  getDriversForRoute(routeId: string): DriverRollup[] {
    const rows = this.getDailyForRoute(routeId);
    if (!rows.length) return [];

    const byDriver = new Map<string, any[]>();
    rows.forEach((r) => {
      const did = r.driverId ?? '—';
      if (!byDriver.has(did)) byDriver.set(did, []);
      byDriver.get(did)!.push(r);
    });

    const totalDays = rows.length;

    const drivers: DriverRollup[] = Array.from(byDriver.entries()).map(([driverId, rws]) => {
      const days = rws.length;
      const pct = totalDays ? (days / totalDays) * 100 : 0;

      // last driven
      const lastDriven =
        [...rws].sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.date ?? '—';

      const avgStops = Math.round(this.avg(rws, 'stops'));
      const avgMiles = Math.round(this.avg(rws, 'miles'));

      const avgSPM = this.safeSPM(rws);
      const avgNDPPH = +this.avg(rws, 'ndpph', 1).toFixed(1);
      const avgOvUn = +this.avg(rws, 'paidVsPlan', 2).toFixed(2);

      // SPORH might not exist in every row
      const sporhVals = rws.map((x) => this.toNum(x?.sporh, NaN)).filter((n) => Number.isFinite(n));
      const avgSPORH =
        sporhVals.length ? +((sporhVals.reduce((s, v) => s + v, 0) / sporhVals.length).toFixed(1)) : null;

      return {
        driverId,
        days,
        pct,
        lastDriven,
        avgStops,
        avgMiles,
        avgSPM,
        avgNDPPH,
        avgOvUn,
        avgSPORH,
      };
    });

    // sort most frequent first
    drivers.sort((a, b) => b.days - a.days);
    return drivers;
  }

  isPrimaryDriver(routeId: string, driverId: string) {
    const list = this.getDriversForRoute(routeId);
    return list.length ? list[0].driverId === driverId : false;
  }

  getDaysForRouteAndDriver(routeId: string, driverId: string) {
    return this.getDailyForRoute(routeId)
      .filter((d) => (d.driverId ?? '—') === driverId)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  // ---------- Routes stream ----------
  routes$ = combineLatest([this.dataService.data$, this.dataService.viewConfig$]).pipe(
    map(([data, config]) => {
      if (!data) return [];

      // If no filter, use precomputed baselines
      if (!config.date && !config.dayOfWeek) return data.routeBaselines ?? [];

      // Else compute from filtered daily rows (date/dayOfWeek)
      let filtered = data.dailyHistory ?? [];
      if (config.date) filtered = filtered.filter((d: any) => d.date === config.date);
      else if (config.dayOfWeek) filtered = filtered.filter((d: any) => d.dayOfWeek === config.dayOfWeek);

      const grouped = new Map<string, any[]>();
      filtered.forEach((r: any) => {
        if (!grouped.has(r.routeId)) grouped.set(r.routeId, []);
        grouped.get(r.routeId)!.push(r);
      });

      return Array.from(grouped.entries()).map(([routeId, rows]) => {
        const avgStops = Math.round(this.avg(rows, 'stops'));
        const avgMiles = Math.round(this.avg(rows, 'miles'));
        const avgSPM = this.safeSPM(rows);
        const avgNDPPH = +this.avg(rows, 'ndpph', 1).toFixed(1);
        const avgOvUn = +this.avg(rows, 'paidVsPlan', 2).toFixed(2);

        const sporhVals = rows.map((x) => this.toNum(x?.sporh, NaN)).filter((n) => Number.isFinite(n));
        const sporh =
          sporhVals.length ? +((sporhVals.reduce((s, v) => s + v, 0) / sporhVals.length).toFixed(1)) : 0;

        return {
          routeId,
          avgStops,
          avgMiles,
          avgSPM,
          avgNDPPH,
          avgOvUn,
          sporh,
        };
      });
    })
  );

  // ---------- utils ----------
  private toNum(value: any, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private avg(list: any[], field: string, decimals = 0): number {
    if (!list.length) return 0;
    const n = list.reduce((s, r) => s + this.toNum(r?.[field], 0), 0) / list.length;
    return +n.toFixed(decimals);
  }

  private safeSPM(rows: any[]): number {
    if (!rows.length) return 0;
    const stops = rows.reduce((s, r) => s + this.toNum(r?.stops, 0), 0);
    const miles = rows.reduce((s, r) => s + this.toNum(r?.miles, 0), 0);
    return miles ? +(stops / miles).toFixed(2) : 0;
  }
}