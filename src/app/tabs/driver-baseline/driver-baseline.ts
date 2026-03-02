import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-driver-baseline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './driver-baseline.html',
  styleUrls: ['./driver-baseline.scss'],
})
export class DriverBaselineComponent {
  readonly Math = Math;
  private dataService = inject(DataService);

  expandedDriverId: string | null = null;

  // Compare (2–4 drivers)
  showCompare = false;
  readonly maxCompareDrivers = 4;
  selectedDriverIds: string[] = [];

  compareMetric: 'ndpph' | 'stops' | 'miles' | 'spm' | 'paidVsPlan' | 'sporh' = 'ndpph';
  compareMode: 'absolute' | 'delta' = 'absolute';

  // Drilldown: driver -> route -> days
  private expandedRouteByDriver = new Map<string, string | null>();

  // Data cache
  private dailyCache: any[] = [];
  private driversMetaById = new Map<string, any>();

  constructor() {
    this.dataService.data$.subscribe((d) => {
      this.dailyCache = d?.dailyHistory ?? [];
      this.driversMetaById = new Map((d?.drivers ?? []).map((x: any) => [x.driverId, x]));
    });
  }

  // ---------- Compare helpers ----------
  get compareReady() {
    return this.selectedDriverIds.length >= 2;
  }

  isSelectedDriver(driverId: string) {
    return this.selectedDriverIds.includes(driverId);
  }

  toggleSelectDriver(driverId: string) {
    const idx = this.selectedDriverIds.indexOf(driverId);

    if (idx >= 0) {
      this.selectedDriverIds = this.selectedDriverIds.filter((id) => id !== driverId);
      return;
    }

    if (this.selectedDriverIds.length >= this.maxCompareDrivers) {
      this.selectedDriverIds = [...this.selectedDriverIds.slice(1), driverId];
      return;
    }

    this.selectedDriverIds = [...this.selectedDriverIds, driverId];
  }

  driverName(driverId: string) {
    return this.driversMetaById.get(driverId)?.name ?? driverId;
  }

  // ---------- Driver expand/collapse ----------
  toggleDriver(id: string) {
    const next = this.expandedDriverId === id ? null : id;
    this.expandedDriverId = next;

    // reset nested state when collapsing / switching
    if (next !== id) {
      this.expandedRouteByDriver.delete(id);
    }
  }

  // ---------- Drilldown: Route under Driver ----------
  toggleRouteForDriver(driverId: string, routeId: string) {
    const current = this.expandedRouteByDriver.get(driverId) ?? null;
    this.expandedRouteByDriver.set(driverId, current === routeId ? null : routeId);
  }

  isRouteExpanded(driverId: string, routeId: string) {
    return (this.expandedRouteByDriver.get(driverId) ?? null) === routeId;
  }

  // ---------- Daily helpers ----------
  private getDailyForDriverAll(driverId: string) {
    return this.dailyCache.filter((d) => d.driverId === driverId);
  }

  getDailyForDriver(driverId: string) {
    return this.getDailyForDriverAll(driverId);
  }

  getOccurrences(driverId: string) {
    return this.getDailyForDriverAll(driverId).length;
  }

  getLastDriven(driverId: string) {
    const rows = this.getDailyForDriverAll(driverId);
    if (!rows.length) return '—';
    const latest = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return latest?.date ?? '—';
  }

  getPercentOccurrence(driverId: string) {
    const total = this.dailyCache.length || 0;
    if (!total) return 0;
    return (this.getOccurrences(driverId) / total) * 100;
  }

  // ---------- Compare chart helpers ----------
  private metricValueForDriver(driverId: string, metric: string): number {
    const rows = this.getDailyForDriverAll(driverId);
    if (!rows.length) return 0;

    switch (metric) {
      case 'spm': {
        const stops = rows.reduce((s, r) => s + (+r.stops || 0), 0);
        const miles = rows.reduce((s, r) => s + (+r.miles || 0), 0);
        return miles ? +(stops / miles).toFixed(2) : 0;
      }
      default: {
        const avg = rows.reduce((s, r) => s + (+r[metric] || 0), 0) / rows.length;
        const decimals = metric === 'paidVsPlan' ? 2 : metric === 'sporh' ? 1 : 1;
        return +avg.toFixed(decimals);
      }
    }
  }

  chartValue(driverId: string): number {
    const baseId = this.selectedDriverIds[0];
    const v = this.metricValueForDriver(driverId, this.compareMetric);

    if (this.compareMode === 'delta' && baseId) {
      const base = this.metricValueForDriver(baseId, this.compareMetric);
      return +(v - base).toFixed(2);
    }

    return v;
  }

  chartWidth(driverId: string): number {
    const vals = this.selectedDriverIds.map((id) => Math.abs(this.chartValue(id)));
    const max = Math.max(...vals, 1);
    return Math.min((Math.abs(this.chartValue(driverId)) / max) * 100, 100);
  }

  // ---------- Route list under a driver (NOW WITH ROLLUPS) ----------
  getRoutesForDriver(driverId: string) {
    const rows = this.getDailyForDriverAll(driverId);
    if (!rows.length) return [];

    const byRoute = new Map<string, any[]>();
    rows.forEach((r) => {
      const rid = r.routeId ?? '—';
      if (!byRoute.has(rid)) byRoute.set(rid, []);
      byRoute.get(rid)!.push(r);
    });

    const totalDays = rows.length;

    const routes = Array.from(byRoute.entries()).map(([routeId, rws]) => {
      const days = rws.length;

      // last driven (max date string)
      const last = [...rws].sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.date ?? '—';
      const pct = totalDays ? (days / totalDays) * 100 : 0;

      // rollups (preview stats before expanding)
      const avgStops = round(avg(rws, 'stops'), 0);
      const avgMiles = round(avg(rws, 'miles'), 0);
      const avgNDPPH = round(avg(rws, 'ndpph'), 1);
      const avgOvUn = round(avg(rws, 'paidVsPlan'), 2);
      const avgSPORH = round(avg(rws, 'sporh'), 1);

      const totalStops = rws.reduce((s, r) => s + (+r.stops || 0), 0);
      const totalMiles = rws.reduce((s, r) => s + (+r.miles || 0), 0);
      const avgSPM = totalMiles ? +(totalStops / totalMiles).toFixed(2) : 0;

      return {
        routeId,
        days,
        pct,
        lastDriven: last,

        // ✅ rollups
        avgStops,
        avgMiles,
        avgSPM,
        avgNDPPH,
        avgOvUn,
        avgSPORH,
      };
    });

    routes.sort((a, b) => b.days - a.days);
    return routes;

    function avg(list: any[], field: string) {
      return list.reduce((s, r) => s + (+r[field] || 0), 0) / list.length;
    }

    function round(n: number, decimals: number) {
      if (!Number.isFinite(n)) return 0;
      return +n.toFixed(decimals);
    }
  }

  isPrimaryRoute(driverId: string, routeId: string) {
    const list = this.getRoutesForDriver(driverId);
    return list.length ? list[0].routeId === routeId : false;
  }

  getDaysForDriverAndRoute(driverId: string, routeId: string) {
    return this.getDailyForDriverAll(driverId)
      .filter((d) => (d.routeId ?? '—') === routeId)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  // ---------- Generic metric helpers (cards) ----------
  metricAvg(driverId: string, field: string, decimals = 0) {
    const rows = this.getDailyForDriverAll(driverId);
    if (!rows.length) return '—';
    const avg = rows.reduce((s, r) => s + (+r[field] || 0), 0) / rows.length;
    return (+avg.toFixed(decimals)).toFixed(decimals);
  }

  metricLatest(driverId: string, field: string, decimals = 0) {
    const rows = this.getDailyForDriverAll(driverId);
    if (!rows.length) return '—';
    const latest = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const v = +latest?.[field];
    if (Number.isNaN(v)) return '—';
    return (+v.toFixed(decimals)).toFixed(decimals);
  }

  spmAvg(driverId: string) {
    const rows = this.getDailyForDriverAll(driverId);
    if (!rows.length) return '—';
    const stops = rows.reduce((s, r) => s + (+r.stops || 0), 0);
    const miles = rows.reduce((s, r) => s + (+r.miles || 0), 0);
    const spm = miles ? stops / miles : 0;
    return spm ? spm.toFixed(2) : '—';
  }

  spmLatest(driverId: string) {
    const rows = this.getDailyForDriverAll(driverId);
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

  // ---------- Drivers stream for main table ----------
  drivers$ = combineLatest([this.dataService.data$, this.dataService.viewConfig$]).pipe(
    map(([data, config]) => {
      if (!data) return [];

      const byId = new Map((data.drivers ?? []).map((d: any) => [d.driverId, d]));
      const allDaily = data.dailyHistory ?? [];

      const computeAvgSPORH = (driverId: string) => {
        const rows = allDaily.filter((r: any) => r.driverId === driverId);
        if (!rows.length) return '—';
        const avg = rows.reduce((s: number, r: any) => s + (+r.sporh || 0), 0) / rows.length;
        return +avg.toFixed(1);
      };

      // --------- UNFILTERED MODE (baseline view) ----------
      if (!config.date && !config.dayOfWeek) {
        return (data.driverBaselines ?? []).map((b: any) => {
          const meta: any = byId.get(b.driverId) || {};

          const baselineSporh =
            b.avgSPORH ?? b.avgSporh ?? b.sporh ?? b.avg_sporh ?? b.avgSPorh;

          const avgSPORH =
            baselineSporh === 0 || baselineSporh
              ? +(+baselineSporh).toFixed(1)
              : computeAvgSPORH(b.driverId);

          return { ...b, ...meta, avgSPORH };
        });
      }

      // --------- FILTERED MODE (date or DOW) ----------
      let filtered = allDaily;
      if (config.date) filtered = filtered.filter((d: any) => d.date === config.date);
      else if (config.dayOfWeek) filtered = filtered.filter((d: any) => d.dayOfWeek === config.dayOfWeek);

      const grouped = new Map<string, any[]>();
      filtered.forEach((d: any) => {
        if (!grouped.has(d.driverId)) grouped.set(d.driverId, []);
        grouped.get(d.driverId)!.push(d);
      });

      return Array.from(grouped.entries()).map(([id, rows]) => {
        const meta: any = byId.get(id) || {};
        return {
          driverId: id,
          name: meta.name,
          seniority: meta.seniority,
          bidRoute: meta.bidRoute,
          avgStops: Math.round(rows.reduce((s, r) => s + r.stops, 0) / rows.length),
          avgMiles: Math.round(rows.reduce((s, r) => s + r.miles, 0) / rows.length),
          avgSPM: +(
            rows.reduce((s, r) => s + r.stops, 0) /
            (rows.reduce((s, r) => s + r.miles, 0) || 1)
          ).toFixed(2),
          avgNDPPH: +(rows.reduce((s, r) => s + r.ndpph, 0) / rows.length).toFixed(1),
          avgOvUn: +(rows.reduce((s, r) => s + r.paidVsPlan, 0) / rows.length).toFixed(2),
          avgSPORH: +(rows.reduce((s, r) => s + (+r.sporh || 0), 0) / rows.length).toFixed(1),
          amPmSplit: meta.amPmSplit ?? '—',
        };
      });
    })
  );
}