import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {environment} from '../../../environments/environment';
import {PaginatedResponse} from '../../common/models/paginated-response.model';
import {AssetScopeEnum, AssetTypeEnum, SourceAsset} from './source-asset.model';
import {SourceAssetResponseDto} from '../../common/services/source-asset.service';

export interface SourceAssetSearch {
  originalFilename?: string;
  scope?: AssetScopeEnum;
  assetType?: AssetTypeEnum;
}

@Injectable({
  providedIn: 'root',
})
export class SourceAssetsService {
  private apiUrl = `${environment.backendURL}/source_assets`;

  constructor(private http: HttpClient) {}

  searchSourceAssets(
    filters: SourceAssetSearch,
    limit: number,
    startAfter?: string,
  ): Observable<PaginatedResponse<SourceAssetResponseDto>> {
    const backendFilters: {[key: string]: any} = {
      original_filename: filters.originalFilename,
      scope: filters.scope,
      asset_type: filters.assetType,
      limit,
      start_after: startAfter,
    };
    // Remove undefined properties so they are not sent to the backend
    Object.keys(backendFilters).forEach(
      key =>
        (backendFilters[key] === undefined || backendFilters[key] === null) &&
        delete backendFilters[key],
    );
    return this.http
      .post<
        PaginatedResponse<SourceAssetResponseDto>
      >(`${this.apiUrl}/search`, backendFilters)
      .pipe(catchError(this.handleError));
  }

  createSourceAsset(asset: SourceAsset): Observable<SourceAsset> {
    return this.http
      .post<SourceAsset>(this.apiUrl, asset)
      .pipe(catchError(this.handleError));
  }

  uploadSourceAsset(
    file: File,
    scope: AssetScopeEnum,
    assetType: AssetTypeEnum,
  ): Observable<SourceAssetResponseDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scope', scope);
    formData.append('assetType', assetType); // Backend expects snake_case
    return this.http.post<SourceAssetResponseDto>(
      `${this.apiUrl}/upload`,
      formData,
    );
  }

  updateSourceAsset(asset: SourceAsset): Observable<SourceAsset> {
    const url = `${this.apiUrl}/${asset.id}`;
    return this.http
      .put<SourceAsset>(url, asset)
      .pipe(catchError(this.handleError));
  }

  deleteSourceAsset(id: string): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (
        error.error &&
        typeof error.error === 'object' &&
        error.error.detail
      ) {
        errorMessage += `\nDetails: ${JSON.stringify(error.error.detail)}`;
      } else if (error.error) {
        errorMessage += `\nBackend Error: ${JSON.stringify(error.error)}`;
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
