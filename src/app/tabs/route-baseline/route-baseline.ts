import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService, ViewConfig } from '../../services/data';

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

type RouteRow = {
  routeId: string;
  isBidRoute: boolean;
  runs365: number;
  filteredRuns: number;
  filteredPct: number;
  avgStops: number | null;
  avgMiles: number | null;
  avgSPM: number | null;
  avgNDPPH: number | null;
  avgOvUn: number | null;
  sporh: number | null;
  recommendation: {
    bestFitDriver: string;
    bestFitReason: string;
    developmentDriver: string;
    developmentReason: string;
  };
  ruralHardToCover: boolean;
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
      if (!data) return [] as RouteRow[];

      const allRows = data.dailyHistory ?? [];
      const drivers = data.drivers ?? [];
      const filteredRows = this.applyFilters(allRows, config);
      const filteredDays = new Set(filteredRows.map((d: any) => d.date)).size;
      const bidRoutes = new Set(
        drivers.map((d: any) => d?.bidRoute).filter((routeId: string | null | undefined) => !!routeId)
      );

      const rowsByRoute = new Map<string, any[]>();
      allRows.forEach((r: any) => {
        if (!rowsByRoute.has(r.routeId)) rowsByRoute.set(r.routeId, []);
        rowsByRoute.get(r.routeId)!.push(r);
      });

      const filteredByRoute = new Map<string, any[]>();
      filteredRows.forEach((r: any) => {
        if (!filteredByRoute.has(r.routeId)) filteredByRoute.set(r.routeId, []);
        filteredByRoute.get(r.routeId)!.push(r);
      });

      const latestDate = this.latestDate(allRows);
      const startWindow = this.shiftDays(latestDate, -364);
      const routesKnownByDriver = this.routesKnownByDriver(allRows);
      const driversById = new Map<string, any>(
        drivers.map((d: any) => [d.driverId as string, d] as [string, any])
      );

      const routes: RouteRow[] = Array.from(rowsByRoute.entries()).map(([routeId, allRouteRows]) => {
        const routeFilteredRows = filteredByRoute.get(routeId) ?? [];
        const routeSPM = this.safeSPM(allRouteRows);
        const recommendation = this.buildRecommendation(routeId, driversById, routesKnownByDriver);
        const runs365 = allRouteRows.filter((d) => {
          const date = this.parseDate(d?.date);
          if (!date || !latestDate || !startWindow) return false;
          return date >= startWindow && date <= latestDate;
        }).length;

        const filteredRuns = routeFilteredRows.length;
        const filteredPct = filteredDays ? (filteredRuns / filteredDays) * 100 : 0;

        if (!routeFilteredRows.length) {
            return {
              routeId,
              isBidRoute: bidRoutes.has(routeId),
              runs365,
              filteredRuns,
              filteredPct,
            avgStops: null,
            avgMiles: null,
            avgSPM: null,
              avgNDPPH: null,
              avgOvUn: null,
              sporh: null,
              recommendation,
              ruralHardToCover: routeSPM < 1.6,
            };
          }

        const avgStops = Math.round(this.avg(routeFilteredRows, 'stops'));
        const avgMiles = Math.round(this.avg(routeFilteredRows, 'miles'));
        const avgSPM = this.safeSPM(routeFilteredRows);
        const avgNDPPH = +this.avg(routeFilteredRows, 'ndpph', 1).toFixed(1);
        const avgOvUn = +this.avg(routeFilteredRows, 'ovUn', 2).toFixed(2);

        const sporhVals = routeFilteredRows
          .map((x) => this.toNum(x?.sporh, NaN))
          .filter((n) => Number.isFinite(n));
        const sporh =
          sporhVals.length ? +((sporhVals.reduce((s, v) => s + v, 0) / sporhVals.length).toFixed(1)) : null;

        return {
          routeId,
          isBidRoute: bidRoutes.has(routeId),
          runs365,
          filteredRuns,
          filteredPct,
          avgStops,
          avgMiles,
          avgSPM,
          avgNDPPH,
          avgOvUn,
          sporh,
          recommendation,
          ruralHardToCover: routeSPM < 1.6,
        };
      });

      routes.sort((a, b) => b.runs365 - a.runs365 || a.routeId.localeCompare(b.routeId));
      return routes;
    })
  );

  private applyFilters(rows: any[], config: ViewConfig) {
    return rows.filter((row) => {
      const date = this.parseDate(row?.date);
      if (!date) return false;

      if (config.startDate) {
        const start = this.parseDate(config.startDate);
        if (start && date < start) return false;
      }

      if (config.endDate) {
        const end = this.parseDate(config.endDate);
        if (end && date > end) return false;
      }

      if (config.dayOfWeek && row?.dayOfWeek !== config.dayOfWeek) return false;

      if (config.excludePeak && this.isPeakSeason(date)) return false;

      return true;
    });
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private latestDate(rows: any[]): Date | null {
    const dates = rows
      .map((r) => this.parseDate(r?.date))
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime());
    return dates[0] ?? null;
  }

  private shiftDays(date: Date | null, days: number): Date | null {
    if (!date) return null;
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private isoWeek(date: Date): number {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private isPeakSeason(date: Date): boolean {
    const week = this.isoWeek(date);
    return week >= 40 || week <= 2;
  }

  private routesKnownByDriver(rows: any[]) {
    const map = new Map<string, Set<string>>();
    rows.forEach((r) => {
      const driverId = r?.driverId;
      const routeId = r?.routeId;
      if (!driverId || !routeId) return;
      if (!map.has(driverId)) map.set(driverId, new Set<string>());
      map.get(driverId)!.add(routeId);
    });
    return map;
  }

  private buildRecommendation(
    routeId: string,
    driversById: Map<string, any>,
    routesKnownByDriver: Map<string, Set<string>>
  ) {
    const candidates = Array.from(driversById.keys()).map((driverId) => {
      const routesKnown = routesKnownByDriver.get(driverId) ?? new Set<string>();
      return {
        driverId,
        name: driversById.get(driverId)?.name ?? driverId,
        knowsTargetRoute: routesKnown.has(routeId),
        knowledgeBreadth: routesKnown.size,
      };
    });

    const bestFitPool = candidates
      .slice()
      .sort((a, b) => {
        if (a.knowsTargetRoute !== b.knowsTargetRoute) return a.knowsTargetRoute ? -1 : 1;
        return b.knowledgeBreadth - a.knowledgeBreadth;
      });
    const bestFit = bestFitPool[0];

    const developmentPool = candidates
      .filter((c) => !c.knowsTargetRoute)
      .sort((a, b) => a.knowledgeBreadth - b.knowledgeBreadth);
    const development = developmentPool[0] ?? bestFit;

    return {
      bestFitDriver: bestFit?.name ?? '—',
      bestFitReason: bestFit?.knowsTargetRoute
        ? `${bestFit.name} already knows ${routeId} and can cover quickly.`
        : `${bestFit?.name ?? '—'} has broader route knowledge for immediate flexibility.`,
      developmentDriver: development?.name ?? '—',
      developmentReason:
        development && !development.knowsTargetRoute
          ? `${development.name} knows fewer routes; pair with On-Car Supervisor if available to build coverage depth.`
          : `No development candidate found; use best-fit assignment.`,
    };
  }

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
