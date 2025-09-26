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

import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Workspace, WorkspaceScope} from '../../models/workspace.model';
import {WorkspaceService} from '../../../services/workspace/workspace.service';
import {WorkspaceStateService} from '../../../services/workspace/workspace-state.service';
import {CreateWorkspaceModalComponent} from '../create-workspace-modal/create-workspace-modal.component';
import {ConfirmationDialogComponent} from '../confirmation-dialog/confirmation-dialog.component';
import {handleErrorSnackbar, handleSuccessSnackbar} from '../../../utils/handleErrorSnackbar';
import {
  InviteUserData,
  InviteUserModalComponent,
} from '../invite-user-modal/invite-user-modal.component';
import {UserService} from '../../services/user.service';
import {UserModel, UserRolesEnum} from '../../models/user.model';
import {
  BrandGuidelineDialogComponent,
  BrandGuidelineDialogData,
} from '../brand-guideline-dialog/brand-guideline-dialog.component';
import {BrandGuidelineService} from '../../services/brand-guideline/brand-guideline.service';
import {finalize, map, switchMap} from 'rxjs';

@Component({
  selector: 'app-workspace-switcher',
  templateUrl: './workspace-switcher.component.html',
  styleUrls: ['./workspace-switcher.component.scss'],
})
export class WorkspaceSwitcherComponent implements OnInit {
  workspaces: Workspace[] = [];
  activeWorkspaceId: string | null = null;
  activeWorkspace: Workspace | null = null;
  currentUser: UserModel | null;
  isFetchingGuidelines = false;
  public WorkspaceScope = WorkspaceScope;

  constructor(
    private workspaceService: WorkspaceService,
    private workspaceStateService: WorkspaceStateService,
    private brandGuidelineService: BrandGuidelineService,
    private userService: UserService,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {
    this.currentUser = this.userService.getUserDetails();
  }

  ngOnInit(): void {
    this.loadWorkspaces();
    this.workspaceStateService.activeWorkspaceId$.subscribe(id => {
      this.activeWorkspaceId = id;
      this.activeWorkspace = this.workspaces.find(w => w.id === id) || null;
    });
  }

  loadWorkspaces(): void {
    this.workspaceService.getWorkspaces().subscribe({
      next: workspaces => {
        this.workspaces = workspaces;
        this.activeWorkspace =
          this.workspaces.find(w => w.id === this.activeWorkspaceId) || null;
        this.initializeActiveWorkspace();
      },
      error: error => {
        handleErrorSnackbar(this.snackBar, error, 'Could not load workspaces');
      },
    });
  }

  initializeActiveWorkspace(): void {
    const queryParamId = this.route.snapshot.queryParamMap.get('workspaceId');
    if (queryParamId && this.workspaces.some(w => w.id === queryParamId)) {
      this.setActiveWorkspace(queryParamId);
      return;
    }

    const googleWorkspace = this.workspaces.find(
      w => w.scope === WorkspaceScope.PUBLIC,
    );
    if (googleWorkspace) {
      this.setActiveWorkspace(googleWorkspace.id);
      return;
    }

    if (this.workspaces.length > 0) {
      this.setActiveWorkspace(this.workspaces[0].id);
    }
  }

  setActiveWorkspace(workspaceId: string | null): void {
    this.workspaceStateService.setActiveWorkspaceId(workspaceId);
    this.activeWorkspace =
      this.workspaces.find(w => w.id === workspaceId) || null;
  }

  openCreateWorkspaceDialog(): void {
    const dialogRef = this.dialog.open(CreateWorkspaceModalComponent, {
      width: '300px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createWorkspace(result);
      }
    });
  }

  createWorkspace(name: string): void {
    this.workspaceService.createWorkspace(name).subscribe({
      next: newWorkspace => {
        this.snackBar.open(`Workspace "${name}" created!`, 'OK', {
          duration: 3000,
        });
        this.workspaces.push(newWorkspace);
        this.setActiveWorkspace(newWorkspace.id);
      },
      error: error => {
        handleErrorSnackbar(this.snackBar, error, 'Could not create workspace');
      },
    });
  }

  get canInvite(): boolean {
    if (
      !this.currentUser ||
      !this.activeWorkspace ||
      this.activeWorkspace?.scope === WorkspaceScope.PUBLIC
    ) {
      return false;
    }
    const isOwner = this.currentUser.id === this.activeWorkspace.ownerId;
    const isAdmin = !!this.currentUser.roles?.includes(UserRolesEnum.ADMIN);
    return isOwner || isAdmin;
  }

  get canEditBrandGuidelines(): boolean {
    if (!this.currentUser || !this.activeWorkspace) {
      return false;
    }
    const isAdmin = !!this.currentUser.roles?.includes(UserRolesEnum.ADMIN);
    // An admin can edit any workspace's guidelines.
    // A non-admin can only edit guidelines for private workspaces they own.
    const isOwnerOfPrivateWorkspace =
      this.activeWorkspace.scope === WorkspaceScope.PRIVATE &&
      this.currentUser.id === this.activeWorkspace.ownerId;
    return isAdmin || isOwnerOfPrivateWorkspace;
  }

  openInviteDialog(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.activeWorkspace) return;

    const dialogRef = this.dialog.open<
      InviteUserModalComponent,
      InviteUserData
    >(InviteUserModalComponent, {
      width: '350px',
      data: {workspaceName: this.activeWorkspace.name},
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.activeWorkspaceId) {
        this.workspaceService
          .inviteUser(this.activeWorkspaceId, result.email, result.role)
          .subscribe({
            next: () => {
              this.snackBar.open('Invitation sent!', 'OK', {duration: 3000});
            },
            error: error => {
              handleErrorSnackbar(
                this.snackBar,
                error,
                'Failed to send invitation',
              );
            },
          });
      }
    });
  }

  openBrandGuidelinesDialog(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.activeWorkspaceId || this.isFetchingGuidelines) return;
    const workspaceId = this.activeWorkspaceId;

    this.isFetchingGuidelines = true;
    this.brandGuidelineService
      .getBrandGuidelineForWorkspace(workspaceId)
      .pipe(
        finalize(() => (this.isFetchingGuidelines = false)),
        switchMap(guideline => {
          const dialogRef = this.dialog.open<
            BrandGuidelineDialogComponent,
            BrandGuidelineDialogData
          >(BrandGuidelineDialogComponent, {
            width: '800px',
            maxWidth: '90vw',
            panelClass: 'brand-guideline-dialog',
            data: {workspaceId: workspaceId, guideline},
          });
          return dialogRef
            .afterClosed()
            .pipe(map(result => ({result, guideline})));
        }),
      )
      .subscribe(({result, guideline}) => {
        if (!result) {
          return; // Dialog was closed without action
        }

        // Handle Deletion
        if (result.delete && guideline?.id) {
          const confirmationDialogRef = this.dialog.open(
            ConfirmationDialogComponent,
            {
              data: {
                title: 'Delete Brand Guideline?',
                message:
                  'Are you sure you want to delete the brand guideline for this workspace? This action cannot be undone.',
              },
            },
          );

          confirmationDialogRef.afterClosed().subscribe(confirmed => {
            if (confirmed) {
              this.brandGuidelineService
                .deleteBrandGuideline(guideline.id)
                .subscribe({
                  next: () => {
                    this.snackBar.open('Brand Guideline deleted.', 'OK', {
                      duration: 3000,
                    });
                  },
                  error: error =>
                    handleErrorSnackbar(
                      this.snackBar,
                      error,
                      'Could not delete brand guideline.',
                    ),
                });
            }
          });
        } else if (result.name && result.file && workspaceId) {
          const formData = new FormData();
          formData.append('name', result.name);
          formData.append('file', result.file);
          formData.append('workspaceId', workspaceId);

          this.isFetchingGuidelines = true;
          this.brandGuidelineService
            .createBrandGuideline(formData)
            .pipe(finalize(() => (this.isFetchingGuidelines = false)))
            .subscribe({
              next: () => {
                handleSuccessSnackbar(
                  this.snackBar,
                  'Brand Guideline uploaded!',
                );
              },
              error: error => {
                handleErrorSnackbar(
                  this.snackBar,
                  error,
                  'Failed to upload brand guideline.',
                );
              },
            });
        }
      });
  }

  openFeedbackForm(event: MouseEvent): void {
    event.stopPropagation();
    window.open(
      'https://docs.google.com/forms/d/e/1FAIpQLSceWvu7G354h-dTbOGvNGEraEjcUAgPE300WNY5qr-WJbh3Eg/viewform',
      '_blank',
    );
  }
}
