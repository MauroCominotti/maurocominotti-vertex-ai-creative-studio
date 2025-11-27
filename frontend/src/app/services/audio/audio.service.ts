import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  Observable,
  Subscription,
  tap,
  timer,
  switchMap,
} from 'rxjs';
import {
  JobStatus,
  MediaItem,
} from '../../common/models/media-item.model';
import { environment } from '../../../environments/environment';
import { LanguageEnum, VoiceEnum } from '../../audio/audio.constants'; 
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  handleErrorSnackbar,
  handleSuccessSnackbar,
} from '../../utils/handleErrorSnackbar';

// 1. Define the Enum to match Backend exactly
export enum GenerationModelEnum {
  // Music
  LYRIA_002 = 'lyria-002',

  // Speech
  CHIRP_3 = 'chirp_3',
  GEMINI_2_5_FLASH_TTS = 'gemini-2.5-flash-tts',
  GEMINI_2_5_FLASH_LITE_PREVIEW_TTS = 'gemini-2.5-flash-lite-preview-tts',
  GEMINI_2_5_PRO_TTS = 'gemini-2.5-pro-tts',
}

// 2. Define the Generic Request DTO
export interface CreateAudioDto {
  model: GenerationModelEnum;
  prompt: string;
  workspaceId: string; // Angular standard is camelCase, Pydantic 'alias_generator=to_camel' handles this

  // Lyria Specific
  negativePrompt?: string;
  sampleCount?: number;
  seed?: number;

  // TTS Specific
  languageCode?: LanguageEnum;
  voiceName?: VoiceEnum;
}

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private apiUrl = `${environment.backendURL}/audios`;
  private activeAudioJob = new BehaviorSubject<MediaItem | null>(null);
  public activeAudioJob$ = this.activeAudioJob.asObservable();
  private pollingSubscription: Subscription | null = null;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  generateAudio(request: CreateAudioDto): Observable<MediaItem> {
    return this.http.post<MediaItem>(`${this.apiUrl}/generate`, request).pipe(
      tap(initialItem => {
        this.activeAudioJob.next(initialItem);
        this.startAudioPolling(initialItem.id);
      })
    );
  }

  getAudioMediaItem(mediaId: string): Observable<MediaItem> {
    return this.http.get<MediaItem>(`${this.apiUrl}/${mediaId}`);
  }

  private startAudioPolling(mediaId: string): void {
    this.stopAudioPolling();

    this.pollingSubscription = timer(3000, 5000) // Start after 3s, then every 5s
      .pipe(
        switchMap(() => this.getAudioMediaItem(mediaId)),
        tap(latestItem => {
          this.activeAudioJob.next(latestItem);

          if (
            latestItem.status === JobStatus.COMPLETED ||
            latestItem.status === JobStatus.FAILED
          ) {
            this.stopAudioPolling();
            if (latestItem.status === JobStatus.COMPLETED) {
              handleSuccessSnackbar(this.snackBar, 'Your audio is ready!');
            } else {
              handleErrorSnackbar(
                this.snackBar,
                { message: latestItem.errorMessage || latestItem.error_message },
                `Audio generation failed: ${
                  latestItem.errorMessage || latestItem.error_message
                }`
              );
            }
          }
        }),
        catchError(err => {
          console.error('Polling failed', err);
          this.stopAudioPolling();
          return EMPTY;
        })
      )
      .subscribe();
  }

  private stopAudioPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = null;
  }

  clearActiveAudioJob() {
    this.activeAudioJob.next(null);
  }
}
