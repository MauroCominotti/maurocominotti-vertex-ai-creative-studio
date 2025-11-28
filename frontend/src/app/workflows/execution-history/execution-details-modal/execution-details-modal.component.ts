import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WorkflowService } from '../../workflow.service';

@Component({
    selector: 'app-execution-details-modal',
    templateUrl: './execution-details-modal.component.html',
})
export class ExecutionDetailsModalComponent implements OnInit {
    isLoading = true;
    details: any = null;
    expandedSteps = new Set<string>();

    constructor(
        public dialogRef: MatDialogRef<ExecutionDetailsModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { workflowId: string, executionId: string },
        private workflowService: WorkflowService
    ) { }

    ngOnInit(): void {
        this.loadDetails();
    }

    loadDetails(): void {
        this.isLoading = true;
        this.workflowService.getExecutionDetails(this.data.workflowId, this.data.executionId).subscribe({
            next: (res) => {
                this.details = res;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load details', err);
                this.isLoading = false;
            }
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
}
