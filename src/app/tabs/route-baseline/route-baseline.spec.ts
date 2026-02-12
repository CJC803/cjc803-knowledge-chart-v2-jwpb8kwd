import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RouteBaseline } from './route-baseline';

describe('RouteBaseline', () => {
  let component: RouteBaseline;
  let fixture: ComponentFixture<RouteBaseline>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteBaseline]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RouteBaseline);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
