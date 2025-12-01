import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WorkflowService } from '../../workflow.service';

import { forkJoin } from 'rxjs';
import { NodeTypes, WorkflowModel } from '../../workflow.models';

import { GalleryService } from '../../../gallery/gallery.service';

import { Router } from '@angular/router';

@Component({
    selector: 'app-execution-details-modal',
    templateUrl: './execution-details-modal.component.html',
})
export class ExecutionDetailsModalComponent implements OnInit {
    isLoading = true;
    details: any = null;
    workflow: WorkflowModel | null = null;
    NodeTypes = NodeTypes;
    expandedSteps = new Set<string>();
    mediaUrlMap = new Map<string, string>();
    loadedMedia = new Set<string>();

    constructor(
        public dialogRef: MatDialogRef<ExecutionDetailsModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { workflowId: string, executionId: string },
        private workflowService: WorkflowService,
        private galleryService: GalleryService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadDetails();
    }

    loadDetails(): void {
        this.isLoading = true;
        // ForkJoin to get both details and workflow definition
        forkJoin({
            details: this.workflowService.getExecutionDetails(this.data.workflowId, this.data.executionId),
            workflow: this.workflowService.getWorkflowById(this.data.workflowId)
        }).subscribe({
            next: ({ details, workflow }) => {
                this.details = details;
                this.workflow = workflow as WorkflowModel;
                this.resolveMediaUrls();
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load details or workflow', err);
                this.isLoading = false;
            }
        });
    }

    resolveMediaUrls(): void {
        if (!this.details || !this.details.step_entries) return;

        const mediaIdsToFetch = new Set<string>();

        this.details.step_entries.forEach((step: any) => {
            if (this.isImageOutput(step.step_id) && step.step_outputs) {
                Object.values(step.step_outputs).forEach((val: any) => {
                    if (typeof val === 'string' && val.length > 0) {
                        mediaIdsToFetch.add(val);
                    }
                });
            }
            // Also check inputs for Edit Image steps
            if (this.isImageOutput(step.step_id) && step.step_inputs) {
                Object.entries(step.step_inputs).forEach(([key, val]: [string, any]) => {
                    if ((key === 'input_images' || key === 'image') && typeof val === 'string' && val.length > 0) {
                        mediaIdsToFetch.add(val);
                    } else if ((key === 'input_images' || key === 'image') && Array.isArray(val)) {
                        val.forEach((v: any) => {
                            if (typeof v === 'string' && v.length > 0) {
                                mediaIdsToFetch.add(v);
                            }
                        });
                    }
                });
            }
        });

        mediaIdsToFetch.forEach(id => {
            this.galleryService.getMedia(id).subscribe({
                next: (mediaItem) => {
                    if (mediaItem.presignedUrls && mediaItem.presignedUrls.length > 0) {
                        this.mediaUrlMap.set(id, mediaItem.presignedUrls[0]);
                    }
                },
                error: (err) => console.error(`Failed to resolve media ID ${id}`, err)
            });
        });
    }

    toggleStep(stepId: string): void {
        if (this.expandedSteps.has(stepId)) {
            this.expandedSteps.delete(stepId);
        } else {
            this.expandedSteps.add(stepId);
        }
    }

    hasData(obj: any): boolean {
        return obj && Object.keys(obj).length > 0;
    }

    getStatusClass(state: string): string {
        switch (state) {
            case 'SUCCEEDED': return '!bg-green-500/20 !text-green-300';
            case 'STATE_SUCCEEDED': return '!bg-green-500/20 !text-green-300';
            case 'FAILED': return '!bg-red-500/20 !text-red-300';
            case 'STATE_FAILED': return '!bg-red-500/20 !text-red-300';
            case 'ACTIVE': return '!bg-blue-500/20 !text-blue-300';
            case 'STATE_IN_PROGRESS': return '!bg-blue-500/20 !text-blue-300';
            default: return '!bg-gray-500/20 !text-gray-300';
        }
    }

    getStepType(stepId: string): NodeTypes | undefined {
        return this.workflow?.steps.find(s => s.stepId === stepId)?.type;
    }

    isImageOutput(stepId: string): boolean {
        const type = this.getStepType(stepId);
        return type === NodeTypes.GENERATE_IMAGE ||
            type === NodeTypes.EDIT_IMAGE ||
            type === NodeTypes.CROP_IMAGE ||
            type === NodeTypes.VIRTUAL_TRY_ON;
    }
}
