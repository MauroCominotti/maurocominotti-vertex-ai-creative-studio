import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {MediaTemplatesService} from './media-templates.service';

describe('MediaTemplatesService', () => {
  let service: MediaTemplatesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MediaTemplatesService],
    });
    service = TestBed.inject(MediaTemplatesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
