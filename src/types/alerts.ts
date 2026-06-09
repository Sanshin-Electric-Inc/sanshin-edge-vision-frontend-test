// src/types/alerts.ts

/**
 * センサーコード定義（sensor_code_definitions テーブル）
 */
export interface SensorCodeDefinition {
  id: number;
  tenant_id: string;
  area: number;
  spot: number;
  sensor_code: string;
  name: string;
  description: string;
  data_type: 'string' | 'int' | 'float' | 'boolean';
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * アラートメール文面テンプレート（APIレスポンス - フラット構造）
 */
export interface AlertEmailTemplate {
  id: number;
  tenant_id: string;
  area: number;
  spot: number;
  sensor_code_definition_id: number;
  subject: string;
  body_template: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  // センサー定義情報（フラット展開）
  sensor_code: string;
  sensor_code_name: string;
  data_type: string;
  unit: string;
}

/**
 * テンプレート作成リクエスト
 */
export interface TemplateCreateRequest {
  sensor_code_definition_id: number;
  subject: string;
  body_template: string;
  is_default: boolean;
}

/**
 * テンプレート更新リクエスト
 */
export interface TemplateUpdateRequest {
  subject: string;
  body_template: string;
  is_default: boolean;
}

/**
 * アラート履歴（APIレスポンス - フラット構造）
 */
export interface AlertHistory {
  id: number;
  tenant_id: string;
  area: number;
  spot: number;
  sensor_code_definition_id: number;
  sensor_data_id: number;
  threshold_value: number;
  actual_value: number;
  threshold_type: 'UPPER' | 'LOWER';
  alert_level: 'WARNING' | 'CRITICAL' | 'INFO';
  recipients: Array<{
    email: string;
    name: string;
  }>;
  email_sent: boolean;
  error_message?: string;
  created_at: string;
  // センサー定義情報（フラット展開）
  sensor_code?: string;
  sensor_code_name?: string;
  data_type?: string;
  unit?: string;
  // 場所情報（フラット展開）
  place_name?: string;
}

/**
 * テンプレートAPI レスポンス
 */
export interface TemplatesApiResponse {
  count: number;
  data: AlertEmailTemplate[];
}

/**
 * アラート履歴API レスポンス
 */
export interface AlertHistoryApiResponse {
  count: number;
  data: AlertHistory[];
}

/**
 * 使用可能なプレースホルダー
 */
export const TEMPLATE_PLACEHOLDERS = [
  { key: '{{place_name}}', description: '場所名' },
  { key: '{{area}}', description: 'エリア番号' },
  { key: '{{spot}}', description: 'スポット番号' },
  { key: '{{sensor_name}}', description: 'センサー名' },
  { key: '{{sensor_code}}', description: 'センサーコード' },
  { key: '{{value}}', description: '測定値' },
  { key: '{{unit}}', description: '単位' },
  { key: '{{threshold}}', description: '閾値' },
  { key: '{{threshold_type}}', description: '閾値タイプ（上限/下限）' },
  { key: '{{timestamp}}', description: '測定日時' },
] as const;

/**
 * デフォルトテンプレート
 */
export const DEFAULT_TEMPLATE = {
  subject: '【警告】{{place_name}} - {{sensor_name}}が閾値を超過しました',
  body_template: `{{place_name}}（Area: {{area}}, Spot: {{spot}}）の{{sensor_name}}が閾値を超過しました。

測定時刻: {{timestamp}}
測定値: {{value}} {{unit}}
閾値: {{threshold_type}} {{threshold}} {{unit}}

早急な確認をお願いします。`,
};

// ===========================
// 分析レポート用の型定義
// ===========================

/**
 * 日別アラート件数
 */
export interface DailyAlertCount {
  date: string;
  count: number;
  warning: number;
  critical: number;
}

/**
 * 場所別アラート件数
 */
export interface PlaceAlertCount {
  place_name: string;
  area: number;
  spot: number;
  count: number;
}

/**
 * センサー別アラート件数
 */
export interface SensorAlertCount {
  sensor_code: string;
  sensor_code_name: string;
  count: number;
}

/**
 * アラートレベル別件数
 */
export interface AlertLevelCount {
  level: 'WARNING' | 'CRITICAL' | 'INFO';
  count: number;
}

/**
 * 閾値タイプ別件数
 */
export interface ThresholdTypeCount {
  type: 'UPPER' | 'LOWER';
  count: number;
}

/**
 * 分析サマリー
 */
export interface AnalyticsSummary {
  totalAlerts: number;
  warningCount: number;
  criticalCount: number;
  emailSentCount: number;
  emailFailedCount: number;
}