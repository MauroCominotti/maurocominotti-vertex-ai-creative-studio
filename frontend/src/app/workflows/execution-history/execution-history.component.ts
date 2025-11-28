import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { WorkflowService } from '../workflow.service';
import { ExecutionDetailsModalComponent } from './execution-details-modal/execution-details-modal.component';

@Component({
    selector: 'app-execution-history',
    templateUrl: './execution-history.component.html',
    styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class ExecutionHistoryComponent implements OnInit {
    workflowId: string | null = null;
    executions: any[] = [];
    isLoading = false;
    nextPageToken: string | null = null;
    displayedColumns: string[] = ['status', 'id', 'startTime', 'duration', 'actions'];
    selectedStatus: string = 'ALL';

    constructor(
        private route: ActivatedRoute,
        private workflowService: WorkflowService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.workflowId = params.get('id');
            if (this.workflowId) {
                this.loadExecutions(true);
            }
        });
    }

    loadExecutions(reset: boolean = false): void {
        if (!this.workflowId || this.isLoading) return;

        this.isLoading = true;
        const pageToken = reset ? undefined : (this.nextPageToken || undefined);

        this.workflowService.getExecutions(this.workflowId, 20, pageToken, this.selectedStatus).subscribe({
            next: (response) => {
                if (reset) {
                    this.executions = response.executions;
                } else {
                    this.executions = [...this.executions, ...response.executions];
                }
                this.nextPageToken = response.next_page_token || null;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load executions', err);
                this.isLoading = false;
            }
        });
    }

    loadMore(): void {
        if (this.nextPageToken) {
            this.loadExecutions(false);
        }
    }

    onStatusChange(): void {
        this.loadExecutions(true);
    }

    openDetails(executionId: string): void {
        if (!this.workflowId) return;

        this.dialog.open(ExecutionDetailsModalComponent, {
            width: '800px',
            maxHeight: '90vh',
            data: {
                workflowId: this.workflowId,
                executionId: executionId
            },
            panelClass: 'bg-neutral-800'
        });
    }

    getStatusClass(state: string): string {
        switch (state) {
            case 'SUCCEEDED': return '!bg-green-500/20 !text-green-300';
            case 'FAILED': return '!bg-red-500/20 !text-red-300';
            case 'ACTIVE': return '!bg-blue-500/20 !text-blue-300';
            default: return '!bg-gray-500/20 !text-gray-300';
        }
    }

    getStatusIcon(state: string): string {
        switch (state) {
            case 'SUCCEEDED': return 'check_circle';
            case 'FAILED': return 'error';
            case 'ACTIVE': return 'hourglass_top';
            default: return 'help_outline';
        }
    }
}
