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

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import {Router} from '@angular/router';
import {MatChipInputEvent} from '@angular/material/chips';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {MatIconRegistry} from '@angular/material/icon';
import {finalize} from 'rxjs/operators';
import {MatDialog} from '@angular/material/dialog';
import {SearchService} from '../services/search/search.service';
import {ImagenRequest} from '../common/models/search.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {GenerationParameters} from '../fun-templates/media-template.model';
import {handleErrorSnackbar} from '../utils/handleErrorSnackbar';
import {MediaItem} from '../common/models/media-item.model';
import {ImageSelectorComponent} from '../common/components/image-selector/image-selector.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  // --- Component State ---
  imagenDocuments: MediaItem | null = null;
  isLoading = false;
  templateParams: GenerationParameters | undefined;
  showDefaultDocuments = false;
  image1: string | null = null;
  image2: string | null = null;
  image1Preview: string | null = null;
  image2Preview: string | null = null;

  // --- Search Request Object ---
  // This object holds the current state of all user selections.
  searchRequest: ImagenRequest = {
    prompt:
      'This cyberpunk cityscape is electrifying! The neon signs piercing through the rainy dusk create a stunning atmosphere, and the level of detail is impressive.  The reflections on the wet streets add a touch of realism, and the overall composition draws the eye deep into the scene. The play of light and shadow is particularly striking. It might benefit from a bit more variation in the neon colors to further enhance the vibrant, futuristic feel.',
    generationModel: 'imagen-4.0-ultra-generate-preview-06-06',
    aspectRatio: '1:1',
    style: 'Modern',
    numberOfMedia: 4,
    lighting: 'Cinematic',
    colorAndTone: 'Vibrant',
    composition: 'Closeup',
    addWatermark: false,
    negativePrompt: '',
  };

  // --- Negative Prompt Chips ---
  negativePhrases: string[] = [];

  // --- Dropdown Options ---
  generationModels = [
    {
      value: 'gemini-2.5-flash-image-preview',
      viewValue: 'Nano Banana',
      isImage: true,
      imageSrc: 'assets/images/banana-peel.png',
    },
    {
      value: 'imagen-4.0-ultra-generate-preview-06-06',
      viewValue: 'Imagen 4 Ultra', // Keeping gemini-spark-icon for Ultra
      icon: 'gemini-spark-icon',
      isSvg: true,
    },
    {
      value: 'imagen-3.0-generate-002',
      viewValue: 'Imagen 3',
      icon: 'auto_awesome',
    },
    {
      value: 'imagen-3.0-fast-generate-001',
      viewValue: 'Imagen 3 Fast',
      icon: 'auto_awesome',
    },
  ];
  selectedGenerationModelObject = this.generationModels[0];
  selectedGenerationModel = this.generationModels[0].viewValue;
  aspectRatioOptions: {
    value: string;
    viewValue: string;
    disabled: boolean;
    icon: string;
  }[] = [
    {
      value: '1:1',
      viewValue: '1080x1080 \n Post',
      disabled: false,
      icon: 'crop_square',
    },
    {
      value: '16:9',
      viewValue: '1200x628 \n Landscape',
      disabled: false,
      icon: 'crop_16_9',
    },
    {
      value: '9:16',
      viewValue: '1080x1920 \n Story',
      disabled: false,
      icon: 'crop_portrait',
    },
    {
      value: '3:4',
      viewValue: '1080x1350 \n Portrait',
      disabled: false,
      icon: 'crop_portrait',
    },
    {
      value: '4:3',
      viewValue: '1000x1500 \n Pin',
      disabled: false,
      icon: 'crop_landscape',
    },
    {
      value: '',
      viewValue: '300x250 \n Medium Banner',
      disabled: true,
      icon: 'web_asset',
    },
    {
      value: '',
      viewValue: '728x90 \n Leaderboard',
      disabled: true,
      icon: 'web_asset',
    },
    {
      value: '',
      viewValue: '160x600 \n Wide Skyscraper',
      disabled: true,
      icon: 'web_asset',
    },
    {
      value: '1:2',
      viewValue: '300x600 \n Half Page',
      disabled: true,
      icon: 'web_asset',
    },
    {
      value: '',
      viewValue: '970x90 \n L. Leaderboard',
      disabled: true,
      icon: 'web_asset',
    },
  ];
  selectedAspectRatio = this.aspectRatioOptions[0].viewValue;
  imageStyles = [
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
  numberOfImagesOptions = [1, 2, 3, 4];
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
  watermarkOptions = [
    {value: true, viewValue: 'Yes'},
    {value: false, viewValue: 'No'},
  ];
  selectedWatermark = this.watermarkOptions.find(
    o => o.value === this.searchRequest.addWatermark,
  )!.viewValue;

  // --- Private properties for animation and gallery ---
  private curX = 0;
  private curY = 0;
  private tgX = 0;
  private tgY = 0;
  private animationFrameId: number | undefined;

  @ViewChild('interactiveBubble') interBubble!: ElementRef<HTMLDivElement>;

  constructor(
    public router: Router,
    private sanitizer: DomSanitizer,
    public matIconRegistry: MatIconRegistry,
    private service: SearchService,
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,
  ) {
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
      )
      .addSvgIcon(
        'white-gemini-spark-icon',
        this.setPath(`${this.path}/white-gemini-spark-icon.svg`),
      )
      .addSvgIcon(
        'mobile-white-gemini-spark-icon',
        this.setPath(`${this.path}/mobile-white-gemini-spark-icon.svg`),
      );

    this.templateParams =
      this.router.getCurrentNavigation()?.extras.state?.['templateParams'];
    this.applyTemplateParameters();
  }

  private path = '../../assets/images';

  private setPath(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngAfterViewInit(): void {
    // This hook is called after the component's view has been initialized.
    // Now we can be sure that 'interBubble' is available.
    if (this.interBubble && this.interBubble.nativeElement) {
      this.move();
    } else {
      console.warn(
        'Interactive bubble element not found. Animation may not start.',
      );
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined')
      window.removeEventListener('mousemove', this.onMouseMove);

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  ngOnInit(): void {
    // Set up event listener here, but don't start animation yet
    // As this should be browser code we check first if window exists
    if (typeof window !== 'undefined')
      window.addEventListener('mousemove', this.onMouseMove);
  }

  private applyTemplateParameters(): void {
    console.log('Applying template parameters:', this.templateParams);

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

  openLink(url: string | undefined) {
    if (!url) return;
    window.open(url, '_blank');
  }

  private processSearchResults(searchResponse: MediaItem) {
    this.imagenDocuments = searchResponse;

    const hasImagenResults =
      (this.imagenDocuments?.presignedUrls?.length || 0) > 0;

    if (hasImagenResults) {
      this.showDefaultDocuments = false;
    } else {
      this.showDefaultDocuments = true;
    }
  }

  selectModel(model: any): void {
    this.searchRequest.generationModel = model.value;
    this.selectedGenerationModel = model.viewValue;
    this.selectedGenerationModelObject = model;
  }

  selectAspectRatio(ratio: string): void {
    this.searchRequest.aspectRatio = ratio;
  }

  selectImageStyle(style: string): void {
    this.searchRequest.style = style;
  }

  selectLighting(lighting: string): void {
    this.searchRequest.lighting = lighting;
  }

  selectColor(color: string): void {
    this.searchRequest.colorAndTone = color;
  }

  selectNumberOfImages(num: number): void {
    this.searchRequest.numberOfMedia = num;
  }

  selectComposition(composition: string): void {
    this.searchRequest.composition = composition;
  }

  selectWatermark(option: {value: boolean; viewValue: string}): void {
    this.searchRequest.addWatermark = option.value;
    this.selectedWatermark = option.viewValue;
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
    if (!this.searchRequest.prompt) return;

    const payload: ImagenRequest = {
      ...this.searchRequest,
      negativePrompt: this.negativePhrases.join(', '),
    };

    if (this.image1) {
      this.image1.startsWith('gs://')
        ? (payload.image1 = {gcs_uri: this.image1})
        : (payload.image1 = {b64: this.image1.split(',')[1]});
    }
    if (this.image2) {
      this.image2.startsWith('gs://')
        ? (payload.image2 = {gcs_uri: this.image2})
        : (payload.image2 = {b64: this.image2.split(',')[1]});
    }

    this.isLoading = true;
    this.imagenDocuments = null;

    this.service
      .searchImagen(payload)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (searchResponse: MediaItem) => {
          this.processSearchResults(searchResponse);
        },
        error: error => {
          handleErrorSnackbar(this._snackBar, error, 'Search');
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
        targetType: 'image',
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
      .getRandomPrompt({target_type: 'image'})
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
      generationModel: 'imagen-4.0-ultra-generate-preview-06-06',
      aspectRatio: '1:1',
      style: 'Modern',
      numberOfMedia: 4,
      lighting: 'Cinematic',
      colorAndTone: 'Vibrant',
      composition: 'Closeup',
      addWatermark: false,
      negativePrompt: '',
    };
  }

  private onMouseMove = (event: MouseEvent) => {
    this.tgX = event.clientX;
    this.tgY = event.clientY;
  };

  private move = () => {
    this.curX += (this.tgX - this.curX) / 20;
    this.curY += (this.tgY - this.curY) / 20;

    if (this.interBubble && this.interBubble.nativeElement) {
      this.interBubble.nativeElement.style.transform = `translate(${Math.round(this.curX)}px, ${Math.round(this.curY)}px)`;
    }

    this.animationFrameId = requestAnimationFrame(this.move);
  };

  openImageSelector(imageNumber: 1 | 2) {
    const dialogRef = this.dialog.open(ImageSelectorComponent, {
      width: '90vw',
      height: '80vh',
      panelClass: 'image-selector-dialog',
    });

    dialogRef.afterClosed().subscribe((result: MediaItem | string) => {
      if (result) {
        const targetImage = imageNumber === 1 ? 'image1' : 'image2';
        const targetPreview =
          imageNumber === 1 ? 'image1Preview' : 'image2Preview';

        if (typeof result === 'string') {
          // Uploaded image (base64)
          this[targetImage] = result;
          this[targetPreview] = result;
        } else {
          // Gallery image (MediaItem)
          this[targetImage] = result.gcsUris[0];
          this[targetPreview] = result.presignedUrls![0];
        }
      }
    });
  }

  onDrop(event: DragEvent, imageNumber: 1 | 2) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const result = e.target.result;
        const targetImage = imageNumber === 1 ? 'image1' : 'image2';
        const targetPreview =
          imageNumber === 1 ? 'image1Preview' : 'image2Preview';
        this[targetImage] = result;
        this[targetPreview] = result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearImage(imageNumber: 1 | 2, event: MouseEvent) {
    event.stopPropagation();
    if (imageNumber === 1) {
      this.image1 = null;
      this.image1Preview = null;
    } else {
      this.image2 = null;
      this.image2Preview = null;
    }
  }
}
