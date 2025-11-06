import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerateImageStepComponent } from './generate-image-step.component';

describe('GenerateImageStepComponent', () => {
  let component: GenerateImageStepComponent;
  let fixture: ComponentFixture<GenerateImageStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GenerateImageStepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenerateImageStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
