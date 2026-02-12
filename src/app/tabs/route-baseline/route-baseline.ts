import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-route-baseline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './route-baseline.html',
  styleUrls: ['./route-baseline.scss'],
})

export class RouteBaselineComponent {
  readonly Math = Math;

  private dataService = inject(DataService);

  // UI state
  expandedRouteId: string | null = null;

  // Compare (2–4 routes)
  showCompare = false;
  readonly maxCompareRoutes = 4;
  selectedRouteIds: string[] = [];

  // Drilldown: route -> driver -> days
  private expandedDriverByRoute = new Map<string, string | null>();

  // Data cache (daily history)
  private dailyCache: any[] = [];

  constructor() {
    this.dataService.data$.subscribe((d) => {
      this.dailyCache = d?.dailyHistory ?? [];
    });
  }

  // ---------- Compare helpers ----------
  get compareReady() {
    return this.selectedRouteIds.length >= 2;
  }

  isSelectedRoute(routeId: string) {
    return this.selectedRouteIds.includes(routeId);
  }

  toggleSelectRoute(routeId: string) {
    const idx = this.selectedRouteIds.indexOf(routeId);

    if (idx >= 0) {
      this.selectedRouteIds = this.selectedRouteIds.filter((id) => id !== routeId);
      return;
    }

    if (this.selectedRouteIds.length >= this.maxCompareRoutes) {
      // keep newest N (drop oldest)
      this.selectedRouteIds = [...this.selectedRouteIds.slice(1), routeId];
      return;
    }

    this.selectedRouteIds = [...this.selectedRouteIds, routeId];
  }

  // ---------- Route expand/collapse ----------
  toggleRoute(routeId: string) {
    const next = this.expandedRouteId === routeId ? null : routeId;
    this.expandedRouteId = next;

    // reset nested state when collapsing / switching
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

  getPercentOccurrence(routeId: string) {
    const total = this.dailyCache.length || 0;
    if (!total) return 0;
    return (this.getOccurrences(routeId) / total) * 100;
  }
  compareMetric: 'ndpph' | 'stops' | 'miles' | 'spm' | 'paidVsPlan' | 'sporh' = 'ndpph';
compareMode: 'absolute' | 'delta' = 'absolute';

private metricValueForRoute(routeId: string, metric: string): number {
  switch (metric) {
    case 'spm': {
      const rows = this.getDailyForRoute(routeId);
      if (!rows.length) return 0;
      const stops = rows.reduce((s, r) => s + (+r.stops || 0), 0);
      const miles = rows.reduce((s, r) => s + (+r.miles || 0), 0);
      return miles ? +(stops / miles).toFixed(2) : 0;
    }
    default: {
      // reuse your existing helpers if you have them
      // avg of dailyHistory field
      const rows = this.getDailyForRoute(routeId);
      if (!rows.length) return 0;
      const avg = rows.reduce((s, r) => s + (+r[metric] || 0), 0) / rows.length;
      return +avg.toFixed(metric === 'paidVsPlan' ? 2 : 1);
    }
  }
}

chartValue(routeId: string): number {
  const baseId = this.selectedRouteIds[0];
  const v = this.metricValueForRoute(routeId, this.compareMetric);

  if (this.compareMode === 'delta' && baseId) {
    const base = this.metricValueForRoute(baseId, this.compareMetric);
    return +(v - base).toFixed(2);
  }
  return v;
}

chartWidth(routeId: string): number {
  const vals = this.selectedRouteIds.map(id => Math.abs(this.chartValue(id)));
  const max = Math.max(...vals, 1);
  return Math.min((Math.abs(this.chartValue(routeId)) / max) * 100, 100);
}


  // Generic metric helpers for compare cards
  metricAvg(routeId: string, field: string, decimals = 0) {
    const rows = this.getDailyForRoute(routeId);
    if (!rows.length) return '—';
    const avg = rows.reduce((s, r) => s + (+r[field] || 0), 0) / rows.length;
    return (+avg.toFixed(decimals)).toFixed(decimals);
  }

  metricLatest(routeId: string, field: string, decimals = 0) {
    const rows = this.getDailyForRoute(routeId);
    if (!rows.length) return '—';
    const latest = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const v = +latest?.[field];
    if (Number.isNaN(v)) return '—';
    return (+v.toFixed(decimals)).toFixed(decimals);
  }

  spmAvg(routeId: string) {
    const rows = this.getDailyForRoute(routeId);
    if (!rows.length) return '—';
    const stops = rows.reduce((s, r) => s + (+r.stops || 0), 0);
    const miles = rows.reduce((s, r) => s + (+r.miles || 0), 0);
    const spm = miles ? stops / miles : 0;
    return spm ? spm.toFixed(2) : '—';
  }

  spmLatest(routeId: string) {
    const rows = this.getDailyForRoute(routeId);
    if (!rows.length) return '—';
    const latest = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const stops = +latest?.stops || 0;
    const miles = +latest?.miles || 0;
    const spm = miles ? stops / miles : 0;
    return spm ? spm.toFixed(2) : '—';
  }

  spmForRow(row: any) {
    const stops = +row?.stops || 0;
    const miles = +row?.miles || 0;
    const spm = miles ? stops / miles : 0;
    return spm ? spm.toFixed(2) : '—';
  }

  // ---------- Drivers list under a route ----------
  getDriversForRoute(routeId: string) {
    const rows = this.getDailyForRoute(routeId);
    if (!rows.length) return [];

    const byDriver = new Map<string, any[]>();
    rows.forEach((r) => {
      const did = r.driverId ?? '—';
      if (!byDriver.has(did)) byDriver.set(did, []);
      byDriver.get(did)!.push(r);
    });

    const totalDays = rows.length;

    const drivers = Array.from(byDriver.entries()).map(([driverId, rws]) => {
      const days = rws.length;
      const last = [...rws].sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.date ?? '—';
      const pct = totalDays ? (days / totalDays) * 100 : 0;

      return { driverId, days, pct, lastDriven: last };
    });

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

      // Else compute baselines from filtered daily rows (date/dayOfWeek)
      let filtered = data.dailyHistory ?? [];
      if (config.date) filtered = filtered.filter((d: any) => d.date === config.date);
      else if (config.dayOfWeek) filtered = filtered.filter((d: any) => d.dayOfWeek === config.dayOfWeek);

      const grouped = new Map<string, any[]>();
      filtered.forEach((r: any) => {
        if (!grouped.has(r.routeId)) grouped.set(r.routeId, []);
        grouped.get(r.routeId)!.push(r);
      });

      return Array.from(grouped.entries()).map(([routeId, rows]) => {
        const avgStops = Math.round(rows.reduce((s, r) => s + (+r.stops || 0), 0) / rows.length);
        const avgMiles = Math.round(rows.reduce((s, r) => s + (+r.miles || 0), 0) / rows.length);
        const avgSPM = +(
          rows.reduce((s, r) => s + (+r.stops || 0), 0) /
          (rows.reduce((s, r) => s + (+r.miles || 0), 0) || 1)
        ).toFixed(2);

        const avgNDPPH = +(rows.reduce((s, r) => s + (+r.ndpph || 0), 0) / rows.length).toFixed(1);
        const avgOvUn = +(rows.reduce((s, r) => s + (+r.paidVsPlan || 0), 0) / rows.length).toFixed(2);

        // keep whatever else you want to surface, but safe defaults:
        return {
          routeId,
          avgStops,
          avgMiles,
          avgSPM,
          avgNDPPH,
          avgOvUn,
          sporh: '—',
        };
      });
    })
  );
}
