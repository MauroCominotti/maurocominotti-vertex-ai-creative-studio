// src/app/hidden-opal-iframe-manager.service.ts
import { inject, Injectable } from '@angular/core';
import { HiddenOpalIframeComponent } from './hidden-opal-iframe.component';
import { RootComponentLoader } from './root-component-loader.service';

@Injectable({ providedIn: 'root' })
export class HiddenOpalIframeManager {
    private readonly rootComponentLoader = inject(RootComponentLoader);
    private component?: HiddenOpalIframeComponent;
    private destroyFn = () => { };

    async useComponent(
        callback: (component: HiddenOpalIframeComponent) => Promise<void>,
    ): Promise<void> {
        if (!this.component) {
            const { component, destroy } = this.rootComponentLoader.createComponent(
                HiddenOpalIframeComponent,
            );
            this.component = component;
            this.destroyFn = destroy;
        }
        this.component.inUse = true;
        try {
            await callback(this.component);
        } finally {
            this.destroyFn();
            this.component = undefined;
            this.destroyFn = () => { };
        }
    }
}