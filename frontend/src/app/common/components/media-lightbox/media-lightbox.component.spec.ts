import {ComponentFixture, TestBed} from '@angular/core/testing';

import {MediaLightboxComponent} from './media-lightbox.component';

describe('MediaLightboxComponent', () => {
  let component: MediaLightboxComponent;
  let fixture: ComponentFixture<MediaLightboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MediaLightboxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaLightboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
