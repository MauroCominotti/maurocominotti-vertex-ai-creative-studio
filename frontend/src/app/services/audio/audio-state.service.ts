import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LanguageEnum, VoiceEnum } from '../../audio/audio.constants';

// UI Helper type
export type UiModelType = 'lyria' | 'chirp' | 'gemini-tts';

export interface AudioState {
  selectedModel: UiModelType,
  prompt: string;
  negativePrompt: string;
  seed: number | undefined;
  sampleCount: number,
  selectedLanguage: LanguageEnum,
  selectedVoice: VoiceEnum | string;
}

@Injectable({
  providedIn: 'root'
})
export class AudioStateService {
  private initialState: AudioState = {
    selectedModel: 'lyria',
    prompt: '',
    negativePrompt: '',
    seed: undefined,
    sampleCount: 4,
    selectedLanguage: LanguageEnum.EN_US,
    selectedVoice: VoiceEnum.PUCK
  };

  private state = new BehaviorSubject<AudioState>(this.initialState);
  state$ = this.state.asObservable();

  updateState(newState: Partial<AudioState>) {
    this.state.next({ ...this.state.value, ...newState });
  }

  getState(): AudioState {
    return this.state.value;
  }

  resetState() {
    this.state.next(this.initialState);
  }
}
