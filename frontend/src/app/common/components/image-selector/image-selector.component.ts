import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MediaItem} from '../../models/media-item.model';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../../environments/environment';
import {Observable, finalize} from 'rxjs';
import {
  SourceAssetResponseDto,
  SourceAssetService,
} from '../../services/source-asset.service';
import {AssetTypeEnum} from '../../../admin/source-assets-management/source-asset.model';
import {WorkspaceStateService} from '../../../services/workspace/workspace-state.service';

export interface MediaItemSelection {
  mediaItem: MediaItem;
  selectedIndex: number;
}

@Component({
  selector: 'app-image-selector',
  templateUrl: './image-selector.component.html',
  styleUrls: ['./image-selector.component.scss'],
})
export class ImageSelectorComponent {
  isUploading = false;

  constructor(
    public dialogRef: MatDialogRef<ImageSelectorComponent>,
    private http: HttpClient,
    private sourceAssetService: SourceAssetService,
    private workspaceStateService: WorkspaceStateService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      mimeType: 'image/*' | 'image/png' | 'video/mp4' | null;
      assetType: AssetTypeEnum;
    },
  ) {}

  private uploadAsset(file: File): Observable<SourceAssetResponseDto> {
    const formData = new FormData();
    const activeWorkspaceId = this.workspaceStateService.getActiveWorkspaceId();

    formData.append('file', file);
    formData.append('scope', 'private');

    // Prioritize file's mime type, but fall back to dialog data if needed.
    if (file.type.startsWith('video/')) {
      formData.append('assetType', 'generic_video');
    } else {
      formData.append(
        'assetType',
        this.data?.assetType || AssetTypeEnum.GENERIC_IMAGE,
      );
    }
    if (activeWorkspaceId) {
      formData.append('workspaceId', activeWorkspaceId);
    }

    return this.http.post<SourceAssetResponseDto>(
      `${environment.backendURL}/source_assets/upload`,
      formData,
    );
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList[0]) {
      const file = fileList[0];
      this.isUploading = true;
      this.uploadAsset(file)
        .pipe(finalize(() => (this.isUploading = false)))
        .subscribe(asset => {
          this.sourceAssetService.addAsset(asset);
          this.dialogRef.close(asset);
        });
    }
  }

  onMediaItemSelected(selection: MediaItemSelection): void {
    this.dialogRef.close(selection);
  }

  onAssetSelected(asset: SourceAssetResponseDto): void {
    this.dialogRef.close(asset);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files[0]) {
      const file = event.dataTransfer.files[0];
      this.isUploading = true;
      this.uploadAsset(file)
        .pipe(finalize(() => (this.isUploading = false)))
        .subscribe(asset => {
          this.sourceAssetService.addAsset(asset);
          this.dialogRef.close(asset);
        });
    }
  }
}
