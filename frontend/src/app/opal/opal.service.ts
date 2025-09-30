// src/app/opal.service.ts
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HiddenOpalIframeManager } from './hidden-opal-iframe-manager.service';
import { HiddenOpalIframeComponent } from './hidden-opal-iframe.component';
import { OpalSignInDialogComponent } from './opal-sign-in-dialog.component';

@Injectable({ providedIn: 'root' })
export class OpalService {
    private readonly dialog = inject(MatDialog);
    private readonly router = inject(Router);
    private readonly hiddenOpalIframeManager = inject(HiddenOpalIframeManager);
    private active = false;

    async createOpal(prompt: string): Promise<void> {
        if (this.active) {
            console.warn('Opal creation already in progress');
            return;
        }
        this.active = true;
        try {
            await this.hiddenOpalIframeManager.useComponent(async (iframe) => {
                console.log("Here 1 2 3")
                const isSignedIn = await this.signIn(iframe);
                console.log(`is signed in: ${isSignedIn}`)
                if (!isSignedIn) return; // User cancelled dialog
                iframe.aiFlowMessages$.next({ type: 'create_new_board', prompt });
                const { id } = await iframe.firstOpalMessage('board_id_created', 60000);
                // Instead of saving to a backend, just navigate:
                await this.router.navigate(['opals', encodeURIComponent(id)]);
            });
        } catch (e) {
            console.error('Failed to create Opal', e);
            // Maybe show a MatSnackBar here
        } finally {
            this.active = false;
        }
    }

    private async signIn(iframe: HiddenOpalIframeComponent): Promise<boolean> {
        await iframe.waitUntilLoaded();

        console.log("aaaaaaaahhhhh")
        const { isSignedIn } = await iframe.firstOpalMessage('home_loaded', 80000);
        console.log("aaaaaaaahhhhh 2")
        if (isSignedIn) {
            return true;
        }
        console.log("aaaaaaaahhhhh 3")
        // Not signed in, show dialog
        const dialogRef = this.dialog.open(OpalSignInDialogComponent, {
            width: '650px',
            height: '550px',
        });
        console.log("aaaaaaaahhhhh 4")
        const signInCancelled = firstValueFrom(dialogRef.afterClosed()).then(() => false);
        // Wait for EITHER dialog to close OR iframe to report sign-in success
        const signInComplete = iframe
            .firstOpalMessage('home_loaded', 300_000, 1) // Skip first message, wait 5 mins
            .then((message) => message.isSignedIn);
        const result = await Promise.race([signInCancelled, signInComplete]);
        dialogRef.close();
        return result;
    }
}
