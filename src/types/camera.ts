// src/types/camera.ts

/**
 * カメラ画像
 */
export interface CameraImage {
  id: number;
  tenant_id: string;
  area: number;
  spot: number;
  camera_code: string;
  image_url: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * カメラ画像アップロードレスポンス
 */
export interface CameraImageUploadResponse {
  id: number;
  tenant_id: string;
  area: number;
  spot: number;
  camera_code: string;
  image_url: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  message: string;
}

/**
 * カメラ画像APIレスポンス
 */
export interface CameraImagesApiResponse {
  count: number;
  data: CameraImage[];
}

/**
 * カメラコード情報
 */
export interface CameraCodeInfo {
  camera_code: string;
  latest_image_created_at: string;
}

/**
 * カメラコード一覧APIレスポンス
 */
export interface CameraCodesResponse {
  count: number;
  data: CameraCodeInfo[];
}

/**
 * カメラ画像一覧APIレスポンス（ページネーション対応）
 */
export interface CameraImageListResponse {
  count: number;
  data: CameraImage[];
  limit: number;
  offset: number;
}
