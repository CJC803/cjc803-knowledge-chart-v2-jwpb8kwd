import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-comparison',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="comparison-shell">
      <header class="header">
        <h2>Comparison & Staffing Analysis</h2>
        <p>Driver performance compared to selected route baseline</p>
      </header>

      <!-- CONTROLS -->
      <section class="controls">
        <label>
          Route Baseline
          <select (change)="onRouteChange($event)">
            <option value="">Select route</option>
            <option *ngFor="let r of routes" [value]="r.routeId">
              {{ r.routeId }}
            </option>
          </select>
        </label>

        <label>
          Drivers
          <select multiple size="4" (change)="onDriversChange($event)">
            <option *ngFor="let d of drivers" [value]="d.driverId">
              {{ d.name }}
            </option>
          </select>
        </label>
      </section>

      <!-- TABLE -->
      <section *ngIf="rows.length" class="card">
        <h3>Performance Delta vs Route</h3>

        <table>
          <thead>
            <tr>
              <th>Driver</th>
              <th>Δ Stops</th>
              <th>Δ Miles</th>
              <th>Δ SPM</th>
              <th>Δ NDPPH</th>
              <th>Δ Ov/Un</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of rows">
              <td class="driver">{{ r.name }}</td>
              <td>{{ r.stops }}</td>
              <td>{{ r.miles }}</td>
              <td>{{ r.spm }}</td>
              <td [class.positive]="r.ndpph > 0" [class.negative]="r.ndpph < 0">
                {{ r.ndpph }}
              </td>
              <td>{{ r.ovun }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- CHART -->
      <section *ngIf="rows.length" class="card">
        <h3>NDPPH Delta (Visual)</h3>

        <div class="bar-chart">
          <div *ngFor="let r of rows" class="bar-row">
            <span class="label">{{ r.name }}</span>

            <div class="bar-track">
              <div
                class="bar"
                [class.positive]="r.ndpph > 0"
                [class.negative]="r.ndpph < 0"
                [style.width.%]="scale(r.ndpph)">
              </div>
            </div>

            <span class="value">{{ r.ndpph }}</span>
          </div>
        </div>
      </section>

      <p *ngIf="!rows.length" class="empty">
        Select a route and at least 2 drivers to compare.
      </p>
    </section>
  `,
  styles: [`
    .comparison-shell {
      padding: 24px;
      background: #ffffff;
      color: #1f1f1f;
    }

    .header h2 {
      margin: 0;
      color: #351c15;
    }

    .header p {
      margin: 4px 0 20px;
      color: #666;
    }

    .controls {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
    }

    .controls label {
      display: flex;
      flex-direction: column;
      font-weight: 600;
      color: #351c15;
    }

    select {
      margin-top: 4px;
      padding: 6px;
      border: 1px solid #ccc;
    }

    .card {
      background: #f7f7f7;
      border-left: 6px solid #ffb500;
      padding: 16px;
      margin-bottom: 24px;
    }

    h3 {
      margin-top: 0;
      color: #351c15;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 8px;
      background: #351c15;
      color: white;
    }

    td {
      padding: 8px;
      border-bottom: 1px solid #ddd;
    }

    .driver {
      font-weight: 600;
    }

    .positive {
      color: #2e7d32;
      font-weight: 600;
    }

    .negative {
      color: #c62828;
      font-weight: 600;
    }

    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .bar-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .label {
      width: 120px;
      font-weight: 600;
    }

    .bar-track {
      flex: 1;
      height: 16px;
      background: #e0e0e0;
      position: relative;
    }

    .bar {
      height: 100%;
    }

    .bar.positive {
      background: #ffb500;
    }

    .bar.negative {
      background: #351c15;
    }

    .value {
      width: 48px;
      text-align: right;
      font-weight: 600;
    }

    .empty {
      color: #666;
      font-style: italic;
    }
  `]
})
export class ComparisonComponent {
  private dataService = inject(DataService);

  routes: any[] = [];
  drivers: any[] = [];
  rows: any[] = [];

  selectedRouteId: string | null = null;
  selectedDriverIds = new Set<string>();
  private latestData: any = null;

  constructor() {
    combineLatest([
      this.dataService.data$,
      this.dataService.viewConfig$
    ])
      .pipe(
        map(([data]) => {
          if (!data) return;
          this.latestData = data;
          this.routes = data.routeBaselines;
          this.drivers = data.drivers;
          this.recomputeRows();
        })
      )
      .subscribe();
  }

  recomputeRows() {
    if (!this.latestData || !this.selectedRouteId || this.selectedDriverIds.size < 2) {
      this.rows = [];
      return;
    }

    const route = this.latestData.routeBaselines.find(
      (r: any) => r.routeId === this.selectedRouteId
    );
    if (!route) return;

    const driversById = new Map(
      this.latestData.drivers.map((d: any) => [d.driverId, d])
    );

    this.rows = this.latestData.driverBaselines
      .filter((d: any) => this.selectedDriverIds.has(d.driverId))
      .map((d: any) => {
        const meta: any = driversById.get(d.driverId) || {};
        return {
          name: meta.name ?? d.driverId,
          stops: +(d.avgStops - route.avgStops).toFixed(1),
          miles: +(d.avgMiles - route.avgMiles).toFixed(1),
          spm: +(d.avgSPM - route.avgSPM).toFixed(2),
          ndpph: +(d.avgNDPPH - route.avgNDPPH).toFixed(2),
          ovun: +(d.avgOvUn - route.avgOvUn).toFixed(2)
        };
      });
  }

  scale(value: number): number {
    const max = 10; // visual cap
    return Math.min(Math.abs(value) / max * 100, 100);
  }

  onRouteChange(event: Event) {
    this.selectedRouteId = (event.target as HTMLSelectElement).value || null;
    this.recomputeRows();
  }

  onDriversChange(event: Event) {
    const options = (event.target as HTMLSelectElement).selectedOptions;
    this.selectedDriverIds = new Set(
      Array.from(options).map(o => o.value)
    );
    this.recomputeRows();
  }
}
