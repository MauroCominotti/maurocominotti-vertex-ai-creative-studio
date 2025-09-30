import {TestBed} from '@angular/core/testing';
import {CanActivateFn} from '@angular/router';

import {AdminAuthGuard} from './admin-auth.guard';

describe('AdminAuthGuard', () => {
  let service: AdminAuthGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminAuthGuard);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
