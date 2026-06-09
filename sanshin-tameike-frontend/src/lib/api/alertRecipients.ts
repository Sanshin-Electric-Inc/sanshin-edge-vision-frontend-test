// src/lib/api/alertRecipients.ts

import { config } from '@/lib/config/environment';
import type {
  AlertRecipient,
  AlertRecipientCreateRequest,
  AlertRecipientUpdateRequest,
  AlertRecipientListResponse,
} from '@/types/alertRecipients';

const ALERT_API_BASE = `${config.api.alertApiUrl || config.api.sensorApiUrl}/api/alert/v1`;

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

export const alertRecipientApi = {
  /**
   * 配信先一覧を取得
   * GET /api/alert/v1/tenants/{tenant-id}/alert-recipients
   */
  list: async (
    tenantId: string,
    params?: {
      is_active?: boolean;
      email?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<AlertRecipientListResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.is_active !== undefined) {
      queryParams.append('is_active', params.is_active.toString());
    }
    if (params?.email) {
      queryParams.append('email', params.email);
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset) {
      queryParams.append('offset', params.offset.toString());
    }

    const url = `${ALERT_API_BASE}/tenants/${tenantId}/alert-recipients?${queryParams.toString()}`;

    console.log('Fetching alert recipients:', { url, tenantId, params });

    try {
      const response = await fetch(url, {
        headers: getHeaders(),
      });

      return handleResponse<AlertRecipientListResponse>(response);
    } catch (error) {
      console.error('Failed to fetch alert recipients:', error);
      throw error;
    }
  },

  /**
   * 特定の配信先を取得
   * GET /api/alert/v1/tenants/{tenant-id}/alert-recipients/{id}
   */
  get: async (tenantId: string, id: number): Promise<AlertRecipient> => {
    const url = `${ALERT_API_BASE}/tenants/${tenantId}/alert-recipients/${id}`;

    console.log('Fetching alert recipient:', { url, tenantId, id });

    const response = await fetch(url, {
      headers: getHeaders(),
    });

    return handleResponse<AlertRecipient>(response);
  },

  /**
   * 配信先を作成
   * POST /api/alert/v1/tenants/{tenant-id}/alert-recipients
   */
  create: async (
    tenantId: string,
    data: AlertRecipientCreateRequest
  ): Promise<AlertRecipient> => {
    const url = `${ALERT_API_BASE}/tenants/${tenantId}/alert-recipients`;

    console.log('Creating alert recipient:', { url, tenantId, data });

    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<AlertRecipient>(response);
  },

  /**
   * 配信先を更新
   * PUT /api/alert/v1/tenants/{tenant-id}/alert-recipients/{id}
   */
  update: async (
    tenantId: string,
    id: number,
    data: AlertRecipientUpdateRequest
  ): Promise<AlertRecipient> => {
    const url = `${ALERT_API_BASE}/tenants/${tenantId}/alert-recipients/${id}`;

    console.log('Updating alert recipient:', { url, tenantId, id, data });

    const response = await fetch(url, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<AlertRecipient>(response);
  },

  /**
   * 配信先を削除
   * DELETE /api/alert/v1/tenants/{tenant-id}/alert-recipients/{id}
   */
  delete: async (tenantId: string, id: number): Promise<{ message: string }> => {
    const url = `${ALERT_API_BASE}/tenants/${tenantId}/alert-recipients/${id}`;

    console.log('Deleting alert recipient:', { url, tenantId, id });

    const response = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    return handleResponse<{ message: string }>(response);
  },
};
