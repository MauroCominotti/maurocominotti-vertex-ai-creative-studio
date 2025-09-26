import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {finalize, Observable} from 'rxjs';
import {
  ConcatenationInput,
  SearchService,
} from '../services/search/search.service';
import {Router} from '@angular/router';
import {SourceMediaItemLink, VeoRequest} from '../common/models/search.model';
import {MatChipInputEvent} from '@angular/material/chips';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatDialog} from '@angular/material/dialog';
import {
  ImageSelectorComponent,
  MediaItemSelection,
} from '../common/components/image-selector/image-selector.component';
import {GenerationParameters} from '../fun-templates/media-template.model';
import {handleErrorSnackbar} from '../utils/handleErrorSnackbar';
import {JobStatus, MediaItem} from '../common/models/media-item.model';
import {SourceAssetResponseDto} from '../common/services/source-asset.service';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {ToastMessageComponent} from '../common/components/toast-message/toast-message.component';
import {WorkspaceStateService} from '../services/workspace/workspace-state.service';
import {AssetTypeEnum} from '../admin/source-assets-management/source-asset.model';

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrl: './video.component.scss',
})
export class VideoComponent implements AfterViewInit {
  // This observable will always reflect the current job's state
  activeVideoJob$: Observable<MediaItem | null>;
  public readonly JobStatus = JobStatus; // Expose enum to the template

  @HostListener('window:keydown.control.enter', ['$event'])
  handleCtrlEnter(event: KeyboardEvent) {
    if (!this.isLoading) {
      event.preventDefault();
      this.searchTerm();
    }
  }

  templateParams: GenerationParameters | undefined;

  // --- Component State ---
  videoDocuments: MediaItem | null = null;
  isLoading = false;
  isAudioGenerationDisabled = false;
  startImageAssetId: string | null = null;
  endImageAssetId: string | null = null;
  sourceMediaItems: (SourceMediaItemLink | null)[] = [null, null];
  image1Preview: string | null = null;
  image2Preview: string | null = null;
  showDefaultDocuments = false;
  showErrorOverlay = true;
  isConcatenateMode = false;
  isExtensionMode = false;

  // Internal state to track input types
  private _input1IsVideo = false;
  private _input2IsVideo = false;

  // --- Search Request Object ---
  // This object holds the current state of all user selections.
  searchRequest: VeoRequest = {
    prompt: '',
    generationModel: 'veo-3.0-generate-preview',
    aspectRatio: '16:9',
    style: 'Modern',
    numberOfMedia: 4,
    lighting: 'Cinematic',
    colorAndTone: 'Vibrant',
    composition: 'Closeup',
    negativePrompt: '',
    generateAudio: true,
    durationSeconds: 8,
  };

  // --- Negative Prompt Chips ---
  negativePhrases: string[] = [];

  // --- Dropdown Options ---
  generationModels = [
    {
      value: 'veo-3.0-generate-preview',
      viewValue: 'Veo 3 Quality \n (Beta Audio)',
    },
    {
      value: 'veo-3.0-fast-generate-preview',
      viewValue: 'Veo 3 Fast \n (Beta Audio)',
    },
    {value: 'veo-2.0-generate-001', viewValue: 'Veo 2 Quality \n (No Audio)'},
    {value: 'veo-2.0-fast-generate-001', viewValue: 'Veo 2 Fast \n (No Audio)'},
  ];
  selectedGenerationModel = this.generationModels[0].viewValue;
  aspectRatioOptions: {value: string; viewValue: string; disabled: boolean}[] =
    [
      {value: '16:9', viewValue: '16:9 \n Landscape', disabled: false},
      {value: '9:16', viewValue: '9:16 \n Story', disabled: false},
    ];
  selectedAspectRatio = this.aspectRatioOptions[0].viewValue;
  videoStyles = [
    'Photorealistic',
    'Cinematic',
    'Modern',
    'Realistic',
    'Vintage',
    'Monochrome',
    'Fantasy',
    'Sketch',
  ];
  lightings = [
    'Cinematic',
    'Studio',
    'Natural',
    'Dramatic',
    'Ambient',
    'Backlighting',
    'Dramatic Light',
    'Golden Hour',
    'Exposure',
    'Low Lighting',
    'Multiexposure',
    'Studio Light',
  ];
  colorsAndTones = [
    'Vibrant',
    'Muted',
    'Warm',
    'Cool',
    'Monochrome',
    'Black & White',
    'Golden',
    'Pastel',
    'Toned',
  ];
  numberOfVideosOptions = [1, 2, 3, 4];
  durationOptions = [8];
  compositions = [
    'Closeup',
    'Knolling',
    'Landscape photography',
    'Photographed through window',
    'Shallow depth of field',
    'Shot from above',
    'Shot from below',
    'Surface detail',
    'Wide angle',
  ];

  constructor(
    private sanitizer: DomSanitizer,
    public matIconRegistry: MatIconRegistry,
    private service: SearchService,
    public router: Router,
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,
    private http: HttpClient,
    private workspaceStateService: WorkspaceStateService,
  ) {
    this.activeVideoJob$ = this.service.activeVideoJob$;

    this.matIconRegistry
      .addSvgIcon(
        'content-type-icon',
        this.setPath(`${this.path}/content-type-icon.svg`),
      )
      .addSvgIcon(
        'lighting-icon',
        this.setPath(`${this.path}/lighting-icon.svg`),
      )
      .addSvgIcon(
        'number-of-images-icon',
        this.setPath(`${this.path}/number-of-images-icon.svg`),
      )
      .addSvgIcon(
        'gemini-spark-icon',
        this.setPath(`${this.path}/gemini-spark-icon.svg`),
      );

    this.templateParams =
      this.router.getCurrentNavigation()?.extras.state?.['templateParams'] ||
      history.state?.templateParams;
    this.applyTemplateParameters();

    const remixState = history.state?.remixState;
    if (remixState) {
      this.applyRemixState(remixState);
    }
  }

  ngAfterViewInit(): void {
    const remixState = history.state?.remixState;
    // Use a timeout to ensure the view is stable before opening a dialog.
    setTimeout(() => {
      if (remixState?.startConcatenation) {
        this.openImageSelector(2); // Open selector for the second video
      }
    }, 1500);
  }

  private path = '../../assets/images';

  private setPath(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  selectModel(model: {value: string; viewValue: string}): void {
    this.searchRequest.generationModel = model.value;
    this.selectedGenerationModel = model.viewValue;

    const isVeo2 = model.value.includes('veo-2.0');

    if (isVeo2) {
      // Veo 2 models do not support audio.
      this.isAudioGenerationDisabled = true;
      this.searchRequest.generateAudio = false;

      // Re-enable all aspect ratios for Veo 2.
      this.aspectRatioOptions.forEach(opt => (opt.disabled = false));
    } else {
      this.clearOtherImage(1);

      // Veo 3 models support audio.
      this.isAudioGenerationDisabled = false;

      // Veo 3 only supports 16:9 and 9:16 aspect ratios.
      const supportedRatios = ['16:9', '9:16'];
      if (!supportedRatios.includes(this.searchRequest.aspectRatio)) {
        this.searchRequest.aspectRatio = '16:9';
        const landscapeOption = this.aspectRatioOptions.find(
          opt => opt.value === '16:9',
        )!;
        this.selectedAspectRatio = landscapeOption.viewValue;
      }

      this.aspectRatioOptions.forEach(opt => {
        opt.disabled = !supportedRatios.includes(opt.value);
      });
    }
  }

  selectAspectRatio(ratio: string): void {
    this.searchRequest.aspectRatio = ratio;
    const selectedOption = this.aspectRatioOptions.find(
      opt => opt.value === ratio,
    );
    if (selectedOption) {
      this.selectedAspectRatio = selectedOption.viewValue;
    }
  }

  selectVideoStyle(style: string): void {
    this.searchRequest.style = style;
  }

  selectLighting(lighting: string): void {
    this.searchRequest.lighting = lighting;
  }

  selectColor(color: string): void {
    this.searchRequest.colorAndTone = color;
  }

  selectNumberOfVideos(num: number): void {
    this.searchRequest.numberOfMedia = num;
  }

  selectDuration(seconds: number): void {
    this.searchRequest.durationSeconds = seconds;
  }

  selectComposition(composition: string): void {
    this.searchRequest.composition = composition;
  }

  toggleAudio(): void {
    if (!this.isAudioGenerationDisabled) {
      this.searchRequest.generateAudio = !this.searchRequest.generateAudio;
    }
  }

  addNegativePhrase(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) this.negativePhrases.push(value);

    // Clear the input value
    event.chipInput!.clear();
  }

  removeNegativePhrase(phrase: string): void {
    const index = this.negativePhrases.indexOf(phrase);
    if (index >= 0) this.negativePhrases.splice(index, 1);
  }

  searchTerm() {
    const activeWorkspaceId = this.workspaceStateService.getActiveWorkspaceId();
    this.searchRequest.workspaceId = activeWorkspaceId || '';
    const workspaceId = activeWorkspaceId || '';

    if (this.isConcatenateMode) {
      const inputs: ConcatenationInput[] = [];

      // Input 1
      if (this.sourceMediaItems[0]) {
        inputs.push({
          id: this.sourceMediaItems[0].mediaItemId,
          type: 'media_item',
        });
      } else if (this.startImageAssetId) {
        inputs.push({id: this.startImageAssetId, type: 'source_asset'});
      }

      // Input 2
      if (this.sourceMediaItems[1]) {
        inputs.push({
          id: this.sourceMediaItems[1].mediaItemId,
          type: 'media_item',
        });
      } else if (this.endImageAssetId) {
        inputs.push({id: this.endImageAssetId, type: 'source_asset'});
      }

      if (inputs.length < 2) {
        this._snackBar.open(
          'Please select at least two videos to concatenate.',
          'OK',
          {duration: 5000},
        );
        return;
      }

      const name = 'Concatenated Video';

      this.isLoading = true;
      this.service
        .concatenateVideos({
          workspaceId,
          name,
          inputs,
          aspectRatio: this.searchRequest.aspectRatio,
        })
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          error: err =>
            handleErrorSnackbar(this._snackBar, err, 'Concatenate videos'),
        });
      return;
    }
    if (!this.searchRequest.prompt && !this.isExtensionMode) return;
    this.showErrorOverlay = true;

    const hasSourceAssets = this.startImageAssetId || this.endImageAssetId;
    const hasSourceMediaItems = this.sourceMediaItems.some(i => !!i);
    const isVeo3 = [
      'veo-3.0-fast-generate-preview',
      'veo-3.0-generate-preview',
    ].includes(this.searchRequest.generationModel);

    if (
      (hasSourceAssets || hasSourceMediaItems) &&
      isVeo3 &&
      !this.isExtensionMode &&
      !this.isConcatenateMode
    ) {
      const veo2Model = this.generationModels.find(
        m => m.value === 'veo-2.0-generate-001',
      );
      if (veo2Model) {
        this.selectModel(veo2Model);
        this._snackBar.openFromComponent(ToastMessageComponent, {
          panelClass: ['green-toast'],
          duration: 8000,
          data: {
            text: "Veo 3 Fast doesn't support images as input, so we've switched to Veo 2 for you.",
            matIcon: 'info_outline',
          },
        });
        return;
      }
    }

    this.isLoading = true;
    this.videoDocuments = null;

    const validSourceMediaItems = this.sourceMediaItems.filter(
      (i): i is SourceMediaItemLink => !!i,
    );

    const payload: VeoRequest = {
      ...this.searchRequest,
      startImageAssetId: !this._input1IsVideo
        ? (this.startImageAssetId ?? undefined)
        : undefined,
      sourceVideoAssetId: this._input1IsVideo
        ? (this.startImageAssetId ?? undefined)
        : undefined,
      endImageAssetId: this.endImageAssetId ?? undefined,
      sourceMediaItems: validSourceMediaItems.length
        ? validSourceMediaItems
        : undefined,
    };

    // TODO: Add notification when video is completed after the pooling
    this.service
      .startVeoGeneration(payload)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (initialResponse: MediaItem) => {
          // This logic is now handled by the 'tap' operator in the service,
          // but it's fine to also have it here. The key is the 'error' block.
          console.log('Job started successfully:', initialResponse);
          // The component's main display will be driven by the service's observable
        },
        error: error => {
          // This block will now execute correctly if the POST request fails.
          console.error('Search error:', error);
          const errorMessage =
            error?.error?.detail?.[0]?.msg ||
            error?.message ||
            'Something went wrong';
          this._snackBar.openFromComponent(ToastMessageComponent, {
            panelClass: ['red-toast'],
            verticalPosition: 'top',
            horizontalPosition: 'right',
            duration: 6000,
            data: {text: errorMessage, icon: 'cross-in-circle-white'},
          });
        },
      });
  }

  rewritePrompt() {
    if (!this.searchRequest.prompt) return;

    this.isLoading = true;
    const promptToSend = this.searchRequest.prompt;
    this.searchRequest.prompt = '';
    this.service
      .rewritePrompt({
        targetType: 'video',
        userPrompt: promptToSend,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response: {prompt: string}) => {
          this.searchRequest.prompt = response.prompt;
        },
        error: error => {
          handleErrorSnackbar(this._snackBar, error, 'Rewrite prompt');
        },
      });
  }

  getRandomPrompt() {
    this.isLoading = true;
    this.searchRequest.prompt = '';
    this.service
      .getRandomPrompt({target_type: 'video'})
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response: {prompt: string}) => {
          this.searchRequest.prompt = response.prompt;
        },
        error: error => {
          handleErrorSnackbar(this._snackBar, error, 'Get random prompt');
        },
      });
  }

  resetAllFilters() {
    this.searchRequest = {
      prompt: '',
      generationModel: 'veo-3.0-generate-preview',
      aspectRatio: '16:9',
      style: 'Modern',
      numberOfMedia: 4,
      lighting: 'Cinematic',
      colorAndTone: 'Vibrant',
      composition: 'Closeup',
      negativePrompt: '',
      generateAudio: true,
      durationSeconds: 8,
    };
  }

  private applyTemplateParameters(): void {
    if (!this.templateParams) {
      return;
    }

    if (this.templateParams.prompt) {
      this.searchRequest.prompt = this.templateParams.prompt;
    }

    if (this.templateParams.numMedia) {
      console.log('Setting number of images:', this.templateParams.numMedia);
      this.searchRequest.numberOfMedia = this.templateParams.numMedia;
    }

    if (this.templateParams.model) {
      const templateModel = this.templateParams.model;
      const modelOption = this.generationModels.find(m =>
        m.value.toLowerCase().includes(templateModel.toLowerCase()),
      );
      if (modelOption) {
        this.searchRequest.generationModel = modelOption.value;
        this.selectedGenerationModel = modelOption.viewValue;
      }
    }

    if (this.templateParams.aspectRatio) {
      const templateAspectRatio = this.templateParams.aspectRatio;
      const aspectRatioOption = this.aspectRatioOptions.find(
        r => r.value === templateAspectRatio,
      );
      if (aspectRatioOption) {
        this.searchRequest.aspectRatio = aspectRatioOption.value;
        this.selectedAspectRatio = aspectRatioOption.viewValue;
      }
    }

    if (this.templateParams.durationSeconds)
      this.searchRequest.durationSeconds = this.templateParams.durationSeconds;

    if (this.templateParams.style) {
      this.searchRequest.style = this.templateParams.style;
    }

    if (this.templateParams.lighting) {
      this.searchRequest.lighting = this.templateParams.lighting;
    }

    if (this.templateParams.colorAndTone) {
      this.searchRequest.colorAndTone = this.templateParams.colorAndTone;
    }

    if (this.templateParams.composition) {
      this.searchRequest.composition = this.templateParams.composition;
    }

    if (this.templateParams.negativePrompt) {
      this.negativePhrases = this.templateParams.negativePrompt
        .split(',')
        .map((p: string) => p.trim())
        .filter(Boolean);
      this.searchRequest.negativePrompt = this.negativePhrases.join(', ');
    }
  }

  openImageSelector(imageNumber: 1 | 2) {
    const dialogRef = this.dialog.open(ImageSelectorComponent, {
      width: '90vw',
      height: '80vh',
      maxWidth: '90vw',
      data: {
        mimeType: this.getMimeTypeForSelector(),
      },
      panelClass: 'image-selector-dialog',
    });

    dialogRef
      .afterClosed()
      .subscribe((result: MediaItemSelection | SourceAssetResponseDto) => {
        if (result) {
          this.processInput(result, imageNumber);
          this.updateModeAndNotify();
        }
        // If a new image is selected, clear the other one.
        this.clearOtherImage(imageNumber);
      });
  }

  private processInput(
    result: MediaItemSelection | SourceAssetResponseDto,
    imageNumber: 1 | 2,
  ) {
    // 1. Determine if the new input is a video
    const isVideo =
      'gcsUri' in result
        ? result.mimeType?.startsWith('video/')
        : (result as MediaItemSelection).mediaItem.mimeType?.startsWith(
            'video/',
          );

    if (isVideo) {
      const isVeo3 = [
        'veo-3.0-fast-generate-preview',
        'veo-3.0-generate-preview',
      ].includes(this.searchRequest.generationModel);

      if (isVeo3) {
        const veo2Model = this.generationModels.find(
          m => m.value === 'veo-2.0-generate-001',
        );
        if (veo2Model) {
          this.selectModel(veo2Model);
          this._snackBar.openFromComponent(ToastMessageComponent, {
            panelClass: ['green-toast'],
            duration: 8000,
            data: {
              text: "Veo 3 doesn't support video as input, so we've switched to Veo 2 for you.",
              matIcon: 'info_outline',
            },
          });
        }
      }
    }
    this.clearSourceMediaItem(imageNumber);
    this.clearImageAssetId(imageNumber);

    if (imageNumber === 1) {
      this._input1IsVideo = !!isVideo;
      this.image1Preview = this.getPreviewUrl(result);
      this.setInputSource(1, result, 'video_extension_source');
    } else {
      // imageNumber === 2
      this._input2IsVideo = !!isVideo;
      this.image2Preview = this.getPreviewUrl(result);
      this.setInputSource(2, result, 'end_frame');
    }
  }

  private getPreviewUrl(
    result: MediaItemSelection | SourceAssetResponseDto,
  ): string | null {
    if ('gcsUri' in result) {
      return result.presignedThumbnailUrl || result.presignedUrl;
    }
    const selection = result as MediaItemSelection;
    const isVideo = selection.mediaItem.mimeType?.startsWith('video/');
    const urlArray = isVideo
      ? selection.mediaItem.presignedThumbnailUrls
      : selection.mediaItem.presignedUrls;
    return urlArray?.[selection.selectedIndex] || null;
  }

  private setInputSource(
    imageNumber: 1 | 2,
    result: MediaItemSelection | SourceAssetResponseDto,
    role: string,
  ) {
    const index = imageNumber - 1;

    if ('gcsUri' in result) {
      const targetAssetId =
        imageNumber === 1 ? 'startImageAssetId' : 'endImageAssetId';
      this[targetAssetId] = result.id;
    } else {
      const selection = result as MediaItemSelection;
      const isVideo = selection.mediaItem.mimeType?.startsWith('video/');
      // Determine role based on whether it's a video for extend/concat or just a frame
      const finalRole = isVideo
        ? role
        : imageNumber === 1
          ? 'start_frame'
          : 'end_frame';
      this.sourceMediaItems[index] = {
        mediaItemId: selection.mediaItem.id,
        mediaIndex: selection.selectedIndex,
        role: finalRole,
      };
    }
  }

  onDrop(event: DragEvent, imageNumber: 1 | 2) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) {
      const reader = new FileReader();
      this.isLoading = true;
      this.uploadAsset(file)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (asset: SourceAssetResponseDto) => {
            this.processInput(asset, imageNumber);
            this.updateModeAndNotify();
            this.clearOtherImage(imageNumber);
          },
          error: error => {
            handleErrorSnackbar(this._snackBar, error, 'Image upload');
          },
        });
    }
  }

  private uploadAsset(file: File): Observable<SourceAssetResponseDto> {
    const formData = new FormData();
    formData.append('file', file);
    const activeWorkspaceId = this.workspaceStateService.getActiveWorkspaceId();
    if (activeWorkspaceId) {
      formData.append('workspaceId', activeWorkspaceId);
    }
    return this.http.post<SourceAssetResponseDto>(
      `${environment.backendURL}/source_assets/upload`,
      formData,
    );
  }

  clearImage(imageNumber: 1 | 2, event: MouseEvent) {
    event.stopPropagation();

    if (imageNumber === 1) {
      this.startImageAssetId = null;
      this.image1Preview = null;
      this._input1IsVideo = false;
      this.clearSourceMediaItem(1);

      // If the second input was a video, move it to the first slot.
      if (this._input2IsVideo) {
        this.image1Preview = this.image2Preview;
        this.sourceMediaItems[0] = this.sourceMediaItems[1];
        this.startImageAssetId = this.endImageAssetId;
        this._input1IsVideo = true;
        this.clearImage(2, event); // Clear the second slot now that it's moved
        return; // updateModeAndNotify will be called by the recursive clearImage
      }
    } else {
      this.endImageAssetId = null;
      this.image2Preview = null;
      this._input2IsVideo = false;
      this.clearSourceMediaItem(2);
    }

    this.updateModeAndNotify();
  }

  private clearImageAssetId(imageNumber: 1 | 2) {
    const targetAssetId =
      imageNumber === 1 ? 'startImageAssetId' : 'endImageAssetId';
    this[targetAssetId] = null;
    this.clearSourceMediaItem(imageNumber); // Clear the corresponding media item slot
  }

  private clearSourceMediaItem(imageNumber: 1 | 2) {
    // Set the specific index to null to clear the slot for that image.
    if (this.sourceMediaItems.length >= imageNumber) {
      this.sourceMediaItems[imageNumber - 1] = null;
    }
  }

  private clearOtherImage(imageNumberJustSet: 1 | 2) {
    const isVeo3 = [
      'veo-3.0-fast-generate-preview',
      'veo-3.0-generate-preview',
    ].includes(this.searchRequest.generationModel);

    const image1Set = !!this.startImageAssetId || !!this.sourceMediaItems[0];
    const image2Set = !!this.endImageAssetId || !!this.sourceMediaItems[1];
    const totalImages = (image1Set ? 1 : 0) + (image2Set ? 1 : 0);

    if (
      isVeo3 &&
      !this.isConcatenateMode &&
      !this.isExtensionMode &&
      totalImages === 2
    ) {
      const imageToClear = imageNumberJustSet === 1 ? 2 : 1;
      if (imageToClear === 1) {
        this.startImageAssetId = null;
        this.image1Preview = null;
        this.sourceMediaItems[0] = null;
      } else {
        // Clearing image 2
        this.endImageAssetId = null;
        this.image2Preview = null;
        this.sourceMediaItems[1] = null;
      }

      this._snackBar.openFromComponent(ToastMessageComponent, {
        panelClass: ['green-toast'],
        duration: 8000,
        data: {
          text: "Veo 3 doesn't support 2 images as input, so we've cleared the other one for you.",
          matIcon: 'info_outline',
        },
      });
    }
  }

  closeErrorOverlay() {
    this.showErrorOverlay = false;
  }

  private resetInputs() {
    this.sourceMediaItems = [null, null];
    this.image1Preview = null;
    this.image2Preview = null;
    this.startImageAssetId = null;
    this.endImageAssetId = null;
    this.isExtensionMode = false;
    this.isConcatenateMode = false;
    this.service.clearActiveVideoJob();
  }

  private updateModeAndNotify() {
    const wasInExtensionMode = this.isExtensionMode;
    const wasInConcatenateMode = this.isConcatenateMode;

    if (this._input1IsVideo && this._input2IsVideo) {
      if (!this.isConcatenateMode) {
        this.isConcatenateMode = true;
        this.isExtensionMode = false;
        this.searchRequest.prompt = '';
        this._showModeNotification('concatenate');
      }
    } else if (this._input1IsVideo || this._input2IsVideo) {
      if (!this.isExtensionMode || this.isConcatenateMode) {
        this.isExtensionMode = true;
        this.isConcatenateMode = false;
        this.searchRequest.prompt = '';
        this._showModeNotification('extend');
      }
    } else {
      this.isExtensionMode = false;
      this.isConcatenateMode = false;
    }
  }

  private _showModeNotification(mode: 'extend' | 'concatenate') {
    let message = '';
    if (mode === 'extend') {
      message =
        'Extend Mode: You can now write a prompt to add a new segment to this video.';
    } else if (mode === 'concatenate') {
      message =
        'Concatenate Mode: The prompt is disabled. Click "Concatenate" to join the videos.';
    }

    this._snackBar.open(message, 'OK', {
      duration: 6000,
      panelClass: ['green-toast'],
    });
  }

  private getMimeTypeForSelector():
    | 'image/*'
    | 'image/png'
    | 'video/mp4'
    | null {
    const anyInputIsPresent = !!this.image1Preview || !!this.image2Preview;
    const anyInputIsVideo = this._input1IsVideo || this._input2IsVideo;

    if (!anyInputIsPresent) {
      return null;
    }

    // If any slot has something, restrict to that type's mimeType.
    return anyInputIsVideo ? 'video/mp4' : 'image/*';
  }

  private applyRemixState(remixState: {
    prompt?: string;
    startImageAssetId?: string;
    endImageAssetId?: string;
    startImagePreviewUrl?: string;
    endImagePreviewUrl?: string;
    sourceMediaItems?: SourceMediaItemLink[];
    startConcatenation?: boolean;
    aspectRatio?: string;
    generationModel?: string;
  }): void {
    this.resetInputs();
    if (remixState.prompt) this.searchRequest.prompt = remixState.prompt;
    if (remixState.startImageAssetId) {
      this.startImageAssetId = remixState.startImageAssetId;
      this.sourceMediaItems[0] = null;
    }
    if (remixState.endImageAssetId) {
      this.endImageAssetId = remixState.endImageAssetId;
      this.sourceMediaItems[1] = null;
    }
    if (remixState.startImagePreviewUrl)
      this.image1Preview = remixState.startImagePreviewUrl;
    if (remixState.endImagePreviewUrl)
      this.image2Preview = remixState.endImagePreviewUrl;

    if (remixState.sourceMediaItems?.length) {
      remixState.sourceMediaItems.forEach(item => {
        if (item.role === 'start_frame') {
          this.sourceMediaItems[0] = item;
          this.startImageAssetId = null;
          this.image1Preview = remixState.startImagePreviewUrl || null;
        } else if (item.role === 'end_frame') {
          this.sourceMediaItems[1] = item;
          this.endImageAssetId = null;
          this.image2Preview = remixState.endImagePreviewUrl || null;
        } else if (item.role === 'video_extension_source') {
          // This is the case for extending a video
          this.sourceMediaItems[0] = item;
          this._input1IsVideo = true;
          this.startImageAssetId = null;
          this.image1Preview = remixState.startImagePreviewUrl || null;
          this.isExtensionMode = true;
          this.searchRequest.prompt = ''; // Clear prompt for extension
        } else if (item.role === 'concatenation_source') {
          this.sourceMediaItems[0] = {...item, role: 'video_source'};
          this.image1Preview = remixState.startImagePreviewUrl || null;
          this._input1IsVideo = true;
          this.isConcatenateMode = true;
          this.searchRequest.prompt = '';
        }
      });
    }

    if (remixState.startConcatenation) {
      this.isConcatenateMode = true;
    }

    if (remixState.aspectRatio) {
      const aspectRatioOption = this.aspectRatioOptions.find(
        r => r.value === remixState.aspectRatio,
      );
      if (aspectRatioOption) {
        this.searchRequest.aspectRatio = aspectRatioOption.value;
        this.selectedAspectRatio = aspectRatioOption.viewValue;
      }
    }

    if (remixState.generationModel) {
      const modelOption = this.generationModels.find(
        m => m.value === remixState.generationModel,
      );
      if (modelOption) this.selectModel(modelOption);
    }
  }

  handleExtendWithAi(event: {mediaItem: MediaItem; selectedIndex: number}) {
    const remixState = {
      sourceMediaItems: [
        {
          mediaItemId: event.mediaItem.id,
          mediaIndex: event.selectedIndex,
          role: 'video_extension_source',
        },
      ],
      startImagePreviewUrl:
        event.mediaItem.presignedThumbnailUrls?.[event.selectedIndex],
    };
    this.applyRemixState(remixState);
  }

  handleConcatenate(event: {mediaItem: MediaItem; selectedIndex: number}) {
    const remixState = {
      sourceMediaItems: [
        {
          mediaItemId: event.mediaItem.id,
          mediaIndex: event.selectedIndex,
          role: 'concatenation_source',
        },
      ],
      startImagePreviewUrl:
        event.mediaItem.presignedThumbnailUrls?.[event.selectedIndex],
      startConcatenation: true,
    };
    this.applyRemixState(remixState);
    // Use a timeout to ensure the view is stable before opening a dialog.
    setTimeout(() => {
      this.openImageSelector(2);
    }, 1500);
  }
}
