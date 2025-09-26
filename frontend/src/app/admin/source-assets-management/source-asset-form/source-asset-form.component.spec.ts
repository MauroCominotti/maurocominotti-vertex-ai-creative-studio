import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SourceAssetFormComponent } from './source-asset-form.component';

describe('SourceAssetFormComponent', () => {
  let component: SourceAssetFormComponent;
  let fixture: ComponentFixture<SourceAssetFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SourceAssetFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SourceAssetFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
