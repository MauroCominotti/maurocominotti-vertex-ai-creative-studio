import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AudioComponent } from './audio.component';
import { AudioService } from '../services/audio/audio.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { WorkspaceStateService } from '../services/workspace/workspace-state.service';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

describe('AudioComponent', () => {
  let component: AudioComponent;
  let fixture: ComponentFixture<AudioComponent>;
  let audioService: jasmine.SpyObj<AudioService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let workspaceStateService: jasmine.SpyObj<WorkspaceStateService>;

  beforeEach(async () => {
    const audioServiceSpy = jasmine.createSpyObj('AudioService', ['generateAudio', 'activeAudioJob$']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const workspaceStateServiceSpy = jasmine.createSpyObj('WorkspaceStateService', ['getActiveWorkspaceId']);

    await TestBed.configureTestingModule({
      declarations: [AudioComponent],
      imports: [
        NoopAnimationsModule,
        HttpClientTestingModule,
        FormsModule,
        MatButtonToggleModule
      ],
      providers: [
        { provide: AudioService, useValue: audioServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: WorkspaceStateService, useValue: workspaceStateServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AudioComponent);
    component = fixture.componentInstance;
    audioService = TestBed.inject(AudioService) as jasmine.SpyObj<AudioService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    workspaceStateService = TestBed.inject(WorkspaceStateService) as jasmine.SpyObj<WorkspaceStateService>;

    audioService.activeAudioJob$ = of(null);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('generate', () => {
    beforeEach(() => {
      workspaceStateService.getActiveWorkspaceId.and.returnValue('test-workspace');
      audioService.generateAudio.and.returnValue(of({ id: '123', status: 'processing' } as any));
    });

    it('should set isLoading to true when generate is called', () => {
      component.generate();
      expect(component.isLoading).toBeTrue();
    });

    it('should call audioService.generateAudio with the correct parameters', () => {
      component.generate();
      expect(audioService.generateAudio).toHaveBeenCalled();
    });

    it('should set isLoading to false when generate is finished', () => {
      component.generate();
      fixture.detectChanges();
      expect(component.isLoading).toBeFalse();
    });

    it('should show an error snackbar if audioService.generateAudio fails', () => {
      const error = { message: 'error' };
      audioService.generateAudio.and.returnValue(throwError(() => error));
      component.generate();
      expect(snackBar.open).toHaveBeenCalled();
    });
  });
});