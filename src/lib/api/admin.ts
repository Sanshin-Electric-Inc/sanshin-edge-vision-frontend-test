// src/lib/api/admin.ts

import { config } from '@/lib/config/environment';
import type {
  Tenant,
  TenantCreateRequest,
  TenantUpdateRequest,
  TenantSettings,
  TenantSettingsUpdateRequest,
  User,
  UserCreateRequest,
  UserUpdateRequest,
  AdminApiResponse,
} from '@/types/admin';

const ADMIN_API_BASE = `${config.api.sensorApiUrl}/api/admin/v1`;

// ヘッダー生成ヘルパー
const getHeaders = () => ({
  'x-api-key': config.api.sensorApiKey,
  'Content-Type': 'application/json',
});

// エラーハンドリングヘルパー
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  return response.json();
};

// ===========================
// Tenant API
// ===========================

export const tenantApi = {
  /**
   * テナント一覧を取得
   */
  list: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<AdminApiResponse<Tenant>> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `${ADMIN_API_BASE}/tenants?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    return handleResponse<AdminApiResponse<Tenant>>(response);
  },

  /**
   * 特定のテナントを取得
   */
  get: async (tenantId: string): Promise<Tenant> => {
    const response = await fetch(`${ADMIN_API_BASE}/tenants/${tenantId}`, {
      headers: getHeaders(),
    });

    return handleResponse<Tenant>(response);
  },

  /**
   * テナントを作成
   */
  create: async (data: TenantCreateRequest): Promise<Tenant> => {
    const response = await fetch(`${ADMIN_API_BASE}/tenants`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<Tenant>(response);
  },

  /**
   * テナントを更新
   */
  update: async (tenantId: string, data: TenantUpdateRequest): Promise<Tenant> => {
    const response = await fetch(`${ADMIN_API_BASE}/tenants/${tenantId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<Tenant>(response);
  },

  /**
   * テナントを削除
   */
  delete: async (tenantId: string): Promise<{ message: string }> => {
    const response = await fetch(`${ADMIN_API_BASE}/tenants/${tenantId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    return handleResponse<{ message: string }>(response);
  },
};

// ===========================
// User API
// ===========================

export const userApi = {
  /**
   * ユーザー一覧を取得
   */
  list: async (
    tenantId: string,
    params?: {
      role_id?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<AdminApiResponse<User>> => {
    const queryParams = new URLSearchParams();
    if (params?.role_id) queryParams.append('role_id', params.role_id.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `${ADMIN_API_BASE}/tenants/${tenantId}/users?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    return handleResponse<AdminApiResponse<User>>(response);
  },

  /**
   * 特定のユーザーを取得
   */
  get: async (tenantId: string, userId: number): Promise<User> => {
    const response = await fetch(
      `${ADMIN_API_BASE}/tenants/${tenantId}/users/${userId}`,
      {
        headers: getHeaders(),
      }
    );

    return handleResponse<User>(response);
  },

  /**
   * ユーザーを作成
   */
  create: async (tenantId: string, data: UserCreateRequest): Promise<User> => {
    const response = await fetch(`${ADMIN_API_BASE}/tenants/${tenantId}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<User>(response);
  },

  /**
   * ユーザーを更新
   */
  update: async (
    tenantId: string,
    userId: number,
    data: UserUpdateRequest
  ): Promise<User> => {
    const response = await fetch(
      `${ADMIN_API_BASE}/tenants/${tenantId}/users/${userId}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );

    return handleResponse<User>(response);
  },

  /**
   * ユーザーを削除
   */
  delete: async (tenantId: string, userId: number): Promise<{ message: string }> => {
    const response = await fetch(
      `${ADMIN_API_BASE}/tenants/${tenantId}/users/${userId}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
      }
    );

    return handleResponse<{ message: string }>(response);
  },
};

// ===========================
// Tenant Settings API
// ===========================

export const tenantSettingsApi = {
  /**
   * テナント設定を取得
   */
  get: async (tenantId: string): Promise<TenantSettings> => {
    const response = await fetch(
      `${ADMIN_API_BASE}/tenants/${tenantId}/settings`,
      {
        headers: getHeaders(),
      }
    );

    return handleResponse<TenantSettings>(response);
  },

  /**
   * テナント設定を更新（upsert）
   */
  update: async (
    tenantId: string,
    data: TenantSettingsUpdateRequest
  ): Promise<TenantSettings> => {
    const response = await fetch(
      `${ADMIN_API_BASE}/tenants/${tenantId}/settings`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );

    return handleResponse<TenantSettings>(response);
  },

  /**
   * アプリアイコンをアップロード
   * PUT /api/admin/v1/tenants/{tenant-id}/settings/icon
   * 制約: 最大1MB、PNG/JPEG/WebP
   */
  uploadIcon: async (tenantId: string, iconFile: File): Promise<TenantSettings> => {
    const formData = new FormData();
    formData.append('icon', iconFile);

    const response = await fetch(
      `${ADMIN_API_BASE}/tenants/${tenantId}/settings/icon`,
      {
        method: 'PUT',
        headers: {
          'x-api-key': config.api.sensorApiKey,
          // Content-Typeはブラウザが自動で設定するため指定しない
        },
        body: formData,
      }
    );

    return handleResponse<TenantSettings>(response);
  },

  /**
   * アプリアイコンを削除
   * DELETE /api/admin/v1/tenants/{tenant-id}/settings/icon
   */
  deleteIcon: async (tenantId: string): Promise<TenantSettings> => {
    const response = await fetch(
      `${ADMIN_API_BASE}/tenants/${tenantId}/settings/icon`,
      {
        method: 'DELETE',
        headers: getHeaders(),
      }
    );

    return handleResponse<TenantSettings>(response);
  },
};