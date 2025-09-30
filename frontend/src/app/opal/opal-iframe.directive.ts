// src/app/opal-iframe.directive.ts
import {
    Directive,
    ElementRef,
    inject,
    input,
    output,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
import { switchAll } from 'rxjs/operators';
import { AiFlowMessage, OpalMessage } from './opal-messages';
import { OpalUrlService } from './opal-url.service';

@Directive({
    selector: 'iframe[appOpalIframe]',
    standalone: true,
    host: {
        '(window:message)': 'handleMessage($event)',
    },
})
export class OpalIframeDirective {
    // The component passes an Observable<AiFlowMessage>
    messages$ = input<Observable<AiFlowMessage>>(of());
    readonly opalMessage = output<OpalMessage>();

    // Promise.withResolvers is TS 5.4+; keep it if available in your setup
    protected readonly handshakeReady = Promise.withResolvers<void>();

    private readonly elementRef =
        inject<ElementRef<HTMLIFrameElement>>(ElementRef);
    private readonly opalUrlService = inject(OpalUrlService);

    // IMPORTANT: use a *string* origin, not a SafeResourceUrl
    // If your service exposes a different method name, replace the next line
    private readonly opalOrigin: string =
        new URL(this.opalUrlService.getOpalOriginUrl()).origin;
    // e.g. "https://opal.corp.goog"

    constructor() {
        this.forwardMessagesToOpal();
    }

    protected handleMessage(event: MessageEvent<unknown>) {
        // Only accept messages from the OPAL iframe window AND the expected origin.
        if (
            event.origin === this.opalOrigin &&
            event.source === this.elementRef.nativeElement.contentWindow &&
            (event.data as OpalMessage)?.type
        ) {
            const message = event.data as OpalMessage;

            // Resolve handshake on first 'handshake_ready' message
            if (message.type === 'handshake_ready') {
                this.handshakeReady.resolve();
            }

            // Bubble it up to the component/service
            this.opalMessage.emit(message);
        }
    }

    private forwardMessagesToOpal() {
        toObservable(this.messages$)
            .pipe(switchAll(), takeUntilDestroyed())
            .subscribe(async (message) => {
                // Wait until the embedded app signaled it's ready to receive messages
                await this.handshakeReady.promise;

                // Post to the iframe window, using the *string* targetOrigin
                this.elementRef.nativeElement.contentWindow?.postMessage(message, {
                    targetOrigin: this.opalOrigin,
                });
            });
    }
}
