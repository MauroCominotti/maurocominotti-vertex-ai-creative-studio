import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    inject,
    NgZone,
    OnDestroy,
    ViewChild,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import type {
    BreadboardMessage,
    CreateNewBoardMessage,
    HandshakeCompleteMessage,
    ToggleIterateOnPromptMessage,
} from '@breadboard-ai/embed';
import { OpalService } from './opal.service';


@Component({
    selector: 'app-opal',
    imports: [RouterOutlet],
    templateUrl: './opal.component.html',
    styleUrls: ['./opal.component.scss'],
})
export class OpalComponent implements AfterViewInit, OnDestroy {
    @ViewChild('breadboardFrame', { static: true })
    private breadboardFrame?: ElementRef<HTMLIFrameElement>;

    private readonly opalService = inject(OpalService);
    private breadboardWindow?: Window;
    public isSignedIn = false;

    constructor(
        private readonly zone: NgZone,
        private readonly cdr: ChangeDetectorRef,
        private readonly router: Router,
    ) { }

    ngAfterViewInit(): void {
        window.addEventListener('message', this.onMessage);
    }

    ngOnDestroy(): void {
        window.removeEventListener('message', this.onMessage);
    }

    create() {
        this.opalService.createOpal('Create an app for sentiment analysis');
    }

    createBoardFromPrompt(prompt: string): void {
        const message: CreateNewBoardMessage = { type: 'create_new_board', prompt };
        this.breadboardWindow?.postMessage(message, '*');
    }

    showIterateButton(on: boolean): void {
        const message: ToggleIterateOnPromptMessage = {
            type: 'toggle_iterate_on_prompt',
            on,
        };
        this.breadboardWindow?.postMessage(message, '*');
    }

    private onMessage = (event: MessageEvent<BreadboardMessage>): void => {
        if (!this.breadboardFrame) {
            return;
        }

        const frameWindow = this.breadboardFrame.nativeElement.contentWindow;
        if (!frameWindow || event.source !== frameWindow) {
            return;
        }

        switch (event.data.type) {
            case 'handshake_ready': {
                this.breadboardWindow = frameWindow;
                const reply: HandshakeCompleteMessage = {
                    type: 'handshake_complete',
                    origin: window.location.origin,
                };
                frameWindow.postMessage(reply, '*');
                break;
            }
            case 'home_loaded': {
                this.zone.run(() => {
                    this.isSignedIn = (event.data as any).isSignedIn;
                    this.cdr.markForCheck();
                });
                break;
            }
            case 'board_id_created':
                console.info('New board created at', event.data.id);
                break;
            case 'iterate_on_prompt':
                console.info('Prompt iteration requested', event.data);
                break;
            case 'oauth_redirect':
                window.location.reload();
                break;
            default:
                break;
        }
    };
}
