import { TestBed } from '@angular/core/testing';

import { SourceAssetsService } from './source-assets.service';

describe('SourceAssetsService', () => {
  let service: SourceAssetsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SourceAssetsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
