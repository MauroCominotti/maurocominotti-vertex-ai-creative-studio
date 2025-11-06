import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerateTextStepComponent } from './generate-text-step.component';

describe('GenerateTextStepComponent', () => {
  let component: GenerateTextStepComponent;
  let fixture: ComponentFixture<GenerateTextStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GenerateTextStepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenerateTextStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
