import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VtoComponent } from './vto.component';

describe('VtoComponent', () => {
  let component: VtoComponent;
  let fixture: ComponentFixture<VtoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VtoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VtoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
