import { Component, OnInit, OnDestroy } from '@angular/core';
import {WorkflowService} from '../workflow.service';
import { Subscription } from 'rxjs';
import {Workflow, WorkflowModel} from '../workflow.models';
import { Router } from '@angular/router';


@Component({
  selector: 'app-workflow-list',
  templateUrl: './workflow-list.component.html',
  styleUrls: ['./workflow-list.component.scss'],
})
export class WorkflowListComponent implements OnInit, OnDestroy {
  workflows: WorkflowModel[] = [];
  displayedColumns: string[] = ['name', 'status', 'updatedAt', 'actions'];
  private subscriptions: Subscription = new Subscription();
  public isLoading = false;
  public errorMessage: string | null = null;

  constructor(
    private workflowService: WorkflowService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    console.log('WorkflowListComponent: ngOnInit');
    this.subscriptions.add(this.workflowService.workflows$.subscribe(workflows => {
      console.log('WorkflowListComponent: workflows$ updated:', workflows);
      this.workflows = workflows;
    }));
    this.subscriptions.add(this.workflowService.isLoading$.subscribe(isLoading => {
      console.log('WorkflowListComponent: isLoading$ updated:', isLoading);
      this.isLoading = isLoading;
    }));
    this.subscriptions.add(this.workflowService.errorMessage$.subscribe(errorMessage => {
      console.log('WorkflowListComponent: errorMessage$ updated:', errorMessage);
      this.errorMessage = errorMessage;
    }));
  }

  createNewWorkflow(): void {
    this.router.navigate(['/workflows/new']);
  }

  ngOnDestroy(): void {
    console.log('WorkflowListComponent: ngOnDestroy - Unsubscribing all subscriptions');
    this.subscriptions.unsubscribe();
  }
}
