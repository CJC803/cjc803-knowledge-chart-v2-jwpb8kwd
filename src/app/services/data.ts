import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export type ViewConfig = {
  startDate: string | null;
  endDate: string | null;
  dayOfWeek: string | null;
  excludePeak: boolean;
  excludeSupervisedDays: boolean;
};

@Injectable({ providedIn: 'root' })
export class DataService {
  private dataSubject = new BehaviorSubject<any | null>(null);
  data$ = this.dataSubject.asObservable();

  private viewConfigSubject = new BehaviorSubject<ViewConfig>({
    startDate: null,
    endDate: null,
    dayOfWeek: null,
    excludePeak: false,
    excludeSupervisedDays: false,
  });
  viewConfig$ = this.viewConfigSubject.asObservable();

  constructor(private http: HttpClient) {
    this.load();
  }

  load() {
    this.http.get('assets/mock-data/knowledgechart-demo.json').subscribe({
      next: (data) => {
        console.log('✅ Mock data loaded', data);
        this.dataSubject.next(data);
      },
      error: (err) => {
        console.error('❌ Failed to load mock data', err);
        this.dataSubject.next(null);
      },
    });
  }

  setStartDate(startDate: string | null) {
    const current = this.viewConfigSubject.value;
    this.viewConfigSubject.next({ ...current, startDate });
  }

  setEndDate(endDate: string | null) {
    const current = this.viewConfigSubject.value;
    this.viewConfigSubject.next({ ...current, endDate });
  }

  setDayOfWeek(dayOfWeek: string | null) {
    const current = this.viewConfigSubject.value;
    this.viewConfigSubject.next({ ...current, dayOfWeek });
  }

  setExcludePeak(excludePeak: boolean) {
    const current = this.viewConfigSubject.value;
    this.viewConfigSubject.next({ ...current, excludePeak });
  }

  setExcludeSupervisedDays(excludeSupervisedDays: boolean) {
    const current = this.viewConfigSubject.value;
    this.viewConfigSubject.next({ ...current, excludeSupervisedDays });
  }

  resetFilters() {
    this.viewConfigSubject.next({
      startDate: null,
      endDate: null,
      dayOfWeek: null,
      excludePeak: false,
      excludeSupervisedDays: false,
    });
  }
}
