import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {of} from 'rxjs';

import {MediaTemplatesManagementComponent} from './media-templates-management.component';
import {MediaTemplatesService} from './media-templates.service';

describe('MediaTemplatesManagementComponent', () => {
  let component: MediaTemplatesManagementComponent;
  let fixture: ComponentFixture<MediaTemplatesManagementComponent>;
  let mockMediaTemplatesService: jasmine.SpyObj<MediaTemplatesService>;

  beforeEach(async () => {
    mockMediaTemplatesService = jasmine.createSpyObj('MediaTemplatesService', [
      'getMediaTemplates',
    ]);
    mockMediaTemplatesService.getMediaTemplates.and.returnValue(
      of({data: [], count: 0}),
    );

    await TestBed.configureTestingModule({
      imports: [MediaTemplatesManagementComponent, NoopAnimationsModule],
      providers: [
        {provide: MediaTemplatesService, useValue: mockMediaTemplatesService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaTemplatesManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
