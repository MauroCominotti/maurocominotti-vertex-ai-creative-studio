// src/app/opal-url.service.ts
import { Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OpalUrlService {
    constructor(private readonly sanitizer: DomSanitizer) { }

    getOpalOriginUrl(): string {
        const url = new URL(environment.opalOrigin); // e.g. https://opal.corp.goog
        return url.toString();
    }

    getOpalOriginUrlWithRedirectUriString(): string {
        const url = new URL(this.getOpalOriginUrl());
        url.searchParams.set('oauth_redirect', `${environment.selfOrigin}/opals/oauth`);
        return url.toString();
    }

    /** Return a SafeResourceUrl suitable for binding into <iframe [src]> */
    getOpalOriginUrlWithRedirectUriSafe(): SafeResourceUrl {
        const urlStr = this.getOpalOriginUrlWithRedirectUriString();
        const url = new URL(urlStr);

        // Minimal allowlist: only allow HTTPS and the expected host.
        if (url.protocol !== 'https:' || url.hostname !== 'opal.corp.goog') {
            throw new Error(`Blocked non-allowed OPAL origin: ${url.origin}`);
        }
        return this.sanitizer.bypassSecurityTrustResourceUrl(url.toString());
    }
}
