// src/app/opal-sign-in-dialog.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
    selector: 'app-opal-sign-in-dialog',
    imports: [MatDialogModule, MatButtonModule],
    template: `
    <h2 mat-dialog-title>Sign into Opal</h2>
    <mat-dialog-content>
      <p>To continue, please sign in or authorize Opal below.</p>
      <!-- The iframe from HiddenOpalIframeComponent will be shown here via CSS -->
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
    </mat-dialog-actions>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OpalSignInDialogComponent { }