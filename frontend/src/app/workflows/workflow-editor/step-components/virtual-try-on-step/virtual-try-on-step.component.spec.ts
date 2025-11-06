import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VirtualTryOnStepComponent } from './virtual-try-on-step.component';

describe('VirtualTryOnStepComponent', () => {
  let component: VirtualTryOnStepComponent;
  let fixture: ComponentFixture<VirtualTryOnStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VirtualTryOnStepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VirtualTryOnStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
