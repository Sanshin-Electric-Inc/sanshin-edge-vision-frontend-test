// src/types/admin.ts

export interface Tenant {
  tenant_id: string;
  tenant_name: string;
}

export interface TenantCreateRequest {
  tenant_id: string;
  tenant_name: string;
}

export interface TenantUpdateRequest {
  tenant_name: string;
}

export interface User {
  id: number;
  tenant_id: string;
  name: string;
  email: string;
  role_id: number;
  is_super_admin: boolean;
  receive_alerts: boolean; // 新規追加: アラートメール受信フラグ
  created_at: string;
}

export interface UserCreateRequest {
  tenant_id: string;
  name: string;
  email: string;
  role_id: number;
  receive_alerts: boolean; // 新規追加: アラートメール受信フラグ
}

export interface UserUpdateRequest {
  name: string;
  email: string;
  role_id: number;
  receive_alerts: boolean; // 新規追加: アラートメール受信フラグ
}

export interface AdminApiResponse<T> {
  count: number;
  data: T[];
}

// ロール定義
export const USER_ROLES = {
  ADMIN: 1,
  USER: 2,
  VIEWER: 3,
} as const;

export const USER_ROLE_LABELS: Record<number, string> = {
  1: '管理者',
  2: '一般ユーザー',
  3: '閲覧者',
};

// テナント設定
export interface TenantSettings {
  tenant_id: string;
  app_name: string;
  app_icon_url: string; // 空文字の場合は未設定
  updated_at: string;
}

export interface TenantSettingsUpdateRequest {
  app_name: string;
}