import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { WorkflowModel } from './workflow.models';
import { catchError, filter, switchMap, tap, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { WorkspaceStateService } from '../services/workspace/workspace-state.service';

@Injectable({
  providedIn: 'root',
})
export class WorkflowService implements OnDestroy {
  private currentWorkflowIdSubject = new BehaviorSubject<string | null>(null);
  currentWorkflowId$: Observable<string | null> = this.currentWorkflowIdSubject.asObservable();

  private _workflows = new BehaviorSubject<WorkflowModel[]>([]);
  readonly workflows$: Observable<WorkflowModel[]> = this._workflows.asObservable();

  private _isLoading = new BehaviorSubject<boolean>(false);
  readonly isLoading$: Observable<boolean> = this._isLoading.asObservable();

  private _errorMessage = new BehaviorSubject<string | null>(null);
  readonly errorMessage$: Observable<string | null> = this._errorMessage.asObservable();

  private dataLoadingSubscription!: Subscription;

  private readonly API_BASE_URL = environment.backendURL;

  constructor(
    private http: HttpClient,
    private workspaceStateService: WorkspaceStateService
  ) {
    console.log('WorkflowService constructor: Initializing dataLoadingSubscription');

    // Subscribe to the GLOBAL workspace state
    this.dataLoadingSubscription = this.workspaceStateService.activeWorkspaceId$
      .pipe(
        distinctUntilChanged(), // Prevent duplicate calls if the same ID is emitted twice
        tap(workspaceId => console.log('WorkflowService: Global workspace changed to:', workspaceId)),
        filter(workspaceId => !!workspaceId), // Stop here if it's null
        tap(() => {
          this._isLoading.next(true);
          this._errorMessage.next(null);
          // Optional: clear previous workflows while loading new ones
          // this._workflows.next([]);
        }),
        switchMap(workspaceId => {
          console.log('WorkflowService: Fetching workflows for:', workspaceId);
          return this.getWorkflowsForWorkspace(workspaceId as string).pipe(
            catchError(err => {
              console.error('Failed to load workflows', err);
              this._errorMessage.next('Could not load workflows. Please try again later.');
              this._isLoading.next(false); // Ensure loading is turned off on error
              return of([]);
            })
          );
        }),
        tap(workflows => {
           console.log('WorkflowService: Fetch complete, count:', workflows.length);
           this._isLoading.next(false);
        })
      )
      .subscribe(workflows => {
        this._workflows.next(workflows);
      });
  }

  ngOnDestroy(): void {
    if (this.dataLoadingSubscription) {
      this.dataLoadingSubscription.unsubscribe();
    }
  }

  setCurrentWorkflowId(workflowId: string | null): void {
    this.currentWorkflowIdSubject.next(workflowId);
  }

  private getWorkflowsForWorkspace(workspaceId: string): Observable<WorkflowModel[]> {
    return this.http.get<WorkflowModel[]>(`${this.API_BASE_URL}/workflows/${workspaceId}`);
  }

  getWorkflows(): Observable<WorkflowModel[]> {
    return this.workflows$;
  }

  getWorkflowById(workflowId: string): Observable<WorkflowModel> {
    // We get the current ID synchronously from the service if needed,
    // or we could rely on the component to pass it.
    // Using the service's getter is safest if available, otherwise we might need to take(1) from the observable.
    const workspaceId = this.workspaceStateService.getActiveWorkspaceId();

    if (!workspaceId) {
        console.error("Cannot fetch workflow: No active workspace");
        throw new Error("No active workspace");
    }

    return this.http.get<WorkflowModel>(
      `${this.API_BASE_URL}/workflows/${workspaceId}/${workflowId}`,
    );
  }

  createWorkflow(workflowData: WorkflowModel): Observable<{message: string}> {
    return this.http.post<{message: string}>(
      `${this.API_BASE_URL}/workflows`,
      workflowData,
    );
  }

  updateWorkflow(workflowData: WorkflowModel): Observable<{message: string}> {
    const {workspace_id, workflow_id} = workflowData;
     // Ensure this URL matches your backend route exactly.
    return this.http.put<{message: string}>(
      `${this.API_BASE_URL}/workflows/${workflow_id}?workspaceId=${workspace_id}`,
      workflowData,
    );
  }
}
