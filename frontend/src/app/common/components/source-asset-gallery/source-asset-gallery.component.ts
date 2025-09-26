import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  NgZone,
  OnInit,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import {Subscription} from 'rxjs';
import {
  SourceAssetService,
  SourceAssetResponseDto,
  SourceAssetSearchDto,
} from '../../services/source-asset.service';
import {AssetTypeEnum} from '../../../admin/source-assets-management/source-asset.model';
import {UserService} from '../../services/user.service';

@Component({
  selector: 'app-source-asset-gallery',
  templateUrl: './source-asset-gallery.component.html',
  styleUrls: ['./source-asset-gallery.component.scss'],
})
export class SourceAssetGalleryComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @Output() assetSelected = new EventEmitter<SourceAssetResponseDto>();
  @Input() filterByType: AssetTypeEnum | null = null;
  @Input() filterByMimeType: 'image/*' | 'image/png' | 'video/mp4' | 'audio/mpeg' | null =
    null;
  @ViewChild('sentinel') private sentinel!: ElementRef<HTMLElement>;

  public assets: SourceAssetResponseDto[] = [];
  public isLoading = true;
  public allAssetsLoaded = false;
  private assetsSubscription: Subscription | undefined;
  private loadingSubscription: Subscription | undefined;
  private allAssetsLoadedSubscription: Subscription | undefined;
  private scrollObserver!: IntersectionObserver;

  constructor(
    private sourceAssetService: SourceAssetService,
    private userService: UserService,
    private elementRef: ElementRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loadingSubscription = this.sourceAssetService.isLoading$.subscribe(
      loading => {
        this.isLoading = loading;
      },
    );

    this.allAssetsLoadedSubscription =
      this.sourceAssetService.allAssetsLoaded.subscribe(loaded => {
        this.allAssetsLoaded = loaded;
      });

    this.assetsSubscription = this.sourceAssetService.assets.subscribe(
      assets => {
        this.assets = assets;
      },
    );

    // Load assets for the current user
    const userDetails = this.userService.getUserDetails();
    const filters: SourceAssetSearchDto = {};
    if (userDetails?.email) {
      filters.userEmail = userDetails.email;
    }
    if (this.filterByType) {
      filters.assetType = this.filterByType;
    }
    if (this.filterByMimeType) {
      filters.mimeType = this.filterByMimeType;
    }

    this.sourceAssetService.setFilters(filters);
  }

  ngAfterViewInit(): void {
    this.setupInfiniteScrollObserver();
  }

  ngOnDestroy(): void {
    this.assetsSubscription?.unsubscribe();
    this.loadingSubscription?.unsubscribe();
    this.allAssetsLoadedSubscription?.unsubscribe();
    this.scrollObserver?.disconnect();
  }

  private getScrollableContainer(): HTMLElement | null {
    const element = this.elementRef.nativeElement as HTMLElement;
    const overlayPane = element.closest('.cdk-overlay-pane');
    return (
      overlayPane?.querySelector<HTMLElement>('.mat-mdc-dialog-content') || null
    );
  }

  private setupInfiniteScrollObserver(): void {
    if (!this.sentinel) {
      return;
    }

    const scrollRoot = this.getScrollableContainer();

    this.scrollObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !this.isLoading && !this.allAssetsLoaded) {
          this.ngZone.run(() => {
            this.sourceAssetService.loadAssets();
          });
        }
      },
      {
        root: scrollRoot,
      },
    );

    this.scrollObserver.observe(this.sentinel.nativeElement);
  }

  selectAsset(asset: SourceAssetResponseDto): void {
    this.assetSelected.emit(asset);
  }

  trackByAsset(index: number, asset: SourceAssetResponseDto): string {
    return asset.id;
  }
}
