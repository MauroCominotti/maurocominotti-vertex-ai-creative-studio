/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {catchError, Observable, of} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {BrandGuidelineModel} from '../../models/brand-guideline.model';

@Injectable({
  providedIn: 'root',
})
export class BrandGuidelineService {
  private apiUrl = `${environment.backendURL}/brand-guidelines`;

  constructor(private http: HttpClient) {}

  createBrandGuideline(formData: FormData): Observable<BrandGuidelineModel> {
    return this.http.post<BrandGuidelineModel>(this.apiUrl, formData);
  }

  /**
   * Fetches the brand guideline for a specific workspace.
   * @param workspaceId The ID of the workspace.
   * @returns An observable of the brand guideline or null if not found.
   */
  getBrandGuidelineForWorkspace(
    workspaceId: string,
  ): Observable<BrandGuidelineModel | null> {
    return this.http
      .get<BrandGuidelineModel>(`${this.apiUrl}/workspace/${workspaceId}`)
      .pipe(catchError(() => of(null))); // Return null if not found (404) or on other errors
  }

  /**
   * Deletes a brand guideline by its ID.
   * @param id The ID of the brand guideline to delete.
   */
  deleteBrandGuideline(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
