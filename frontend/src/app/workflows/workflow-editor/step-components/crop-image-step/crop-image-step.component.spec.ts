import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CropImageStepComponent } from './crop-image-step.component';

describe('CropImageStepComponent', () => {
  let component: CropImageStepComponent;
  let fixture: ComponentFixture<CropImageStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CropImageStepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CropImageStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
