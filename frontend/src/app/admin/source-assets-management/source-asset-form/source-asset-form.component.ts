import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {SourceAsset, AssetTypeEnum, AssetScopeEnum} from '../source-asset.model';

@Component({
  selector: 'app-source-asset-form',
  templateUrl: './source-asset-form.component.html',
  styleUrls: ['./source-asset-form.component.scss'],
})
export class SourceAssetFormComponent implements OnInit {
  form: FormGroup;
  assetTypes = Object.values(AssetTypeEnum);
  assetScopes = Object.values(AssetScopeEnum);

  constructor(
    public dialogRef: MatDialogRef<SourceAssetFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {asset: SourceAsset},
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({});
  }

  ngOnInit(): void {
    const asset = this.data.asset || ({} as SourceAsset);

    this.form = this.fb.group({
      id: [asset.id],
      originalFilename: [asset.originalFilename || '', Validators.required],
      scope: [asset.scope || AssetScopeEnum.PRIVATE, Validators.required],
      assetType: [asset.assetType, Validators.required],
      gcsUri: [asset.gcsUri || '', Validators.required],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
