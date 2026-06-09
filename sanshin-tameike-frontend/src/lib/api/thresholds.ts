// src/lib/api/thresholds.ts

import { config } from '@/lib/config/environment';
import type {
  SensorThreshold,
  ThresholdCreateRequest,
  ThresholdUpdateRequest,
  ThresholdsApiResponse,
} from '@/types/thresholds';

const API_BASE = `${config.api.sensorApiUrl}/api/sensor/v1`;

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

export const thresholdApi = {
  /**
   * 閾値一覧を取得
   * GET /api/sensor/v1/tenants/{tenant-id}/places/{area}/{spot}/sensor-thresholds
   */
  list: async (
    tenantId: string,
    area: number,
    spot: number,
    params?: {
      sensor_code_definition_id?: number;
      is_active?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<ThresholdsApiResponse> => {
    const queryParams = new URLSearchParams();
    
    if (params?.sensor_code_definition_id !== undefined) {
      queryParams.append('sensor_code_definition_id', params.sensor_code_definition_id.toString());
    }
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', params.is_active.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset) {
      queryParams.append('offset', params.offset.toString());
    }

    const url = `${API_BASE}/tenants/${tenantId}/places/${area}/${spot}/sensor-thresholds?${queryParams.toString()}`;
    
    console.log('Fetching thresholds:', {
      url,
      tenantId,
      area,
      spot,
      params,
    });

    try {
      const response = await fetch(url, {
        headers: getHeaders(),
      });

      return handleResponse<ThresholdsApiResponse>(response);
    } catch (error) {
      console.error('Failed to fetch thresholds:', error);
      throw error;
    }
  },

  /**
   * 特定の閾値を取得
   * GET /api/sensor/v1/tenants/{tenant-id}/sensor-thresholds/{id}
   */
  get: async (tenantId: string, id: number): Promise<SensorThreshold> => {
    const url = `${API_BASE}/tenants/${tenantId}/sensor-thresholds/${id}`;
    
    console.log('Fetching threshold:', { url, tenantId, id });
    
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    return handleResponse<SensorThreshold>(response);
  },

  /**
   * 閾値を作成
   * POST /api/sensor/v1/tenants/{tenant-id}/places/{area}/{spot}/sensor-thresholds
   */
  create: async (
    tenantId: string,
    area: number,
    spot: number,
    data: ThresholdCreateRequest
  ): Promise<SensorThreshold> => {
    const url = `${API_BASE}/tenants/${tenantId}/places/${area}/${spot}/sensor-thresholds`;
    
    console.log('Creating threshold:', { url, tenantId, area, spot, data });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<SensorThreshold>(response);
  },

  /**
   * 閾値を更新
   * PUT /api/sensor/v1/tenants/{tenant-id}/sensor-thresholds/{id}
   */
  update: async (
    tenantId: string,
    id: number,
    data: ThresholdUpdateRequest
  ): Promise<SensorThreshold> => {
    const url = `${API_BASE}/tenants/${tenantId}/sensor-thresholds/${id}`;
    
    console.log('Updating threshold:', { url, tenantId, id, data });
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<SensorThreshold>(response);
  },

  /**
   * 閾値を削除
   * DELETE /api/sensor/v1/tenants/{tenant-id}/sensor-thresholds/{id}
   */
  delete: async (tenantId: string, id: number): Promise<{ message: string }> => {
    const url = `${API_BASE}/tenants/${tenantId}/sensor-thresholds/${id}`;
    
    console.log('Deleting threshold:', { url, tenantId, id });
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    return handleResponse<{ message: string }>(response);
  },
};