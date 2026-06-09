// src/lib/api/alerts.ts

import { config } from '@/lib/config/environment';
import type {
  AlertEmailTemplate,
  TemplateCreateRequest,
  TemplateUpdateRequest,
  TemplatesApiResponse,
  AlertHistory,
  AlertHistoryApiResponse,
} from '@/types/alerts';

const ALERT_API_BASE = `${config.api.sensorApiUrl}/api/alert/v1`;

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

export const alertTemplateApi = {
  /**
   * テンプレート一覧を取得
   * GET /api/alert/v1/tenants/{tenant-id}/places/{area}/{spot}/alert-email-templates
   */
  list: async (
    tenantId: string,
    area: number,
    spot: number,
    params?: {
      sensor_code_definition_id?: number;
      is_default?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<TemplatesApiResponse> => {
    const queryParams = new URLSearchParams();
    
    if (params?.sensor_code_definition_id !== undefined) {
      queryParams.append('sensor_code_definition_id', params.sensor_code_definition_id.toString());
    }
    if (params?.is_default !== undefined) {
      queryParams.append('is_default', params.is_default.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset) {
      queryParams.append('offset', params.offset.toString());
    }

    const url = `${ALERT_API_BASE}/tenants/${tenantId}/places/${area}/${spot}/alert-email-templates?${queryParams.toString()}`;
    
    console.log('Fetching alert templates:', {
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

      return handleResponse<TemplatesApiResponse>(response);
    } catch (error) {
      console.error('Failed to fetch alert templates:', error);
      throw error;
    }
  },

  /**
   * 特定のテンプレートを取得
   * GET /api/alert/v1/tenants/{tenant-id}/alert-email-templates/{id}
   */
  get: async (tenantId: string, id: number): Promise<AlertEmailTemplate> => {
    const url = `${ALERT_API_BASE}/tenants/${tenantId}/alert-email-templates/${id}`;
    
    console.log('Fetching alert template:', { url, tenantId, id });
    
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    return handleResponse<AlertEmailTemplate>(response);
  },

  /**
   * テンプレートを作成
   * POST /api/alert/v1/tenants/{tenant-id}/places/{area}/{spot}/alert-email-templates
   */
  create: async (
    tenantId: string,
    area: number,
    spot: number,
    data: TemplateCreateRequest
  ): Promise<AlertEmailTemplate> => {
    const url = `${ALERT_API_BASE}/tenants/${tenantId}/places/${area}/${spot}/alert-email-templates`;
    
    console.log('Creating alert template:', { url, tenantId, area, spot, data });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<AlertEmailTemplate>(response);
  },

  /**
   * テンプレートを更新
   * PUT /api/alert/v1/tenants/{tenant-id}/alert-email-templates/{id}
   */
  update: async (
    tenantId: string,
    id: number,
    data: TemplateUpdateRequest
  ): Promise<AlertEmailTemplate> => {
    const url = `${ALERT_API_BASE}/tenants/${tenantId}/alert-email-templates/${id}`;
    
    console.log('Updating alert template:', { url, tenantId, id, data });
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<AlertEmailTemplate>(response);
  },

  /**
   * テンプレートを削除
   * DELETE /api/alert/v1/tenants/{tenant-id}/alert-email-templates/{id}
   */
  delete: async (tenantId: string, id: number): Promise<{ message: string }> => {
    const url = `${ALERT_API_BASE}/tenants/${tenantId}/alert-email-templates/${id}`;
    
    console.log('Deleting alert template:', { url, tenantId, id });
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    return handleResponse<{ message: string }>(response);
  },
};

// ===========================
// アラート履歴API
// ===========================

export const alertHistoryApi = {
  /**
   * アラート履歴一覧を取得
   * GET /api/alert/v1/tenants/{tenant-id}/alert-history
   */
  list: async (
    tenantId: string,
    params?: {
      area?: number;
      spot?: number;
      sensor_code_definition_id?: number;
      threshold_type?: 'UPPER' | 'LOWER';
      alert_level?: string;
      email_sent?: boolean;
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<AlertHistoryApiResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.area !== undefined) {
      queryParams.append('area', params.area.toString());
    }
    if (params?.spot !== undefined) {
      queryParams.append('spot', params.spot.toString());
    }
    if (params?.sensor_code_definition_id !== undefined) {
      queryParams.append('sensor_code_definition_id', params.sensor_code_definition_id.toString());
    }
    if (params?.threshold_type) {
      queryParams.append('threshold_type', params.threshold_type);
    }
    if (params?.alert_level) {
      queryParams.append('alert_level', params.alert_level);
    }
    if (params?.email_sent !== undefined) {
      queryParams.append('email_sent', params.email_sent.toString());
    }
    if (params?.start_date) {
      queryParams.append('start_date', params.start_date);
    }
    if (params?.end_date) {
      queryParams.append('end_date', params.end_date);
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset) {
      queryParams.append('offset', params.offset.toString());
    }

    const url = `${ALERT_API_BASE}/tenants/${tenantId}/alert-history?${queryParams.toString()}`;

    console.log('Fetching alert history:', {
      url,
      tenantId,
      params,
    });

    try {
      const response = await fetch(url, {
        headers: getHeaders(),
      });

      return handleResponse<AlertHistoryApiResponse>(response);
    } catch (error) {
      console.error('Failed to fetch alert history:', error);
      throw error;
    }
  },

  /**
   * 特定のアラート履歴を取得
   * GET /api/alert/v1/tenants/{tenant-id}/alert-history/{id}
   */
  get: async (tenantId: string, id: number): Promise<AlertHistory> => {
    const url = `${ALERT_API_BASE}/tenants/${tenantId}/alert-history/${id}`;

    console.log('Fetching alert history detail:', { url, tenantId, id });

    try {
      const response = await fetch(url, {
        headers: getHeaders(),
      });

      return handleResponse<AlertHistory>(response);
    } catch (error) {
      console.error('Failed to fetch alert history detail:', error);
      throw error;
    }
  },
};