// src/app/root-component-loader.service.ts
import {
    ApplicationRef,
    createComponent,
    inject,
    Injectable,
    reflectComponentType,
    Type,
} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RootComponentLoader {
    private readonly applicationRef = inject(ApplicationRef);

    createComponent<T>(component: Type<T>): { component: T; destroy: () => void } {
        const hostElement = document.createElement(
            reflectComponentType(component)!.selector,
        );
        document.body.appendChild(hostElement);
        const componentRef = createComponent(component, {
            environmentInjector: this.applicationRef.injector,
            hostElement,
        });
        this.applicationRef.attachView(componentRef.hostView);
        componentRef.changeDetectorRef.detectChanges();
        return {
            component: componentRef.instance,
            destroy: () => {
                document.body.removeChild(hostElement);
                componentRef.destroy();
            },
        };
    }
}