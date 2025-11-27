import {
  Component,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  effect,
  inject,
  OnInit
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
// --- Interfaces ---
interface MediaAsset {
  id: string;
  name: string;
  type: 'video' | 'audio';
  url: string;
  safeUrl: SafeUrl;
  duration: number; // in seconds
  thumbnail?: string;
}

interface TimelineClip {
  id: string;
  assetId: string;
  startTime: number; // absolute time on timeline
  duration: number; // duration of this specific clip (could be trimmed later)
  offset: number; // offset into the original source file
  trackIndex: number; // 0 for video, 1 for audio
  color: string;
}

@Component({
  selector: 'app-workbench',
  templateUrl: './workbench.component.html',
  styleUrls: ['./workbench.component.scss']
})
export class WorkbenchComponent implements OnInit, OnDestroy {
  // Signals for State
  assets = signal<MediaAsset[]>([]);
  timelineClips = signal<TimelineClip[]>([]);
  currentTime = signal<number>(0);
  isPlaying = signal<boolean>(false);
  selectedClipId = signal<string | null>(null);

  // Visual Settings (Lighting & Zoom)
  exposureVal = 100;
  contrastVal = 100;
  saturateVal = 100;
  pixelsPerSecond = 15; // Default reduced from 30 to 15

  // Computed Values
  videoClips = computed(() => this.timelineClips().filter(c => c.trackIndex === 0));
  audioClips = computed(() => this.timelineClips().filter(c => c.trackIndex === 1));
  
  videoTrackEnd = computed(() => {
      const clips = this.videoClips();
      return clips.length > 0 ? Math.max(...clips.map(c => c.startTime + c.duration)) : 0;
  });

  totalDuration = computed(() => {
    if (this.timelineClips().length === 0) return 0;
    return Math.max(...this.timelineClips().map(c => c.startTime + c.duration));
  });

  timelineWidth = computed(() => {
    // Ensure timeline is at least screen width or longer based on content
    return Math.max(this.totalDuration() * this.pixelsPerSecond + 800, 2000); 
  });

  // derived signals for active source logic
  activeVideoClip = computed(() => {
    const time = this.currentTime();
    return this.videoClips().find(c => time >= c.startTime && time < c.startTime + c.duration);
  });

  activeAudioClip = computed(() => {
    const time = this.currentTime();
    return this.audioClips().find(c => time >= c.startTime && time < c.startTime + c.duration);
  });

  activeVideoSrc = computed(() => {
    const clip = this.activeVideoClip();
    if (!clip) return '';
    const asset = this.assets().find(a => a.id === clip.assetId);
    return asset ? asset.safeUrl : '';
  });

  activeAudioSrc = computed(() => {
    const clip = this.activeAudioClip();
    if (!clip) return '';
    const asset = this.assets().find(a => a.id === clip.assetId);
    return asset ? asset.safeUrl : '';
  });

  videoFilter = computed(() => {
      return `brightness(${this.exposureVal}%) contrast(${this.contrastVal}%) saturate(${this.saturateVal}%)`;
  });

  animationFrameId: any;
  
  // View Children
  @ViewChild('mainVideo') mainVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('bgAudio') bgAudio!: ElementRef<HTMLAudioElement>;
  @ViewChild('timelineContainer') timelineContainer!: ElementRef<HTMLDivElement>;

  // Services
  private sanitizer = inject(DomSanitizer);

  // Trimming state (for clip in/out adjustments)
  trimState: {
    active: boolean;
    clipId: string;
    type: 'start' | 'end';
    startX: number;
    initialStart: number;
    initialDur: number;
    initialOffset: number;
  } | null = null;

  constructor(
    public matIconRegistry: MatIconRegistry,
  ) {
    this.matIconRegistry
    .addSvgIcon(
        'white-gemini-spark-icon',
        this.setPath(`${this.path}/mobile-white-gemini-spark-icon.svg`),
      )
      .addSvgIcon(
        'mobile-white-gemini-spark-icon',
        this.setPath(`${this.path}/mobile-white-gemini-spark-icon.svg`),
      )
      .addSvgIcon(
        'creative-studio-icon',
        this.setPath(`${this.path}/creative-studio-icon.svg`),
      )
      .addSvgIcon(
        'fun-templates-icon',
        this.setPath(`${this.path}/fun-templates-icon.svg`),
      )
      .addSvgIcon(
        'video-clap-icon',
        this.setPath(`${this.path}/video-clap-icon.svg`),
      )
      .addSvgIcon(
        'movie-shallow-icon',
        this.setPath(`${this.path}/movie-clap-shallow-icon.svg`),
      )
      .addSvgIcon(
        'volume-off-icon',
        this.setPath(`${this.path}/volume-off-icon.svg`),
      )
      .addSvgIcon(
        'upload-icon',
        this.setPath(`${this.path}/upload-icon.svg`),
      )
      .addSvgIcon(
        'sound-sensing-icon',
        this.setPath(`${this.path}/sound-sensing-icon.svg`),
      )
      .addSvgIcon(
        'lock-icon',
        this.setPath(`${this.path}/lock-icon.svg`),
      )
      .addSvgIcon(
        'img-icon',
        this.setPath(`${this.path}/img-icon.svg`),
      )
      .addSvgIcon(
        'eye-icon',
        this.setPath(`${this.path}/eye-icon.svg`),
      )
      .addSvgIcon(
        'drive-icon',
        this.setPath(`${this.path}/drive-icon.svg`),
      )
      .addSvgIcon(
        'audio-magic-eraser-icon',
        this.setPath(`${this.path}/audio_magic_eraser-icon.svg`),
      )
      .addSvgIcon(
        'play-arrow-icon',
        this.setPath(`${this.path}/play-arrow-icon.svg`),
      );

    // Setup an effect to handle video seeking/sync when active clip changes or time jumps
    effect(() => {
      const vid = this.mainVideo?.nativeElement;
      const aud = this.bgAudio?.nativeElement;
      const vClip = this.activeVideoClip();
      const aClip = this.activeAudioClip();
      const curTime = this.currentTime();

      // Video Sync
      if (vid && vClip) {
        const fileTime = (curTime - vClip.startTime) + vClip.offset;
        if (Math.abs(vid.currentTime - fileTime) > 0.5) vid.currentTime = fileTime;
        if (this.isPlaying() && vid.paused) vid.play().catch(() => {});
        if (!this.isPlaying() && !vid.paused) vid.pause();
      } else if (vid) {
        vid.pause();
      }

      // Audio Sync
      if (aud && aClip) {
        const fileTime = (curTime - aClip.startTime) + aClip.offset;
        if (Math.abs(aud.currentTime - fileTime) > 0.5) aud.currentTime = fileTime;
        if (this.isPlaying() && aud.paused) aud.play().catch(() => {});
        if (!this.isPlaying() && !aud.paused) aud.pause();
      } else if (aud) {
        aud.pause();
      }
    });
  }

  private path = '../../../assets/images';

  private setPath(url: string): SafeResourceUrl {
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }

  ngOnInit() {}
  
  ngOnDestroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  // --- Logic: File Handling ---

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    Array.from(input.files).forEach(file => {
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      if (!isVideo && !isAudio) return;

      const objectUrl = URL.createObjectURL(file);
      const id = Math.random().toString(36).substr(2, 9);
      
      const asset: MediaAsset = {
        id,
        name: file.name,
        type: isVideo ? 'video' : 'audio',
        url: objectUrl,
        // FIXED: Reverted to bypassSecurityTrustResourceUrl as requested by user
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl),
        duration: 0,
      };

      this.assets.update(prev => [...prev, asset]);

      if (isVideo) {
        this.extractVideoMetadata(asset, file);
      } else {
        this.extractAudioMetadata(asset);
      }
    });
    
    input.value = '';
  }

  extractVideoMetadata(asset: MediaAsset, file: File) {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = asset.url;
    video.onloadedmetadata = () => {
      this.updateAssetDuration(asset.id, video.duration);
      video.currentTime = Math.min(1, video.duration / 4);
    };
    
    video.onseeked = () => {
       const canvas = document.createElement('canvas');
       canvas.width = 160;
       canvas.height = 90;
       const ctx = canvas.getContext('2d');
       if (ctx) {
           ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
           const thumbUrl = canvas.toDataURL('image/jpeg');
           this.assets.update(items => items.map(i => i.id === asset.id ? {...i, thumbnail: thumbUrl} : i));
       }
    };
  }

  extractAudioMetadata(asset: MediaAsset) {
    const audio = new Audio(asset.url);
    audio.onloadedmetadata = () => {
        this.updateAssetDuration(asset.id, audio.duration);
    };
  }

  updateAssetDuration(id: string, duration: number) {
    this.assets.update(items => items.map(i => i.id === id ? {...i, duration} : i));
    this.timelineClips.update(clips => clips.map(clip => clip.assetId === id ? { ...clip, duration } : clip));
    this.refreshTimelineLayout();
  }

  refreshTimelineLayout() {
      this.timelineClips.update(clips => {
          const vClips = clips.filter(c => c.trackIndex === 0);
          const aClips = clips.filter(c => c.trackIndex === 1);
          const otherClips = clips.filter(c => c.trackIndex !== 0 && c.trackIndex !== 1);

          const layoutTrack = (trackClips: TimelineClip[]) => {
            let currentTime = 0;
            return trackClips.map(clip => {
                const newClip = { ...clip, startTime: currentTime };
                currentTime += clip.duration;
                return newClip;
            });
          };

          return [...layoutTrack(vClips), ...layoutTrack(aClips), ...otherClips];
      });
  }

  getAssetThumbnail(id: string): string | undefined {
      return this.assets().find(a => a.id === id)?.thumbnail;
  }

  getAssetName(id: string): string {
      return this.assets().find(a => a.id === id)?.name || 'Clip';
  }

  isAssetVideo(id: string): boolean {
     return this.assets().find(a => a.id === id)?.type === 'video';
  }

  // --- Logic: Timeline ---

  addToTimeline(asset: MediaAsset) {
    const clipsToAdd: TimelineClip[] = [];
    const assetColor = this.getRandomColor();

    if (asset.type === 'video') {
      const vClips = this.timelineClips().filter(c => c.trackIndex === 0);
      const vStartTime = vClips.length > 0 ? Math.max(...vClips.map(c => c.startTime + c.duration)) : 0;
      
      clipsToAdd.push({
        id: Math.random().toString(36).substr(2, 9),
        assetId: asset.id,
        startTime: vStartTime,
        duration: asset.duration,
        offset: 0,
        trackIndex: 0,
        color: assetColor
      });
    }

    const aClips = this.timelineClips().filter(c => c.trackIndex === 1);
    const aStartTime = aClips.length > 0 ? Math.max(...aClips.map(c => c.startTime + c.duration)) : 0;

    clipsToAdd.push({
        id: Math.random().toString(36).substr(2, 9),
        assetId: asset.id,
        startTime: aStartTime,
        duration: asset.duration,
        offset: 0,
        trackIndex: 1,
        color: asset.type === 'video' ? '#10b981' : '#10b981' 
    });

    this.timelineClips.update(prev => [...prev, ...clipsToAdd]);
  }

  selectClip(id: string, event: MouseEvent) {
    event.stopPropagation();
    this.selectedClipId.set(id);
  }

  deleteSelectedClip() {
    const id = this.selectedClipId();
    if (!id) return;
    this.timelineClips.update(prev => prev.filter(c => c.id !== id));
    this.selectedClipId.set(null);
    this.refreshTimelineLayout();
  }

  // --- Split Logic ---
  canSplit(): boolean {
    const id = this.selectedClipId();
    if (!id) return false;
    const clip = this.timelineClips().find(c => c.id === id);
    if (!clip) return false;
    const time = this.currentTime();
    return time > clip.startTime + 0.1 && time < clip.startTime + clip.duration - 0.1;
  }

  splitSelectedClip(): void {
    if (!this.canSplit()) return;
    const id = this.selectedClipId();
    const clip = this.timelineClips().find(c => c.id === id)!;
    const splitPoint = this.currentTime() - clip.startTime;

    const clip1Duration = splitPoint;
    const clip2Duration = clip.duration - splitPoint;
    const clip2Offset = clip.offset + splitPoint;

    const clip2: TimelineClip = {
      ...clip,
      id: Math.random().toString(36).substr(2, 9),
      duration: clip2Duration,
      offset: clip2Offset,
      startTime: clip.startTime + splitPoint
    };

    this.timelineClips.update(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, duration: clip1Duration } : c);
      return [...updated, clip2];
    });

    this.selectedClipId.set(clip2.id);
    this.refreshTimelineLayout();
  }

  // --- Logic: Playback Loop ---

  togglePlay() {
    this.isPlaying.set(!this.isPlaying());
    if (this.isPlaying()) {
        this.runGameLoop();
    } else {
        cancelAnimationFrame(this.animationFrameId);
    }
  }

  runGameLoop() {
      let lastTime = performance.now();
      const loop = (now: number) => {
          if (!this.isPlaying()) return;
          const dt = (now - lastTime) / 1000; 
          lastTime = now;
          const nextTime = this.currentTime() + dt;
          
          // 1. Auto Scroll Logic
          if (this.timelineContainer?.nativeElement) {
              const container = this.timelineContainer.nativeElement;
              const playheadPos = nextTime * this.pixelsPerSecond;
              const containerWidth = container.clientWidth;
              const scrollLeft = container.scrollLeft;
              
              // If playhead goes past 80% of visible area, scroll forward
              if (playheadPos > scrollLeft + containerWidth * 0.8) {
                   // Smoothly jump scroll to keep playhead at 20%
                   container.scrollLeft = playheadPos - containerWidth * 0.2;
              }
          }

          if (nextTime >= this.totalDuration()) {
              this.currentTime.set(this.totalDuration());
              this.isPlaying.set(false);
          } else {
              this.currentTime.set(nextTime);
              this.animationFrameId = requestAnimationFrame(loop);
          }
      };
      this.animationFrameId = requestAnimationFrame(loop);
  }
  
  onVideoEnded() {}
  onMetadataLoaded() {}

  // --- Interaction ---
  onTimelineMouseDown(event: MouseEvent) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const scrollLeft = (event.currentTarget as HTMLElement).scrollLeft;
      const clickX = event.clientX - rect.left + scrollLeft;
      const time = Math.max(0, clickX / this.pixelsPerSecond);
      this.currentTime.set(time);
      this.selectedClipId.set(null);
  }

    // --- Trimming Logic ---
    startTrim(event: MouseEvent, clip: TimelineClip, type: 'start' | 'end') {
      event.stopPropagation();
      event.preventDefault();
      this.trimState = {
        active: true,
        clipId: clip.id,
        type,
        startX: event.clientX,
        initialStart: clip.startTime,
        initialDur: clip.duration,
        initialOffset: clip.offset
      };
      this.isPlaying.set(false);
    }

    onTrimMove(event: MouseEvent) {
      if (!this.trimState || !this.trimState.active) return;

      const deltaX = event.clientX - this.trimState.startX;
      const deltaTime = deltaX / this.pixelsPerSecond;
      const { clipId, type, initialDur, initialOffset } = this.trimState;

      const clip = this.timelineClips().find(c => c.id === clipId);
      if (!clip) return;
      const asset = this.assets().find(a => a.id === clip.assetId);
      const maxDuration = asset ? asset.duration : 9999;

      this.timelineClips.update(clips => clips.map(c => {
        if (c.id !== clipId) return c;

        let newDur = c.duration;
        let newOffset = c.offset;

        if (type === 'end') {
          newDur = Math.max(0.5, initialDur + deltaTime);
          if (newOffset + newDur > maxDuration) newDur = maxDuration - newOffset;
        } else {
          const change = deltaTime;
          if (change > initialDur - 0.5) {
            newOffset = initialOffset + (initialDur - 0.5);
            newDur = 0.5;
          } else if (initialOffset + change < 0) {
            newOffset = 0;
            newDur = initialDur + initialOffset;
          } else {
            newOffset = initialOffset + change;
            newDur = initialDur - change;
          }
        }

        return { ...c, duration: newDur, offset: newOffset };
      }));
    }

    onTrimEnd() {
      if (this.trimState && this.trimState.active) {
        this.refreshTimelineLayout();
        this.trimState = null;
      }
    }

  // --- Utilities ---

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  timeRulerTicks(): number[] {
    const duration = Math.max(this.totalDuration(), 60);
    const ticks = [];
    for(let i=0; i <= duration; i+=5) ticks.push(i);
    return ticks;
  }

  getRandomColor() {
    return '#3b82f6';
  }

  getRandomHeight(seed: number) {
      // deterministic pseudo random for waveform vis
      return 30 + (Math.sin(seed) * 30 + 30);
  }
}