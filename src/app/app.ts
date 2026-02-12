import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from './services/data';

import { RouteBaselineComponent } from './tabs/route-baseline/route-baseline';
import { DriverBaselineComponent } from './tabs/driver-baseline/driver-baseline';
import { ComparisonComponent } from './tabs/comparison/comparison';

type TabKey = 'routes' | 'drivers' | 'comparison';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouteBaselineComponent,
    DriverBaselineComponent,
    ComparisonComponent
  ],
  template: `
    <div class="app-shell">
      <header class="app-header">
        <h1>Knowledge Charts</h1>
        <span class="sub">Operational Performance Dashboard</span>
      </header>

      <section class="controls">
      <label>
          Start Date
          <input type="date" (change)="onStartDateChange($event)" />
        </label>

        <label>
          End Date
          <input type="date" (change)="onEndDateChange($event)" />
        </label>


        <label>
          Day of Week
          <select (change)="onDayChange($event)">
            <option value="">All</option>
            <option>Monday</option>
            <option>Tuesday</option>
            <option>Wednesday</option>
            <option>Thursday</option>
            <option>Friday</option>
            <option>Saturday</option>
          </select>
        </label>
      </section>

      <nav class="tabs">
        <button
          [class.active]="activeTab === 'routes'"
          (click)="activeTab = 'routes'">
          Route Baseline
        </button>

        <button
          [class.active]="activeTab === 'drivers'"
          (click)="activeTab = 'drivers'">
          Driver Baseline
        </button>
      </nav>

      <main class="content">
        <app-route-baseline *ngIf="activeTab === 'routes'"></app-route-baseline>
        <app-driver-baseline *ngIf="activeTab === 'drivers'"></app-driver-baseline>
        <app-comparison *ngIf="activeTab === 'comparison'"></app-comparison>
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      background: #ffffff;
      min-height: 100vh;
      color: #1f1f1f;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    }

    .app-header {
      background: #351c15;
      color: white;
      padding: 16px 24px;
    }

    .app-header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
    }

    .sub {
      font-size: 13px;
      opacity: 0.85;
    }

    .controls {
      display: flex;
      gap: 24px;
      padding: 16px 24px;
      background: #f7f7f7;
      border-bottom: 4px solid #ffb500;
    }

    .controls label {
      display: flex;
      flex-direction: column;
      font-weight: 600;
      color: #351c15;
      font-size: 13px;
    }

    .controls input,
    .controls select {
      margin-top: 4px;
      padding: 6px 8px;
      font-size: 13px;
    }

    .tabs {
      display: flex;
      gap: 8px;
      padding: 12px 24px;
      background: #ffffff;
      border-bottom: 1px solid #ddd;
    }

    .tabs button {
      background: transparent;
      border: none;
      padding: 8px 12px;
      font-weight: 600;
      cursor: pointer;
      color: #351c15;
      border-bottom: 3px solid transparent;
      font-size: 14px;
    }

    .tabs button.active {
      border-bottom-color: #ffb500;
    }

    .content {
      padding: 24px;
      background: #ffffff;
    }
  `]
})
export class AppComponent implements OnInit {
  activeTab: TabKey = 'routes';

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.load();
  }

  onDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.dataService.setDate(value || null);
  }

  onDayChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.dataService.setDayOfWeek(value || null);
  }
  startDate: string | null = null;
endDate: string | null = null;

onStartDateChange(event: Event) {
  this.startDate = (event.target as HTMLInputElement).value || null;
  // optional: later we’ll push this into viewConfig
}

onEndDateChange(event: Event) {
  this.endDate = (event.target as HTMLInputElement).value || null;
  // optional: later we’ll push this into viewConfig
}

}
