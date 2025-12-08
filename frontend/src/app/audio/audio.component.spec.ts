import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AudioComponent } from './audio.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AudioService, CreateAudioDto, GenerationModelEnum } from '../services/audio/audio.service';
import { of } from 'rxjs';
import { JobStatus, MediaItem } from '../common/models/media-item.model';
import { WorkspaceStateService } from '../services/workspace/workspace-state.service';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MediaLightboxComponent } from '../common/components/media-lightbox/media-lightbox.component';

describe('AudioComponent', () => {
  let component: AudioComponent;
  let fixture: ComponentFixture<AudioComponent>;
  let audioService: jasmine.SpyObj<AudioService>;
  let workspaceStateService: jasmine.SpyObj<WorkspaceStateService>;

  const mockMediaItem: MediaItem = {
    id: '123',
    status: JobStatus.COMPLETED,
    originalPrompt: 'test prompt',
    presignedUrls: ['http://example.com/audio.mp3'],
    presignedThumbnailUrls: [],
    gcsUris: []
  };

  beforeEach(async () => {
    const audioServiceSpy = jasmine.createSpyObj('AudioService', ['generateAudio', 'clearActiveAudioJob']);
    const workspaceStateServiceSpy = jasmine.createSpyObj('WorkspaceStateService', ['getActiveWorkspaceId']);

    await TestBed.configureTestingModule({
      declarations: [AudioComponent, MediaLightboxComponent],
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule,
        MatDialogModule,
        NoopAnimationsModule,
        FormsModule,
        MatButtonToggleModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        MatProgressSpinnerModule,
      ],
      providers: [
        { provide: AudioService, useValue: audioServiceSpy },
        { provide: WorkspaceStateService, useValue: workspaceStateServiceSpy },
      ]
    }).compileComponents();

    audioService = TestBed.inject(AudioService) as jasmine.SpyObj<AudioService>;
    workspaceStateService = TestBed.inject(WorkspaceStateService) as jasmine.SpyObj<WorkspaceStateService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AudioComponent);
    component = fixture.componentInstance;
    audioService.activeAudioJob$ = of(null); // Default to no active job
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('generate', () => {
    it('should call audioService.generateAudio with the correct parameters for Lyria', () => {
      // Arrange
      const workspaceId = 'ws-123';
      workspaceStateService.getActiveWorkspaceId.and.returnValue(workspaceId);
      audioService.generateAudio.and.returnValue(of(mockMediaItem));

      component.selectedModel = 'lyria';
      component.prompt = 'a beautiful song';
      component.negativePrompt = 'heavy metal';
      component.seed = 12345;
      component.sampleCount = 2;

      const expectedRequest: CreateAudioDto = {
        model: GenerationModelEnum.LYRIA_002,
        prompt: 'a beautiful song',
        workspaceId: workspaceId,
        negativePrompt: 'heavy metal',
        seed: 12345,
        sampleCount: 2,
        languageCode: undefined,
        voiceName: undefined
      };

      // Act
      component.generate();

      // Assert
      expect(audioService.generateAudio).toHaveBeenCalledWith(expectedRequest);
    });

    it('should call audioService.generateAudio with the correct parameters for Chirp', () => {
      // Arrange
      const workspaceId = 'ws-123';
      workspaceStateService.getActiveWorkspaceId.and.returnValue(workspaceId);
      audioService.generateAudio.and.returnValue(of(mockMediaItem));

      component.selectedModel = 'chirp';
      component.prompt = 'hello world';
      component.selectedLanguage = 'en-US' as any;
      component.selectedVoice = 'puck' as any;
      component.sampleCount = 1;

      const expectedRequest: CreateAudioDto = {
        model: GenerationModelEnum.CHIRP_3,
        prompt: 'hello world',
        workspaceId: workspaceId,
        negativePrompt: undefined,
        seed: undefined,
        sampleCount: 1,
        languageCode: 'en-US' as any,
        voiceName: 'puck' as any,
      };

      // Act
      component.generate();

      // Assert
      expect(audioService.generateAudio).toHaveBeenCalledWith(expectedRequest);
    });

    it('should not call audioService.generateAudio if no workspace is selected', () => {
      // Arrange
      workspaceStateService.getActiveWorkspaceId.and.returnValue(null);

      // Act
      component.generate();

      // Assert
      expect(audioService.generateAudio).not.toHaveBeenCalled();
    });
  });

  describe('closeLightbox', () => {
    it('should call audioService.clearActiveAudioJob', () => {
      // Act
      component.closeLightbox();

      // Assert
      expect(audioService.clearActiveAudioJob).toHaveBeenCalled();
    });
  });
});