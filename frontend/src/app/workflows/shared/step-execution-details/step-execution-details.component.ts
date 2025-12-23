import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CROP_IMAGE_STEP_CONFIG } from '../../workflow-editor/step-components/step-configs/crop-image-step.config';
import { EDIT_IMAGE_STEP_CONFIG } from '../../workflow-editor/step-components/step-configs/edit-image-step.config';
import { GENERATE_AUDIO_STEP_CONFIG } from '../../workflow-editor/step-components/step-configs/generate-audio-step.config';
import { GENERATE_IMAGE_STEP_CONFIG } from '../../workflow-editor/step-components/step-configs/generate-image-step.config';
import { GENERATE_TEXT_STEP_CONFIG } from '../../workflow-editor/step-components/step-configs/generate-text-step.config';
import { GENERATE_VIDEO_STEP_CONFIG } from '../../workflow-editor/step-components/step-configs/generate-video-step.config';
import { VIRTUAL_TRY_ON_STEP_CONFIG } from '../../workflow-editor/step-components/step-configs/virtual-try-on-step.config';
import { NodeTypes } from '../../workflow.models';

@Component({
  selector: 'app-step-execution-details',
  templateUrl: './step-execution-details.component.html',
  styleUrls: ['./step-execution-details.component.scss']
})
export class StepExecutionDetailsComponent implements OnInit {
  @Input() stepId: string = '';
  @Input() stepType: string = '';
  @Input() inputs: any = {};
  @Input() outputs: any = {};
  @Input() mediaUrlMap: Map<number, string> = new Map();

  loadedMedia = new Set<number>();
  NodeTypes = NodeTypes;

  stepConfigs = {
    [NodeTypes.GENERATE_TEXT]: GENERATE_TEXT_STEP_CONFIG,
    [NodeTypes.GENERATE_IMAGE]: GENERATE_IMAGE_STEP_CONFIG,
    [NodeTypes.EDIT_IMAGE]: EDIT_IMAGE_STEP_CONFIG,
    [NodeTypes.CROP_IMAGE]: CROP_IMAGE_STEP_CONFIG,
    [NodeTypes.GENERATE_VIDEO]: GENERATE_VIDEO_STEP_CONFIG,
    [NodeTypes.VIRTUAL_TRY_ON]: VIRTUAL_TRY_ON_STEP_CONFIG,
    [NodeTypes.GENERATE_AUDIO]: GENERATE_AUDIO_STEP_CONFIG,
  };

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  getMediaUrl(value: any): string {
    const id = this.getIdFromValue(value);
    if (id && this.mediaUrlMap.has(id)) {
      return this.mediaUrlMap.get(id)!;
    }

    if (value && typeof value === 'object' && value.previewUrl) {
      return value.previewUrl;
    }

    return '';
  }

  onMediaLoaded(value: any): void {
    const id = this.getIdFromValue(value);
    if (id) {
      this.loadedMedia.add(id);
    }
  }

  navigateToGallery(value: any): void {
    const id = this.getIdFromValue(value);
    if (!id) return;

    if (this.mediaUrlMap.has(id)) {
      const urlTree = this.router.createUrlTree(['/gallery', id]);
      const url = this.router.serializeUrl(urlTree);
      window.open(url, '_blank');
    }
  }

  private getIdFromValue(value: any): number | null {
    if (typeof value === 'number') {
      return value;
    } else if (value && typeof value === 'object') {
      const id = value.sourceAssetId ?? value.sourceMediaItem?.mediaItemId;
      return (typeof id === 'number') ? id : null;
    }
    return null;
  }

  isLoaded(value: any): boolean {
    const id = this.getIdFromValue(value);
    return id ? this.loadedMedia.has(id) : false;
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  getStepConfig() {
    return this.stepConfigs[this.stepType as keyof typeof this.stepConfigs];
  }

  isImageInput(inputName: any): boolean {
    const config = this.getStepConfig();
    if (!config) return false;
    const input = config.inputs.find(i => i.name === String(inputName));
    return input?.type === 'image';
  }

  isImageOutput(outputName?: any): boolean {
    const config = this.getStepConfig();
    if (!config) return false;

    if (outputName) {
      const output = config.outputs.find(o => o.name === String(outputName));
      return output?.type === 'image';
    }

    return config.outputs.some(o => o.type === 'image');
  }

  isTextOutput(outputName?: any): boolean {
    const config = this.getStepConfig();
    if (!config) return false;

    if (outputName) {
      const output = config.outputs.find(o => o.name === String(outputName));
      return output?.type === 'text';
    }
    return config.outputs.some(o => o.type === 'text');
  }

  isVideoOutput(outputName?: any): boolean {
    const config = this.getStepConfig();
    if (!config) return false;

    if (outputName) {
      const output = config.outputs.find(o => o.name === String(outputName));
      return output?.type === 'video';
    }
    return config.outputs.some(o => o.type === 'video');
  }

  isAudioOutput(outputName?: any): boolean {
    const config = this.getStepConfig();
    if (!config) return false;

    if (outputName) {
      const output = config.outputs.find(o => o.name === String(outputName));
      return output?.type === 'audio';
    }
    return config.outputs.some(o => o.type === 'audio');
  }

  get inputCount(): number {
    return this.inputs ? Object.keys(this.inputs).length : 0;
  }

  get outputCount(): number {
    return this.outputs ? Object.keys(this.outputs).length : 0;
  }
}
