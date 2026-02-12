import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverBaseline } from './driver-baseline';

describe('DriverBaseline', () => {
  let component: DriverBaseline;
  let fixture: ComponentFixture<DriverBaseline>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverBaseline]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriverBaseline);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
