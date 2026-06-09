// src/types/alertRecipients.ts

/**
 * アラートメール配信先（alert_recipients テーブル）
 * システムにログインしないが、アラートメールだけ受け取る外部関係者向け
 */
export interface AlertRecipient {
  id: number;
  tenant_id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 配信先作成リクエスト
 */
export interface AlertRecipientCreateRequest {
  name: string;
  email: string;
  is_active?: boolean;
}

/**
 * 配信先更新リクエスト
 */
export interface AlertRecipientUpdateRequest {
  name: string;
  email: string;
  is_active: boolean;
}

/**
 * 配信先一覧API レスポンス
 */
export interface AlertRecipientListResponse {
  count: number;
  data: AlertRecipient[];
}
