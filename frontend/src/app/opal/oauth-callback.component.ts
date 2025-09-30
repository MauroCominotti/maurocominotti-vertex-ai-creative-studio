// src/app/oauth-callback.component.ts
import { Component, OnInit } from '@angular/core';

@Component({
    standalone: true,
    template: `<p>Authentication successful, closing window...</p>`,
})
export class OauthCallbackComponent implements OnInit {
    ngOnInit() {
        window.close();
    }
}