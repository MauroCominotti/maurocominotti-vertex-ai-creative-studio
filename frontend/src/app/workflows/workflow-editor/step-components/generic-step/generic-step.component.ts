
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AssetTypeEnum } from '../../../../admin/source-assets-management/source-asset.model';
import { ImageCropperDialogComponent } from '../../../../common/components/image-cropper-dialog/image-cropper-dialog.component';
import { ImageSelectorComponent, MediaItemSelection } from '../../../../common/components/image-selector/image-selector.component';
import { ReferenceImage } from '../../../../common/models/search.model';
import { SourceAssetResponseDto } from '../../../../common/services/source-asset.service';
import { StepConfig } from './step.model';

@Component({
  selector: 'app-generic-step',
  templateUrl: './generic-step.component.html',
  styleUrls: ['./generic-step.component.scss'],
})
export class GenericStepComponent implements OnInit, OnChanges {
  @Input() stepForm!: FormGroup;
  @Input() stepIndex!: number;
  @Input() availableOutputs: any[] = [];
  @Input() mode: 'create' | 'edit' | 'run' = 'create';
  @Input() config!: StepConfig;
  @Input() showValidationErrors = false;
  @Output() delete = new EventEmitter<void>();

  isCollapsed = true;
  inputModes: { [key: string]: 'fixed' | 'linked' } = {};
  referenceImages: { [key: string]: ReferenceImage[] } = {};
  compatibleOutputs: { [key: string]: any[] } = {};

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    const inputs = this.stepForm.get('inputs') as FormGroup;
    this.config.inputs.forEach(input => {
      const validators = input.required ? [Validators.required] : [];

      if (!inputs.contains(input.name)) {
        inputs.addControl(input.name, this.fb.control(null, validators));
      } else {
        const control = inputs.get(input.name);
        control?.setValidators(validators);
        control?.updateValueAndValidity();
      }

      const value = inputs.get(input.name)?.value;

      // Determine if the input is linked (StepOutputReference)
      // It must be an object, not an array, and have 'step' and 'output' properties
      const isLinked = value && typeof value === 'object' && !Array.isArray(value) && 'step' in value && 'output' in value;

      if (isLinked) {
        this.inputModes[input.name] = 'linked';
      } else {
        this.inputModes[input.name] = 'fixed';
        // If the value is an array, it's likely a list of ReferenceImages
        if (Array.isArray(value)) {
          this.referenceImages[input.name] = value;
        }
      }

      // Initialize reference images array for this input if it doesn't exist
      if (!this.referenceImages[input.name]) {
        this.referenceImages[input.name] = [];
      }
    });

    const settings = this.stepForm.get('settings') as FormGroup;
    this.config.settings.forEach(setting => {
      if (!settings.contains(setting.name)) {
        settings.addControl(setting.name, this.fb.control(setting.defaultValue));
      }
    });

    const outputs = this.stepForm.get('outputs') as FormGroup;
    this.config.outputs.forEach(output => {
      if (!outputs.contains(output.name)) {
        outputs.addControl(output.name, this.fb.control({ type: output.type }));
      }
    });

    this.updateCompatibleOutputs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['availableOutputs']) {
      console.log("ngOnChanges if (changes['availableOutputs'])")
      this.updateCompatibleOutputs();
    }
  }

  private updateCompatibleOutputs(): void {
    this.config.inputs.forEach(input => {
      this.compatibleOutputs[input.name] = this.availableOutputs.filter(
        output => (output.type === input.type) || (output.type === "text" && input.type === "textarea")
      );
    });
  }

  toggleInputMode(inputName: string, mode: 'fixed' | 'linked') {
    this.inputModes[inputName] = mode;
    this.stepForm
      .get('inputs')
      ?.get(inputName)
      ?.setValue(null);
  }

  compareFn(o1: any, o2: any): boolean {
    return o1 && o2 ? o1.step === o2.step && o1.output === o2.output : o1 === o2;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return '!bg-gray-500/20 !text-gray-300';
      case 'running':
        return '!bg-blue-500/20 !text-blue-300';
      case 'completed':
        return '!bg-green-500/20 !text-green-300';
      case 'failed':
        return '!bg-red-500/20 !text-red-300';
      case 'skipped':
        return '!bg-amber-500/20 !text-amber-300';
      default:
        return '!bg-gray-500/20 !text-gray-300';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'running':
        return 'hourglass_top';
      case 'completed':
        return 'check_circle';
      case 'failed':
        return 'error';
      default:
        return '';
    }
  }

  openImageSelectorForReference(inputName: string): void {
    if ((this.referenceImages[inputName]?.length || 0) >= 3) return;
    const dialogRef = this.dialog.open(ImageSelectorComponent, {
      width: '90vw',
      height: '80vh',
      maxWidth: '90vw',
      data: {
        mimeType: 'image/*', // Only allow images for references
      },
      panelClass: 'image-selector-dialog',
    });

    dialogRef
      .afterClosed()
      .subscribe((result: MediaItemSelection | SourceAssetResponseDto) => {
        if (result && (this.referenceImages[inputName]?.length || 0) < 3) {
          if (!this.referenceImages[inputName]) this.referenceImages[inputName] = [];

          let newImage: ReferenceImage | null = null;

          if ('gcsUri' in result) {
            newImage = {
              sourceAssetId: result.id,
              previewUrl: result.presignedUrl || '',
            };
          } else {
            const previewUrl =
              result.mediaItem.presignedUrls?.[result.selectedIndex];
            if (previewUrl) {
              newImage = {
                previewUrl: previewUrl,
                sourceMediaItem: {
                  mediaItemId: result.mediaItem.id,
                  mediaIndex: result.selectedIndex,
                  role: 'image_reference_asset', // Role is now set dynamically in searchTerm
                },
              };
            }
          }

          if (newImage) {
            this.referenceImages[inputName].push(newImage);
            this.updateInputControlWithError(inputName);
          }
        }
      });
  }

  // Called when DROPPING a file on the new drop zone
  onReferenceImageDrop(event: DragEvent, inputName: string) {
    event.preventDefault();
    if ((this.referenceImages[inputName]?.length || 0) >= 3) return;
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      // For a direct drop, go straight to the cropper
      const dialogRef = this.dialog.open(ImageCropperDialogComponent, {
        data: {
          imageFile: file,
          assetType: AssetTypeEnum.GENERIC_IMAGE,
        },
        width: '600px',
      });

      dialogRef.afterClosed().subscribe((result: SourceAssetResponseDto) => {
        if (result && result.id) {
          if (!this.referenceImages[inputName]) this.referenceImages[inputName] = [];
          this.referenceImages[inputName].push({
            sourceAssetId: result.id,
            previewUrl: result.presignedUrl || '',
          });
          this.updateInputControlWithError(inputName);
        }
      });
    }
  }


  clearReferenceImage(inputName: string, index: number) {
    if (this.referenceImages[inputName]) {
      this.referenceImages[inputName].splice(index, 1);
      this.updateInputControlWithError(inputName);
    }
  }

  private updateInputControlWithError(inputName: string) {
    const images = this.referenceImages[inputName] || [];
    const control = this.stepForm.get('inputs')?.get(inputName);
    if (control) {
      // Create a shallow copy to ensure Angular detects the change
      control.setValue(images.length > 0 ? [...images] : null);
      control.markAsDirty();
      control.updateValueAndValidity();
    }
  }
}
