import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export type ViewConfig = {
  date: string | null;
  dayOfWeek: string | null;
};

@Injectable({ providedIn: 'root' })
export class DataService {
  private dataSubject = new BehaviorSubject<any | null>(null);
  data$ = this.dataSubject.asObservable();

  private viewConfigSubject = new BehaviorSubject<ViewConfig>({
    date: null,
    dayOfWeek: null,
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

  setDate(date: string | null) {
    const current = this.viewConfigSubject.value;
    this.viewConfigSubject.next({ ...current, date });
  }

  setDayOfWeek(dayOfWeek: string | null) {
    const current = this.viewConfigSubject.value;
    this.viewConfigSubject.next({ ...current, dayOfWeek });
  }

  resetFilters() {
    this.viewConfigSubject.next({ date: null, dayOfWeek: null });
  }
}
