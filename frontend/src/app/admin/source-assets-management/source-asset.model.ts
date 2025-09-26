export enum AssetScopeEnum {
  PRIVATE = 'private', // Belongs to a single user
  SYSTEM = 'system', // Available to all users (e.g., VTO models)
}

export enum AssetTypeEnum {
  GENERIC_IMAGE = 'generic_image',
  GENERIC_VIDEO = 'generic_video',
  VTO_PRODUCT = 'vto_product',
  VTO_PERSON_FEMALE = 'vto_person_female',
  VTO_PERSON_MALE = 'vto_person_male',
  VTO_TOP = 'vto_top',
  VTO_BOTTOM = 'vto_bottom',
  VTO_DRESS = 'vto_dress',
  VTO_SHOE = 'vto_shoe',
}

export interface SourceAsset {
  id?: string;
  description?: string;
  scope: AssetScopeEnum;
  assetType: AssetTypeEnum;
  gcsUri: string;
  presignedUrl?: string;
  originalFilename: string;
  mimeType?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}
