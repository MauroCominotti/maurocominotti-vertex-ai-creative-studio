/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type ImagenRequest = {
  prompt: string;
  generationModel: string;
  aspectRatio: string;
  numberOfMedia: number;
  style: string;
  negativePrompt: string;
  colorAndTone?: string;
  lighting?: string;
  composition?: string;
  addWatermark: boolean;
  upscaleFactor?: '' | 'x2' | 'x4';
  sourceAssetIds?: string[];
  sourceMediaItems?: SourceMediaItemLink[];
  workspaceId?: string;
};

export type SourceMediaItemLink = {
  mediaItemId: string;
  mediaIndex: number;
  role: string;
};

export type VeoRequest = {
  prompt: string;
  generationModel: string;
  aspectRatio: string;
  numberOfMedia?: number;
  style: string;
  lighting: string;
  colorAndTone: string;
  composition: string;
  negativePrompt: string;
  generateAudio: boolean;
  durationSeconds: number;
  startImageAssetId?: string;
  endImageAssetId?: string;
  sourceVideoAssetId?: string;
  sourceMediaItems?: SourceMediaItemLink[];
  workspaceId?: string;
};

export type SearchResponse = {
  summary: any;
  results: SearchResult[];
  totalSize: number;
};

export type SearchResult = {
  document: Document;
};

export type Document = {
  derivedStructData: DocumentData;
};

export type DocumentData = {
  title: string;
  link: string;
  snippets: Snippet[];
  pagemap: PageMap;
};

export type Snippet = {
  snippet: string;
};

export type PageMap = {
  cse_image: ImagesData[];
};

export type ImagesData = {
  src: string;
};

export interface GallerySearchDto {
  limit: number;
  startAfter?: string;
  userEmail?: string;
  mimeType?: string;
  model?: string;
  status?: string;
  workspaceId?: string;
}
