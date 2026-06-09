// src/types/thresholds.ts

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
 * センサー閾値設定（APIレスポンス - フラット構造）
 */
export interface SensorThreshold {
  id: number;
  tenant_id: string;
  area: number;
  spot: number;
  sensor_code_definition_id: number;
  lower_limit: number | null;
  upper_limit: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // センサー定義情報（フラット展開）
  sensor_code: string;
  sensor_code_name: string;
  data_type: string;
  unit: string;
}

/**
 * 閾値作成リクエスト
 */
export interface ThresholdCreateRequest {
  sensor_code_definition_id: number;
  lower_limit: number | null;
  upper_limit: number | null;
  is_active: boolean;
}

/**
 * 閾値更新リクエスト
 */
export interface ThresholdUpdateRequest {
  lower_limit: number | null;
  upper_limit: number | null;
  is_active: boolean;
}

/**
 * 閾値API レスポンス
 */
export interface ThresholdsApiResponse {
  count: number;
  data: SensorThreshold[];
}