import { Injectable } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SourceAssetService } from '../../common/services/source-asset.service';
import { GalleryService } from '../../gallery/gallery.service';
import { NodeTypes } from '../workflow.models';
import { STEP_CONFIGS_MAP } from './step-configs.map';

@Injectable({
  providedIn: 'root'
})
export class MediaResolutionService {

  constructor(
    private galleryService: GalleryService,
    private sourceAssetService: SourceAssetService
  ) { }

  /**
   * Resolves media URLs for the given step entries.
   * @param stepEntries The execution details step entries.
   * @param stepTypeMap A map of stepId -> stepType (NodeTypes | string).
   * @param mediaUrlMap The map to populate with resolved URLs.
   */
  resolveMediaUrls(stepEntries: any[], stepTypeMap: Map<string, NodeTypes | string>, mediaUrlMap: Map<number, string>): void {
    if (!stepEntries) return;

    const mediaItemIds = new Set<number>();
    const sourceAssetIds = new Set<number>();

    stepEntries.forEach((step: any) => {
      const type = stepTypeMap.get(step.step_id);
      if (!type) return;

      const config = STEP_CONFIGS_MAP[type as keyof typeof STEP_CONFIGS_MAP];
      if (!config) return;

      // Helper to process inputs/outputs
      const processIO = (ioConfig: any[], sourceData: any) => {
        if (!sourceData) return;
        ioConfig.forEach(item => {
          if (['image', 'audio', 'video'].includes(item.type)) {
            this.collectMediaIds(sourceData[item.name], mediaItemIds, sourceAssetIds);
          }
        });
      };

      if (config.outputs) processIO(config.outputs, step.step_outputs);
      if (config.inputs) processIO(config.inputs, step.step_inputs);
    });

    // Filter out already resolved IDs
    const mediaIdsToFetch = Array.from(mediaItemIds).filter(id => !mediaUrlMap.has(id));
    const sourceIdsToFetch = Array.from(sourceAssetIds).filter(id => !mediaUrlMap.has(id));

    if (mediaIdsToFetch.length === 0 && sourceIdsToFetch.length === 0) return;

    const requests = [
      ...mediaIdsToFetch.map(id =>
        this.galleryService.getMedia(id).pipe(
          map(mediaItem => ({ id, url: mediaItem.presignedUrls?.[0] })),
          catchError(err => {
            console.error(`Failed to resolve media ID ${id}`, err);
            return of(null);
          })
        )
      ),
      ...sourceIdsToFetch.map(id =>
        this.sourceAssetService.getAsset(id).pipe(
          map(asset => ({ id, url: asset.presignedUrl })),
          catchError(err => {
            console.error(`Failed to resolve source asset ID ${id}`, err);
            return of(null);
          })
        )
      )
    ];

    // Execute all requests in parallel
    forkJoin(requests).subscribe(results => {
      results.forEach(result => {
        if (result && result.url) {
          mediaUrlMap.set(result.id, result.url);
        }
      });
    });
  }

  private collectMediaIds(val: any, mediaItemIds: Set<number>, sourceAssetIds: Set<number>): void {
    if (!val) return;

    if (typeof val === 'number') {
      mediaItemIds.add(val);
    } else if (Array.isArray(val)) {
      val.forEach(v => this.collectMediaIds(v, mediaItemIds, sourceAssetIds));
    } else if (typeof val === 'object') {
      if (val.sourceAssetId) {
        sourceAssetIds.add(val.sourceAssetId);
      } else if (val.sourceMediaItem?.mediaItemId) {
        mediaItemIds.add(val.sourceMediaItem.mediaItemId);
      }
    }
  }
}
