import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SourceAssetUploadFormComponent } from './source-asset-upload-form.component';

describe('SourceAssetUploadFormComponent', () => {
  let component: SourceAssetUploadFormComponent;
  let fixture: ComponentFixture<SourceAssetUploadFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SourceAssetUploadFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SourceAssetUploadFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
