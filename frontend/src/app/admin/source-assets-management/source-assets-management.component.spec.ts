import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SourceAssetsManagementComponent } from './source-assets-management.component';

describe('SourceAssetsManagementComponent', () => {
  let component: SourceAssetsManagementComponent;
  let fixture: ComponentFixture<SourceAssetsManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SourceAssetsManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SourceAssetsManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
