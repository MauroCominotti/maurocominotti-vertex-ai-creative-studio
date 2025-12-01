import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  @Input() mediaUrlMap: Map<string, string> = new Map();

  loadedMedia = new Set<string>();
  NodeTypes = NodeTypes;

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  getMediaUrl(value: any): string {
    if (typeof value !== 'string') return '';
    return this.mediaUrlMap.get(value) || value;
  }

  onMediaLoaded(id: any): void {
    if (typeof id === 'string') {
      this.loadedMedia.add(id);
    }
  }

  navigateToGallery(id: any): void {
    if (typeof id !== 'string') return;

    if (this.mediaUrlMap.has(id) || id.length > 0) {
      const urlTree = this.router.createUrlTree(['/gallery', id]);
      const url = this.router.serializeUrl(urlTree);
      window.open(url, '_blank');
    }
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  isImageOutput(): boolean {
    return this.stepType === NodeTypes.GENERATE_IMAGE ||
      this.stepType === NodeTypes.EDIT_IMAGE ||
      this.stepType === NodeTypes.CROP_IMAGE ||
      this.stepType === NodeTypes.VIRTUAL_TRY_ON;
  }

  isTextOutput(): boolean {
    return this.stepType === NodeTypes.GENERATE_TEXT;
  }

  isVideoOutput(): boolean {
    return this.stepType === NodeTypes.GENERATE_VIDEO;
  }

  get inputCount(): number {
    return this.inputs ? Object.keys(this.inputs).length : 0;
  }

  get outputCount(): number {
    return this.outputs ? Object.keys(this.outputs).length : 0;
  }
}
