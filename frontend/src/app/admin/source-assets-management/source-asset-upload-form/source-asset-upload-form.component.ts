import {Component} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {AssetScopeEnum, AssetTypeEnum} from '../source-asset.model';
import {SourceAssetsService} from '../source-assets.service';
import {finalize} from 'rxjs';
import {MatSnackBar} from '@angular/material/snack-bar';
import {handleErrorSnackbar} from '../../../utils/handleErrorSnackbar';

@Component({
  selector: 'app-source-asset-upload-form',
  templateUrl: './source-asset-upload-form.component.html',
  styleUrls: ['./source-asset-upload-form.component.scss'],
})
export class SourceAssetUploadFormComponent {
  form: FormGroup;
  assetTypes = Object.values(AssetTypeEnum);
  assetScopes = Object.values(AssetScopeEnum);
  isUploading = false;
  fileName: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<SourceAssetUploadFormComponent>,
    private fb: FormBuilder,
    private sourceAssetsService: SourceAssetsService,
    private _snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      file: [null, Validators.required],
      scope: [AssetScopeEnum.SYSTEM, Validators.required],
      assetType: [AssetTypeEnum.GENERIC_IMAGE, Validators.required],
    });
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      this.form.patchValue({file: file});
      this.fileName = file.name;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onUpload(): void {
    if (this.form.valid) {
      this.isUploading = true;
      const {file, scope, assetType} = this.form.value;
      this.sourceAssetsService
        .uploadSourceAsset(file, scope, assetType)
        .pipe(finalize(() => (this.isUploading = false)))
        .subscribe({
          next: asset => {
            this.dialogRef.close(asset);
          },
          error: err => {
            handleErrorSnackbar(this._snackBar, err, 'Asset Upload');
          },
        });
    }
  }
}
