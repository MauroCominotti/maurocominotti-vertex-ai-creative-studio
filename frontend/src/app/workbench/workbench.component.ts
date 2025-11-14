import {
  Component,
  OnInit,
  Inject
} from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { signal, ViewChild, ElementRef, computed, ChangeDetectionStrategy, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
// Removed 'lucide-angular' imports and replaced usage with inline SVG

// Interface for the generated thumbnails
interface Thumbnail {
  time: number;
  src: string;
}

@Component({
  selector: 'app-workbench',
  templateUrl: './workbench.component.html',
  styleUrl: './workbench.component.scss',
})

export class WorkbenchComponent implements AfterViewInit, OnDestroy {

  // --- Component State ---
  // imagenDocuments: MediaItem | null = null;
   isLoading = false;
  // templateParams: GenerationParameters | undefined;
  // showDefaultDocuments = false;
  // sourceAssetId1: string | null = null;
  // sourceAssetId2: string | null = null;
  // image1Preview: string | null = null;
  // image2Preview: string | null = null;
  // sourceMediaItems: (SourceMediaItemLink | null)[] = [];

  public videogallary: boolean = true;
  public videoeditor: boolean = false;
  //activeWorkspaceId$: Observable<string | null>;

  public videoUrl1: string | null = null;
  // public videoDuration: number = 0;

  constructor(
    public router: Router,
    private sanitizer: DomSanitizer,
    public matIconRegistry: MatIconRegistry,
    public dialog: MatDialog,

    // @Inject(WorkspaceStateService)
    // private workspaceStateService: WorkspaceStateService,

  ) {

    this.matIconRegistry
      .addSvgIcon(
        'content-type-icon',
        this.setPath(`../../assets/images/content-type-icon.svg`),
      )
      .addSvgIcon(
        'lighting-icon',
        this.setPath(`../../assets/images/lighting-icon.svg`),
      )
      .addSvgIcon(
        'number-of-images-icon',
        this.setPath(`../../assets/images/number-of-images-icon.svg`),
      )
      .addSvgIcon(
        'gemini-spark-icon',
        this.setPath(`../../assets/images/gemini-spark-icon.svg`),
      )
      .addSvgIcon(
        'white-gemini-spark-icon',
        this.setPath(`../../assets/images/white-gemini-spark-icon.svg`),
      )
      .addSvgIcon(
        'mobile-white-gemini-spark-icon',
        this.setPath(`../../assets/images/mobile-white-gemini-spark-icon.svg`),
      );

  }//constructer end


  private path = '../../assets/images'
  private setPath(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit(): void {
    // this.router.navigate(['/'], {});
    //alert('workbench')
    console.log('workbench page loaded')
  }

  showImageGeneration() {
    this.videogallary = true;
    this.videoeditor = false;
  }

  showAudioGeneration() {
    this.videogallary = false;
    this.videoeditor = true;
  }

  //new code start-------------------------------------------------------------------------------------------------
// ViewChild references
  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('timelineContainer') timelineContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>; // NEW: Audio Player reference

  // --- Multi-track state ---

  // Video and Audio track lists (support multiple)
  videoTracks = signal<Array<{ id: string; src: string; duration: number; fileName?: string }>>([]);
  audioTracks = signal<Array<{ id: string; src: string; duration: number; fileName?: string }>>([]);

  // Which video/audio track is currently selected for preview/playback
  selectedVideoIndex = signal(0);
  selectedAudioIndex = signal(-1);

  // Video State
  videoSrc = signal<string | null>(null);
  videoDuration = signal(0);
  currentTime = signal(0);
  isPlaying = signal(false);
  // NEW: State to track if video should resume after dragging
  wasPlayingBeforeDrag = signal(false); 
  
  // NEW: Audio State
  audioSrc = signal<string | null>(null);
  audioDuration = signal(0);
  
  // Timeframe State
  startTime = signal(0);
  endTime = signal(0);
  isDragging = signal<'start' | 'end' | 'timeline' | null>(null);

  // Thumbnail State
  thumbnails = signal<Thumbnail[]>([]);
  isGenerating = signal(false);
  readonly numThumbnails = 10; // Number of thumbnails to display (reduced for better performance)

  // Frame Preview State (for drag action)
  previewFrameSrc = signal<string | null>(null);
  previewBoxLeft = signal(0);
  previewTime = signal(0);
  
  // --- Computed Properties for Template Positioning ---

  timeToPercent(time: number): string {
    if (this.videoDuration() === 0) return '0%';
    const percent = (time / this.videoDuration()) * 100;
    return `${Math.min(100, Math.max(0, percent))}%`;
  }

  currentTimePercent = computed(() => this.timeToPercent(this.currentTime()));
  rangeStartPercent = computed(() => this.timeToPercent(this.startTime()));
  rangeEndPercent = computed(() => this.timeToPercent(this.endTime()));

  rangeWidthPercent = computed(() => {
    const duration = this.videoDuration();
    if (duration === 0) return '0%';
    // Calculate the percentage difference between end and start times
    const width = this.endTime() - this.startTime();
    return `${(width / duration) * 100}%`;
  });

  // --- Utility Methods ---

  formatTime(seconds: number): string {
    if (seconds < 0 || isNaN(seconds)) return '00:00.00';
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    const ms = Math.floor((seconds % 1) * 100);
    
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }
  
  // Placeholder for the "Trim" action
  trimVideo(): void {
    const duration = this.formatTime(this.endTime() - this.startTime());
    // Using simple alert as window.alert is acceptable for explaining non-implemented features/placeholders
    alert(`Video would be trimmed from ${this.formatTime(this.startTime())} to ${this.formatTime(this.endTime())} (Total Duration: ${duration}). This feature requires server-side video processing.`);
  }

  // --- Video Event Handlers ---
  
  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const files = Array.from(input.files);
    const added: Array<{ id: string; src: string; duration: number; fileName?: string }> = [];
    for (const file of files) {
      if (!file.type.startsWith('video/')) {
        // skip non-video files, but continue processing others
        continue;
      }
      const src = URL.createObjectURL(file);
      added.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, src, duration: 0, fileName: file.name });
    }
    if (added.length === 0) return;

    // Append to existing tracks
    this.videoTracks.update(arr => [...arr, ...added]);

    // If no video is currently selected (first time), select the first added
    if (this.videoTracks().length > 0 && this.videoTracks().length - added.length === 0) {
      this.selectedVideoIndex.set(0);
    }

    // Reset UI state for thumbnails/preview for the currently selected video
    this.isPlaying.set(false);
    this.previewFrameSrc.set(null);
    this.thumbnails.set([]);

    // Sync audio state to the new video timeline start (if applicable)
    this.syncAudioToVideoTimeline();
  }

  onLoadedMetadata(event: Event): void {
    const video = event.target as HTMLVideoElement;
    const duration = video.duration;

    if (isNaN(duration) || !isFinite(duration) || duration === 0) {
        console.error("Video duration is invalid or zero.");
        return;
    }
    
    // Update the selected video's duration and the UI timeline duration
    const selIdx = this.selectedVideoIndex();
    this.videoTracks.update(arr => arr.map((t, i) => i === selIdx ? { ...t, duration } : t));
    this.videoDuration.set(duration);
    this.endTime.set(duration); 
    this.startTime.set(0); 
    
    // Set initial current time and start thumbnail generation
    this.currentTime.set(0); 
    this.generateThumbnails(video);
    
    // Sync audio position to video start
    this.syncAudioToVideoTimeline();
  }

  // NEW: Audio Upload Handler
  handleAudioUpload(event: Event): void {
      const input = event.target as HTMLInputElement;
      if (!input.files || input.files.length === 0) return;
      const files = Array.from(input.files);
      const added: Array<{ id: string; src: string; duration: number; fileName?: string }> = [];
      for (const file of files) {
        if (!file.type.startsWith('audio/')) continue;
        const src = URL.createObjectURL(file);
        added.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, src, duration: 0, fileName: file.name });
      }
      if (added.length === 0) return;
      this.audioTracks.update(arr => [...arr, ...added]);
      // If no audio selected, choose the first one
      if (this.selectedAudioIndex() === -1) {
        this.selectedAudioIndex.set(0);
      }
      // Reset audioDuration placeholder until metadata arrives
      this.audioDuration.set(0);
      this.syncAudioToVideoTimeline();
  }
  
  // NEW: Audio Metadata Handler (receives the audio track id to update its duration)
  onAudioLoadedMetadata(event: Event, trackId: string): void {
    const audio = event.target as HTMLAudioElement;
    const duration = audio.duration || 0;
    this.audioDuration.set(duration);
    // Update the corresponding track's duration value
    this.audioTracks.update(arr => arr.map(t => t.id === trackId ? { ...t, duration } : t));
  }

  // NEW: Syncs audio position to video position
  private syncAudioToVideoTimeline(): void {
      const video = this.videoPlayerRef?.nativeElement;
      if (!video) return;
      const selectedAudioIdx = this.selectedAudioIndex();
      if (selectedAudioIdx === -1) return;
      const track = this.audioTracks()[selectedAudioIdx];
      if (!track) return;
      const audioEl = document.getElementById('audioPlayer-' + track.id) as HTMLAudioElement | null;
      if (audioEl) {
          audioEl.currentTime = video.currentTime;
      }
  }

  // Select which video to preview/play
  selectVideo(index: number): void {
    if (index < 0 || index >= this.videoTracks().length) return;
    this.selectedVideoIndex.set(index);
    // Reset thumbnails and preview for the newly selected video
    this.thumbnails.set([]);
    this.previewFrameSrc.set(null);
    this.isPlaying.set(false);
  }

  // Select which audio track should be synced to the video playback
  selectAudio(index: number): void {
    if (index < 0 || index >= this.audioTracks().length) return;
    this.selectedAudioIndex.set(index);
    // Try to sync immediately
    this.syncAudioToVideoTimeline();
  }

  selectVideoById(id: string): void {
    const idx = this.videoTracks().findIndex(t => t.id === id);
    if (idx !== -1) this.selectVideo(idx);
  }

  selectAudioById(id: string): void {
    const idx = this.audioTracks().findIndex(t => t.id === id);
    if (idx !== -1) this.selectAudio(idx);
  }


  updateTime(event: Event): void {
    const video = event.target as HTMLVideoElement;
    const time = video.currentTime;
    this.currentTime.set(time);

    // Only sync audio if we are playing and not currently dragging the handles/timeline
    if (this.isPlaying() && !this.isDragging()) {
     const selAudioIdx = this.selectedAudioIndex();
     if (selAudioIdx !== -1) {
      const track = this.audioTracks()[selAudioIdx];
      const audioEl = document.getElementById('audioPlayer-' + track.id) as HTMLAudioElement | null;
      if (audioEl) audioEl.currentTime = time;
     }
    }


    // Looping/Trimming logic: seek back to the start time if end is reached
    // FIX: Using a slightly larger epsilon (0.1) for better floating point safety
    if (this.isPlaying() && time >= this.endTime() - 0.1) { 
      video.currentTime = this.startTime();
      if (this.audioPlayerRef?.nativeElement) {
        this.audioPlayerRef.nativeElement.currentTime = this.startTime(); // SYNC AUDIO
      }
    }
  }
  
  onVideoEnded(): void {
    // If the video plays to the natural end (which shouldn't happen with the loop logic, but as a fallback)
    if (this.currentTime() >= this.videoDuration() - 0.05) {
      this.isPlaying.set(false);
    }
  }

  togglePlayPause(): void {
    const video = this.videoPlayerRef.nativeElement;
    const audio = this.audioPlayerRef?.nativeElement; // Get audio element
    
    if (this.isPlaying()) {
      video.pause();
      // Pause selected audio track (if any)
      if (this.selectedAudioIndex() !== -1) {
        const track = this.audioTracks()[this.selectedAudioIndex()];
        const audioEl = document.getElementById('audioPlayer-' + track.id) as HTMLAudioElement | null;
        audioEl?.pause();
      }
    } else {
      // Ensure playback starts within the selected range
      if (video.currentTime >= this.endTime() || video.currentTime < this.startTime()) {
         video.currentTime = this.startTime();
      }
      
      // Sync audio position before playing
    if (this.selectedAudioIndex() !== -1) {
      const track = this.audioTracks()[this.selectedAudioIndex()];
      const audioEl = document.getElementById('audioPlayer-' + track.id) as HTMLAudioElement | null;
      if (audioEl) audioEl.currentTime = video.currentTime;
    }
      
      // Play video first, then audio to minimize sync issues
      video.play().catch(e => {
        if (e.name !== 'AbortError') {
          console.error('Error starting video playback:', e);
        }
      });
      if (this.selectedAudioIndex() !== -1) {
        const track = this.audioTracks()[this.selectedAudioIndex()];
        const audioEl = document.getElementById('audioPlayer-' + track.id) as HTMLAudioElement | null;
        audioEl?.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.error('Error starting audio playback:', e);
          }
        });
      }
    }
    this.isPlaying.update(val => !val);
  }

  /**
   * Generates a single frame from the video at the given time.
   * @param video The HTMLVideoElement to capture from.
   * @param time The timestamp to capture.
   * @returns A promise that resolves to the base64 image data URL.
   */
  private async generateFrame(video: HTMLVideoElement, time: number, width: number, height: number): Promise<string | null> {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    
    // Set current time and wait for seeked event to ensure frame is loaded
    await new Promise<void>((resolve) => {
      // Use a timeout fallback in case 'seeked' doesn't fire (e.g., if already at that time)
      let resolved = false;
      const onSeeked = () => {
        if (resolved) return;
        resolved = true;
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      
      // Listen for seeked event (primary mechanism)
      video.addEventListener('seeked', onSeeked);
      
      // Set the time
      video.currentTime = time;

      // Fallback: If seeked doesn't fire within a short time, resolve anyway
      setTimeout(() => {
        if (!resolved) {
          onSeeked(); // Will resolve and remove listener
        }
      }, 300); // 300ms fallback timeout
    });

    if (!ctx) return null;
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Draw the frame
    try {
      ctx.drawImage(video, 0, 0, width, height);
      // Return high-quality JPEG
      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (e) {
      console.error("Error drawing video frame to canvas:", e);
      return null;
    }
  }

  // --- Thumbnail Generation Logic (Fixed) ---

  private async generateThumbnails(video: HTMLVideoElement): Promise<void> {
    this.isGenerating.set(true);
    const duration = video.duration;
    const interval = duration / this.numThumbnails; 
    
    const thumbnailWidth = 100;
    // Calculate proportional height based on video metadata
    const thumbnailHeight = video.videoHeight > 0 
      ? (video.videoHeight / video.videoWidth) * thumbnailWidth 
      : thumbnailWidth * (9 / 16); // Fallback to 16:9

    const generatedThumbnails: Thumbnail[] = [];
    const originalTime = video.currentTime;

    for (let i = 0; i < this.numThumbnails; i++) {
      // Use Math.min to ensure the last frame is captured even with floating point errors
      const time = Math.min(duration, i * interval); 
      
      const src = await this.generateFrame(video, time, thumbnailWidth, thumbnailHeight);

      if (src) {
        generatedThumbnails.push({
          time: time,
          src: src,
        });
      }
    }
    
    // Restore video playback position
    video.currentTime = originalTime;
    this.thumbnails.set(generatedThumbnails);
    this.isGenerating.set(false);
  }

  // --- Frame Capture Logic (for drag preview - Fixed) ---

  async captureFrame(time: number, mouseX: number): Promise<void> {
    // Prevent capture if generating thumbnails or if video isn't ready
    if (this.isGenerating() || this.videoDuration() === 0) return;
    
    const video = this.videoPlayerRef.nativeElement;
    
    if (!video.videoWidth || !video.videoHeight) return;

    const previewWidth = 150;
    const scale = previewWidth / video.videoWidth;
    const h = video.videoHeight * scale;

    // Generate the frame using the new robust helper
    const src = await this.generateFrame(video, time, previewWidth, h);
    
    if (src) {
      this.previewFrameSrc.set(src);
      this.previewBoxLeft.set(this.timelineContainerRef.nativeElement.getBoundingClientRect().left + mouseX);
      this.previewTime.set(time);
    } else {
      this.previewFrameSrc.set(null);
    }
  }

  // --- Timeline Drag Logic (Unified for Mouse and Touch) ---

  // Global listeners are needed to track movement outside the timeline element
  ngAfterViewInit(): void {
    // Using fat arrow functions for binding to 'this'
    window.addEventListener('mousemove', this.handleGlobalMove);
    window.addEventListener('mouseup', this.handleDragEnd);
    window.addEventListener('touchmove', this.handleGlobalMove);
    window.addEventListener('touchend', this.handleTouchEnd);
  }

  ngOnDestroy(): void {
    window.removeEventListener('mousemove', this.handleGlobalMove);
    window.removeEventListener('mouseup', this.handleDragEnd);
    window.removeEventListener('touchmove', this.handleGlobalMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    
    // Clean up media URLs object to prevent memory leaks
    if (this.videoSrc()) {
      URL.revokeObjectURL(this.videoSrc()!);
    }
    if (this.audioSrc()) {
      URL.revokeObjectURL(this.audioSrc()!);
    }
    // Revoke any object URLs created for multi-track uploads
    for (const t of this.videoTracks()) {
      try { URL.revokeObjectURL(t.src); } catch (e) { /* ignore */ }
    }
    for (const a of this.audioTracks()) {
      try { URL.revokeObjectURL(a.src); } catch (e) { /* ignore */ }
    }
  }

  // Using bound methods for event listeners to maintain 'this' context
  handleGlobalMove = (event: MouseEvent | TouchEvent): void => {
  const handleType = this.isDragging();
  const selectedVideo = this.videoTracks()[this.selectedVideoIndex()];
  if (!handleType || !selectedVideo || this.videoDuration() === 0) return;

    let clientX: number;
    if ('touches' in event) {
        if (event.touches.length === 0) return;
        clientX = event.touches[0].clientX;
    } else {
        clientX = event.clientX;
    }
    
    this.updateTimeFromClientX(clientX, handleType);
  }

  handleDragEnd = (): void => {
    if (this.isDragging()) {
      this.isDragging.set(null);
      this.previewFrameSrc.set(null); 
      
      // FIX: Resume playback if it was playing before drag started
      if (this.wasPlayingBeforeDrag()) {
        this.videoPlayerRef.nativeElement.play().catch(e => {
          // Catch and ignore the AbortError specifically
          if (e.name !== 'AbortError') {
            console.error('Error resuming video playback:', e);
          }
        });
        // Resume selected audio track (if present)
        if (this.selectedAudioIndex() !== -1) {
          const track = this.audioTracks()[this.selectedAudioIndex()];
          const audioEl = document.getElementById('audioPlayer-' + track.id) as HTMLAudioElement | null;
          audioEl?.play().catch(e => {
            if (e.name !== 'AbortError') console.error('Error resuming audio playback:', e);
          });
        }
        this.isPlaying.set(true); // Reset state
      }
      this.wasPlayingBeforeDrag.set(false); // Reset state
    }
  }

  handleTouchEnd = (): void => {
    this.handleDragEnd(); 
  }

  handleDragStart(handleType: 'start' | 'end' | 'timeline', event: MouseEvent): void {
    const selectedVideo = this.videoTracks()[this.selectedVideoIndex()];
    if (!selectedVideo || this.videoDuration() === 0 || this.isGenerating()) return;
    event.preventDefault(); 
    
    // FIX: Store playback state and pause if playing (prevents AbortError)
    if (this.isPlaying()) {
      this.wasPlayingBeforeDrag.set(true);
      this.videoPlayerRef.nativeElement.pause();
      this.audioPlayerRef?.nativeElement.pause(); // PAUSE AUDIO
      this.isPlaying.set(false); // Update internal state immediately
    } else {
      this.wasPlayingBeforeDrag.set(false);
    }

    this.isDragging.set(handleType);
    
    // Immediately update on drag start
    this.updateTimeFromClientX(event.clientX, handleType); 
  }

  handleTouchStart(handleType: 'start' | 'end' | 'timeline', event: TouchEvent): void {
    const selectedVideo = this.videoTracks()[this.selectedVideoIndex()];
    if (!selectedVideo || this.videoDuration() === 0 || this.isGenerating()) return;
    event.preventDefault(); 

    // FIX: Store playback state and pause if playing (prevents AbortError)
    if (this.isPlaying()) {
      this.wasPlayingBeforeDrag.set(true);
      this.videoPlayerRef.nativeElement.pause();
      this.audioPlayerRef?.nativeElement.pause(); // PAUSE AUDIO
      this.isPlaying.set(false); // Update internal state immediately
    } else {
      this.wasPlayingBeforeDrag.set(false);
    }
    
    this.isDragging.set(handleType);

    // Immediately update on touch start
    if (event.touches.length > 0) {
      this.updateTimeFromClientX(event.touches[0].clientX, handleType);
    }
  }

private async updateTimeFromClientX(clientX: number, handleType: 'start' | 'end' | 'timeline'): Promise<void> {
     const container = this.timelineContainerRef.nativeElement;
     const rect = container.getBoundingClientRect();
          // Calculate position relative to the timeline container
     let x = clientX - rect.left;
          // Clamp x value within container bounds
     x = Math.min(Math.max(0, x), rect.width);
          const percent = x / rect.width;
     const time = percent * this.videoDuration();
      // 1. Update the time markers and capture frame for preview
     // NOTE: Because we explicitly pause playback in dragStart, this seek 
     // will not cause an AbortError.
     await this.captureFrame(time, x);
      const video = this.videoPlayerRef.nativeElement;
     const audio = this.audioPlayerRef?.nativeElement;
     const MIN_RANGE = 0.5; // Minimum clip duration (0.5 seconds)
      if (handleType === 'start') {
       // Start time cannot exceed (End Time - MIN_RANGE)
       const maxTime = this.endTime() - MIN_RANGE;
        const newTime = Math.min(time, maxTime);
       this.startTime.set(newTime);
              // Update video current time immediately
       if (video.currentTime !== newTime) {
         video.currentTime = newTime;
         if (audio) { audio.currentTime = newTime; } // SYNC AUDIO
       }
       this.currentTime.set(newTime); // Update signal immediately
      } else if (handleType === 'end') {
       // End time cannot be less than (Start Time + MIN_RANGE)
       const minTime = this.startTime() + MIN_RANGE;
       const newTime = Math.max(time, minTime);
       this.endTime.set(newTime);
              // Update video current time immediately
       if (video.currentTime !== newTime) {
         video.currentTime = newTime;
         if (audio) { audio.currentTime = newTime; } // SYNC AUDIO
       }
       this.currentTime.set(newTime); // Update signal immediately
      } else if (handleType === 'timeline') {
       // Seeking the current playback position
       video.currentTime = time;
       if (audio) { audio.currentTime = time; } // SYNC AUDIO
     }
   }
  //new code end----------------------------------------------------------------------------------------


}//class end