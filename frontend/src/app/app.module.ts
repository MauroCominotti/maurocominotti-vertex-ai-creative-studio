// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { environment } from '../environments/environment';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { NgOptimizedImage } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// Angular Material / CDK
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

// App components
import { ArenaComponent } from './arena/arena.component';
import { ConfirmationDialogComponent } from './common/components/confirmation-dialog/confirmation-dialog.component';
import { ImageSelectorComponent } from './common/components/image-selector/image-selector.component';
import { MediaLightboxComponent } from './common/components/media-lightbox/media-lightbox.component';
import { SourceAssetGalleryComponent } from './common/components/source-asset-gallery/source-asset-gallery.component';
import { ToastMessageComponent } from './common/components/toast-message/toast-message.component';
import { SharedModule } from './common/shared.module';
import { FooterComponent } from './footer/footer.component';
import { FunTemplatesComponent } from './fun-templates/fun-templates.component';
import { MediaDetailComponent } from './gallery/media-detail/media-detail.component';
import { MediaGalleryComponent } from './gallery/media-gallery/media-gallery.component';
import { HeaderComponent } from './header/header.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { VideoComponent } from './video/video.component';
import { VtoComponent } from './vto/vto.component';

// HTTP
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';

// Firebase (MODULAR)
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

// Analytics (MODULAR, guarded)
import {
  getAnalytics,
  provideAnalytics,
  ScreenTrackingService,
  UserTrackingService
} from '@angular/fire/analytics';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    HomeComponent,
    ToastMessageComponent,
    LoginComponent,
    ConfirmationDialogComponent,
    FunTemplatesComponent,
    VideoComponent,
    ArenaComponent,
    MediaGalleryComponent,
    MediaDetailComponent,
    MediaLightboxComponent,
    VtoComponent,
    ImageSelectorComponent,
    SourceAssetGalleryComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgOptimizedImage,

    // Material modules used across your templates
    MatTooltipModule,
    MatToolbarModule,
    MatDividerModule,
    MatButtonModule,
    MatChipsModule,
    MatRadioModule,
    MatIconModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatMenuModule,              // ✅ ADDED: fixes <mat-menu>, matMenuTriggerFor, exportAs="matMenu"
    MatCheckboxModule,
    MatCardModule,
    MatTableModule,
    FormsModule,                // ✅ for [(ngModel)]
    ScrollingModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatTabsModule,
    MatDialogModule,

    SharedModule,
  ],
  providers: [
    // no provideClientHydration() since you're not SSR-ing with hydration
    provideHttpClient(withInterceptorsFromDi()),

    // Firebase (modular)
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideAnalytics(() => getAnalytics()),


    // optional auto-tracking
    ScreenTrackingService,
    UserTrackingService,

    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
