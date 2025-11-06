import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerateVideoStepComponent } from './generate-video-step.component';

describe('GenerateVideoStepComponent', () => {
  let component: GenerateVideoStepComponent;
  let fixture: ComponentFixture<GenerateVideoStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GenerateVideoStepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenerateVideoStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
