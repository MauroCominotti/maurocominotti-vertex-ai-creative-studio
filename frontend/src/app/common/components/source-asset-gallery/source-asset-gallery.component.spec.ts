import { ComponentFixture, TestBed } from '@angular/core/testing';

import {SourceAssetGalleryComponent} from './source-asset-gallery.component';

describe('SourceAssetGalleryComponent', () => {
  let component: SourceAssetGalleryComponent;
  let fixture: ComponentFixture<SourceAssetGalleryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SourceAssetGalleryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SourceAssetGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
