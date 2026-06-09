// src/types/map.ts
/**
 * 地図表示機能の型定義
 * 
 * このファイルは地図コンポーネントで使用する型を定義します。
 * - 場所データとセンサーデータの統合
 * - 地図設定
 * - 地図イベント
 */

import type { Place } from './places';

// ========================================
// センサーデータ関連
// ========================================

/**
 * センサーデータの品質レベル
 */
export type SensorDataQuality = 'excellent' | 'good' | 'warning' | 'error';

/**
 * 最新センサーデータ
 */
export interface LatestSensorData {
  /** データID */
  id: bigint;
  
  /** タイムスタンプ（ISO 8601形式） */
  tim: string;
  
  /** 動的センサーデータ（キー: センサーコード、値: センサー値） */
  dynamic_data: Record<string, any>;
  
  /** センサー画像URL（オプション） */
  sensor_img?: string;
  
  /** データ品質 */
  data_quality?: SensorDataQuality;
}

/**
 * センサーデータを含む場所情報
 * 地図表示用に拡張された場所データ
 */
export interface PlaceWithSensorData extends Place {
  /** 緯度（必須） */
  lat: number;
  
  /** 経度（必須） */
  lng: number;
  
  /** 最新センサーデータ */
  latest_sensor_data?: LatestSensorData;
  
  /** この場所のセンサー数 */
  sensor_count: number;
  
  /** 最終更新日時（ISO 8601形式） */
  last_updated?: string;
}

// ========================================
// 地図設定
// ========================================

/**
 * 国土地理院タイルの種類
 */
export type GSIMapType = 
  | 'std'           // 標準地図
  | 'pale'          // 淡色地図
  | 'blank'         // 白地図
  | 'english'       // English
  | 'photo'         // 写真
  | 'seamlessphoto' // シームレス写真
  | 'ort'           // 地形図
  | 'relief';       // 陰影起伏図

/**
 * 地図の設定
 */
export interface MapConfig {
  /** 地図の中心座標 [緯度, 経度] */
  center: [number, number];
  
  /** ズームレベル (6-18) */
  zoom: number;
  
  /** 地図タイプ */
  mapType: GSIMapType;
  
  /** センサーデータを表示するか */
  showSensorData: boolean;
  
  /** マーカークラスターを使用するか */
  showClusters: boolean;
  
  /** 自動更新を有効にするか */
  autoRefresh: boolean;
  
  /** 自動更新の間隔（ミリ秒） */
  refreshInterval: number;
  
  /** 最大ズームレベル */
  maxZoom: number;
  
  /** 最小ズームレベル */
  minZoom: number;
}

/**
 * 地図の境界
 */
export interface MapBounds {
  /** 最小緯度（南） */
  lat_min: number;
  
  /** 最小経度（西） */
  lng_min: number;
  
  /** 最大緯度（北） */
  lat_max: number;
  
  /** 最大経度（東） */
  lng_max: number;
}

// ========================================
// 地図データ
// ========================================

/**
 * 地図統計情報
 */
export interface MapSummary {
  /** 総場所数 */
  total_places: number;
  
  /** アクティブな場所数（センサーがある） */
  active_places: number;
  
  /** データがある場所数 */
  places_with_data: number;
  
  /** 最新データがある場所数（1時間以内） */
  places_with_recent_data: number;
}

/**
 * 地図表示用データ
 */
export interface MapData {
  /** 場所データの配列 */
  places: PlaceWithSensorData[];
  
  /** 統計情報 */
  summary: MapSummary;
  
  /** データ取得日時（ISO 8601形式） */
  last_updated: string;
}

// ========================================
// 地図イベント
// ========================================

/**
 * 地図イベントの種類
 */
export type MapEventType = 
  | 'click'      // クリック
  | 'zoom'       // ズーム変更
  | 'move'       // 移動
  | 'load'       // 読み込み完了
  | 'error';     // エラー

/**
 * 地図イベント
 */
export interface MapEvent {
  /** イベントタイプ */
  type: MapEventType;
  
  /** クリック/移動位置 [緯度, 経度] */
  position?: [number, number];
  
  /** ズームレベル */
  zoom?: number;
  
  /** 地図の境界 */
  bounds?: MapBounds;
  
  /** エラーメッセージ */
  error?: string;
  
  /** その他のデータ */
  data?: any;
}

// ========================================
// マーカー関連
// ========================================

/**
 * マーカーのステータス
 */
export type MarkerStatus = 
  | 'excellent'   // 正常（緑）
  | 'good'        // 良好（青）
  | 'warning'     // 警告（黄）
  | 'error'       // エラー（赤）
  | 'offline'     // オフライン（グレー）
  | 'unknown';    // 不明（グレー）

/**
 * マーカーのサイズ
 */
export type MarkerSize = 'small' | 'medium' | 'large';

/**
 * マーカー設定
 */
export interface MarkerConfig {
  /** ステータス */
  status: MarkerStatus;
  
  /** サイズ */
  size: MarkerSize;
  
  /** カスタムアイコンURL */
  iconUrl?: string;
  
  /** アイコンサイズ [幅, 高さ] */
  iconSize?: [number, number];
  
  /** アイコンアンカー [x, y] */
  iconAnchor?: [number, number];
  
  /** ポップアップアンカー [x, y] */
  popupAnchor?: [number, number];
}

// ========================================
// タイルレイヤー関連
// ========================================

/**
 * タイルレイヤー情報
 */
export interface TileLayerInfo {
  /** 表示名 */
  name: string;
  
  /** タイルURL */
  url: string;
  
  /** 帰属表示 */
  attribution: string;
  
  /** 最大ズームレベル */
  maxZoom: number;
  
  /** 最小ズームレベル */
  minZoom: number;
  
  /** サブドメイン */
  subdomains?: string[];
}

/**
 * 国土地理院タイルレイヤー定義
 */
export type GSITileLayers = Record<GSIMapType, TileLayerInfo>;

// ========================================
// API関連
// ========================================

/**
 * 場所データ取得のクエリパラメータ
 */
export interface PlacesQueryParams {
  /** テナントID */
  tenant_id?: string;
  
  /** エリア番号でフィルタ */
  area?: number;
  
  /** スポット番号でフィルタ */
  spot?: number;
  
  /** 取得件数 */
  limit?: number;
  
  /** オフセット */
  offset?: number;
  
  /** ソート項目 */
  sort_by?: string;
  
  /** ソート順 */
  sort_order?: 'asc' | 'desc';
}

/**
 * センサーデータ取得のクエリパラメータ
 */
export interface SensorDataQueryParams {
  /** テナントID */
  tenant_id?: string;
  
  /** エリア番号でフィルタ */
  area?: number;
  
  /** スポット番号でフィルタ */
  spot?: number;
  
  /** 開始日時（ISO 8601形式） */
  start_time?: string;
  
  /** 終了日時（ISO 8601形式） */
  end_time?: string;
  
  /** 取得件数 */
  limit?: number;
  
  /** オフセット */
  offset?: number;
}

// ========================================
// ユーティリティ型
// ========================================

/**
 * 座標
 */
export type Coordinate = [number, number]; // [緯度, 経度]

/**
 * 座標範囲
 */
export interface CoordinateRange {
  /** 最小緯度 */
  minLat: number;
  
  /** 最大緯度 */
  maxLat: number;
  
  /** 最小経度 */
  minLng: number;
  
  /** 最大経度 */
  maxLng: number;
}

/**
 * 地図操作のオプション
 */
export interface MapOperationOptions {
  /** アニメーション有効 */
  animate?: boolean;
  
  /** アニメーション時間（ミリ秒） */
  duration?: number;
  
  /** イージング関数 */
  easing?: string;
}

// ========================================
// エクスポート（型のみ）
// ========================================

export type {
  // 基本型は個別にエクスポート済み
};