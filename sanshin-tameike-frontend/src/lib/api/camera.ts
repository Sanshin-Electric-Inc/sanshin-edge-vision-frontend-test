// src/lib/api/camera.ts

import { config } from '@/lib/config/environment';
import type { CameraImage, CameraCodesResponse, CameraImageListResponse } from '@/types/camera';

const SENSOR_API_BASE = `${config.api.sensorApiUrl}/api/sensor/v1`;

// ヘッダー生成ヘルパー
const getHeaders = () => ({
  'x-api-key': config.api.sensorApiKey,
  'Content-Type': 'application/json',
});

// エラーハンドリングヘルパー
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
      url: response.url,
    });

    let errorMessage = `API error: ${response.status}`;
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }

    throw new Error(errorMessage);
  }
  return response.json();
};

export const cameraApi = {
  /**
   * 最新のカメラ画像を取得
   * GET /api/sensor/v1/tenants/{tenant-id}/places/{area}/{spot}/latest-camera-image
   * @returns カメラ画像。画像が存在しない場合はnullを返す
   */
  getLatestImage: async (
    tenantId: string,
    area: number,
    spot: number,
    cameraCode?: string
  ): Promise<CameraImage | null> => {
    const queryParams = new URLSearchParams();

    if (cameraCode) {
      queryParams.append('camera_code', cameraCode);
    }

    const url = `${SENSOR_API_BASE}/tenants/${tenantId}/places/${area}/${spot}/latest-camera-image${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    try {
      const response = await fetch(url, {
        headers: getHeaders(),
      });

      // 404の場合は画像がないだけなので、nullを返す（エラーではない）
      if (response.status === 404) {
        return null;
      }

      // その他のエラーの場合はエラーとして扱う
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: response.url,
        });

        let errorMessage = `API error: ${response.status}`;
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || error.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      // ネットワークエラーなど、本当のエラーの場合のみログ出力
      if (error instanceof Error && !error.message.includes('404')) {
        console.error('Failed to fetch latest camera image:', error);
      }
      throw error;
    }
  },

  /**
   * カメラ画像をアップロード
   * POST /api/sensor/v1/tenants/{tenant-id}/camera-images
   */
  uploadImage: async (
    tenantId: string,
    data: {
      area: number;
      spot: number;
      camera_code: string;
      metadata?: Record<string, unknown>;
      image: File;
    }
  ): Promise<CameraImage> => {
    const url = `${SENSOR_API_BASE}/tenants/${tenantId}/camera-images`;

    console.log('Uploading camera image:', {
      url,
      tenantId,
      area: data.area,
      spot: data.spot,
      camera_code: data.camera_code,
    });

    const formData = new FormData();
    formData.append('area', data.area.toString());
    formData.append('spot', data.spot.toString());
    formData.append('camera_code', data.camera_code);
    if (data.metadata) {
      formData.append('metadata', JSON.stringify(data.metadata));
    }
    formData.append('image', data.image);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': config.api.sensorApiKey,
          // Content-Typeはブラウザが自動で設定するため、指定しない
        },
        body: formData,
      });

      return handleResponse<CameraImage>(response);
    } catch (error) {
      console.error('Failed to upload camera image:', error);
      throw error;
    }
  },

  /**
   * 場所に登録されているカメラコード一覧を取得
   * GET /api/sensor/v1/tenants/{tenant-id}/places/{area}/{spot}/camera-codes
   */
  getCameraCodes: async (
    tenantId: string,
    area: number,
    spot: number
  ): Promise<CameraCodesResponse> => {
    const url = `${SENSOR_API_BASE}/tenants/${tenantId}/places/${area}/${spot}/camera-codes`;

    try {
      const response = await fetch(url, {
        headers: getHeaders(),
      });

      // 404の場合は空の配列を返す（カメラコードが存在しない）
      if (response.status === 404) {
        return { count: 0, data: [] };
      }

      // その他のエラーの場合はエラーとして扱う
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: response.url,
        });

        let errorMessage = `API error: ${response.status}`;
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || error.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      // ネットワークエラーなど、本当のエラーの場合のみログ出力
      if (error instanceof Error && !error.message.includes('404')) {
        console.error('Failed to fetch camera codes:', error);
      }
      throw error;
    }
  },

  /**
   * カメラ画像一覧を取得（ページネーション対応）
   * GET /api/sensor/v1/tenants/{tenant-id}/places/{area}/{spot}/camera-images
   */
  getCameraImages: async (
    tenantId: string,
    area: number,
    spot: number,
    params?: {
      camera_code?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
      order?: 'asc' | 'desc';
    }
  ): Promise<CameraImageListResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.camera_code) {
      queryParams.append('camera_code', params.camera_code);
    }
    if (params?.from) {
      queryParams.append('from', params.from);
    }
    if (params?.to) {
      queryParams.append('to', params.to);
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset) {
      queryParams.append('offset', params.offset.toString());
    }
    if (params?.order) {
      queryParams.append('order', params.order);
    }

    const url = `${SENSOR_API_BASE}/tenants/${tenantId}/places/${area}/${spot}/camera-images${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    try {
      const response = await fetch(url, {
        headers: getHeaders(),
      });

      // 404の場合は空の配列を返す
      if (response.status === 404) {
        return { count: 0, data: [], limit: params?.limit || 50, offset: params?.offset || 0 };
      }

      // その他のエラーの場合はエラーとして扱う
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: response.url,
        });

        let errorMessage = `API error: ${response.status}`;
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || error.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      // ネットワークエラーなど、本当のエラーの場合のみログ出力
      if (error instanceof Error && !error.message.includes('404')) {
        console.error('Failed to fetch camera images:', error);
      }
      throw error;
    }
  },
};
