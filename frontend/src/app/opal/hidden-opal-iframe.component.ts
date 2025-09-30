// src/app/hidden-opal-iframe.component.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { ReplaySubject, Subject, firstValueFrom, timeout } from 'rxjs';
import { filter, skip, tap } from 'rxjs/operators';
import { OpalIframeDirective } from './opal-iframe.directive';
import { AiFlowMessage, OpalMessage } from './opal-messages';
import { OpalUrlService } from './opal-url.service';

@Component({
    selector: 'app-hidden-opal-iframe',
    template: `
    <iframe
        appOpalIframe
        [src]="opalUrl"
        allow='compute-pressure; autoplay; encrypted-media; fullscreen; accelerometer; gyroscope; clipboard-write; web-share; storage-access'
        (load)="onIframeLoad()"
        [messages$]="aiFlowMessages$"
        (opalMessage)="opalMessages$.next($event)">
        </iframe>
    `,
    imports: [OpalIframeDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
    :host { display: none; }
    :host-context(body:has(app-opal-sign-in-dialog)) {
      display: contents;
      iframe {
        height: 400px; width: 600px; border: none;
        position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1001;
      }
    }`]
})
export class HiddenOpalIframeComponent {
    protected readonly opalUrl: SafeResourceUrl =
        inject(OpalUrlService).getOpalOriginUrlWithRedirectUriSafe();
    // Permissions Policy / Feature Policy needed by the embedded app
    protected readonly opalMessages$ = new ReplaySubject<OpalMessage>();
    readonly aiFlowMessages$ = new Subject<AiFlowMessage>();
    inUse = false;

    private iframeLoaded = false;
    private loadedResolve?: () => void;
    private loadedPromise = new Promise<void>(res => this.loadedResolve = res);

    onIframeLoad(): void {
        this.iframeLoaded = true;
        this.loadedResolve?.();
    }

    waitUntilLoaded(): Promise<void> {
        return this.iframeLoaded ? Promise.resolve() : this.loadedPromise;
    }

    firstOpalMessage<T extends OpalMessage['type']>(
        type: T,
        timeoutMs = 10000,
        skipCount = 0,
    ): Promise<Extract<OpalMessage, { type: T }>> {
        console.log("asdadwcxaca234qw33r")
        console.log(this.opalMessages$)
        return firstValueFrom(
            this.opalMessages$.pipe(
                tap(msg => console.log(msg)),
                filter((msg): msg is Extract<OpalMessage, { type: T }> => msg.type === type),
                skip(skipCount),
                timeout(timeoutMs),
            ),
        );
    }
}
