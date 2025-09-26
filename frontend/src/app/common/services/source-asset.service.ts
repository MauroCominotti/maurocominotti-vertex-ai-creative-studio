import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {tap, catchError, finalize, shareReplay} from 'rxjs/operators';
import {environment} from '../../../environments/environment';

export interface SourceAssetResponseDto {
  id: string;
  userId: string;
  gcsUri: string;
  originalFilename: string;
  mimeType: string;
  fileHash: string;
  createdAt: string;
  updatedAt: string;
  presignedUrl: string;
  presignedThumbnailUrl?: string;
}

export interface SourceAssetSearchDto {
  limit?: number;
  startAfter?: string;
  mimeType?: string;
  assetType?: string;
  userEmail?: string;
}

export interface PaginationResponseDto<T> {
  data: T[];
  count: number;
  nextPageCursor: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class SourceAssetService {
  private assets$ = new BehaviorSubject<SourceAssetResponseDto[]>([]);
  public isLoading$ = new BehaviorSubject<boolean>(false);
  private allAssetsLoaded$ = new BehaviorSubject<boolean>(false);
  private nextPageCursor: string | null = null;
  private allFetchedAssets: SourceAssetResponseDto[] = [];
  private filters$ = new BehaviorSubject<SourceAssetSearchDto>({});

  // Cache the request observable to prevent multiple API calls for the same filters.
  private assetsRequest$: Observable<
    PaginationResponseDto<SourceAssetResponseDto>
  > | null = null;

  constructor(private http: HttpClient) {}

  get assets(): Observable<SourceAssetResponseDto[]> {
    return this.assets$.asObservable();
  }

  get allAssetsLoaded(): Observable<boolean> {
    return this.allAssetsLoaded$.asObservable();
  }

  setFilters(filters: SourceAssetSearchDto) {
    const currentFilters = this.filters$.value;
    // Do not re-fetch if the filters are the same and we've already loaded data.
    // This prevents re-fetching every time the gallery is opened.
    if (
      JSON.stringify(currentFilters) === JSON.stringify(filters) &&
      (this.allFetchedAssets.length > 0 || this.allAssetsLoaded$.value)
    ) {
      return;
    }

    this.filters$.next(filters);
    // When filters change, clear the cache and reset.
    this.assetsRequest$ = null;
    this.loadAssets(true);
  }

  loadAssets(reset = false): void {
    if (this.isLoading$.value) {
      return;
    }

    if (reset) {
      this.allFetchedAssets = [];
      this.nextPageCursor = null;
      this.allAssetsLoaded$.next(false);
      this.assetsRequest$ = null; // Invalidate cache on reset
    }

    // If a request is already cached and we are not resetting, do nothing.
    // This prevents re-fetching when a component re-initializes.
    if (this.assetsRequest$ && !reset) {
      return;
    }

    if (this.allAssetsLoaded$.value) {
      return;
    }

    this.isLoading$.next(true);
    this.assetsRequest$ = this.fetchAssets().pipe(
      tap(response => {
        this.nextPageCursor = response.nextPageCursor ?? null;
        this.allFetchedAssets.push(...response.data);
        this.assets$.next(this.allFetchedAssets);

        if (!this.nextPageCursor) {
          this.allAssetsLoaded$.next(true);
        } else {
          // If there are more pages, clear the cache so infinite scroll can fetch the next page.
          this.assetsRequest$ = null;
        }
      }),
      catchError(() => {
        this.assetsRequest$ = null; // Allow retry on error
        return of({data: [], count: 0, nextPageCursor: null});
      }),
      finalize(() => {
        this.isLoading$.next(false);
      }),
      shareReplay(1), // Cache the response for concurrent subscribers.
    );

    this.assetsRequest$.subscribe();
  }

  private fetchAssets(): Observable<
    PaginationResponseDto<SourceAssetResponseDto>
  > {
    const assetsUrl = `${environment.backendURL}/source_assets/search`;
    const currentFilters = this.filters$.value;

    const body: SourceAssetSearchDto = {
      limit: 20,
      ...currentFilters,
      startAfter: this.nextPageCursor ?? undefined,
    };
    return this.http.post<PaginationResponseDto<SourceAssetResponseDto>>(
      assetsUrl,
      body,
    );
  }

  addAsset(asset: SourceAssetResponseDto) {
    // Prepend the new asset to our local cache and notify subscribers.
    this.allFetchedAssets.unshift(asset);
    this.assets$.next(this.allFetchedAssets);
  }
}
