// src/lib/map/leafletConfig.ts
/**
 * Leaflet地図の設定とユーティリティ関数
 * 
 * このファイルは以下の機能を提供します：
 * - 国土地理院タイルレイヤーの設定
 * - マーカーアイコンの生成
 * - 地図の初期化設定
 * - ステータス判定ロジック
 */

import L from 'leaflet';
import type {
  GSIMapType,
  GSITileLayers,
  MarkerStatus,
  MarkerSize,
  SensorDataQuality,
} from '@/types/map';

// ========================================
// 定数定義
// ========================================

/**
 * 国土地理院タイルレイヤーの定義
 */
export const GSI_TILE_LAYERS: GSITileLayers = {
  std: {
    name: '標準地図',
    url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    maxZoom: 18,
    minZoom: 5,
  },
  pale: {
    name: '淡色地図',
    url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    maxZoom: 18,
    minZoom: 5,
  },
  blank: {
    name: '白地図',
    url: 'https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png',
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    maxZoom: 14,
    minZoom: 5,
  },
  english: {
    name: 'English',
    url: 'https://cyberjapandata.gsi.go.jp/xyz/english/{z}/{x}/{y}.png',
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">GSI Japan</a>',
    maxZoom: 11,
    minZoom: 5,
  },
  photo: {
    name: '写真',
    url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    maxZoom: 18,
    minZoom: 2,
  },
  seamlessphoto: {
    name: 'シームレス写真',
    url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    maxZoom: 18,
    minZoom: 2,
  },
  ort: {
    name: '地形図',
    url: 'https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg',
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    maxZoom: 17,
    minZoom: 2,
  },
  relief: {
    name: '陰影起伏図',
    url: 'https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png',
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    maxZoom: 15,
    minZoom: 5,
  },
};

/**
 * フォールバックタイルレイヤー（OpenStreetMap）
 */
export const FALLBACK_TILE_LAYER = {
  name: 'OpenStreetMap',
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
  minZoom: 1,
  subdomains: ['a', 'b', 'c'],
};

/**
 * 日本の地理的境界
 */
export const JAPAN_BOUNDS: [[number, number], [number, number]] = [
  [20.0, 122.0], // 南西（沖縄県南部）
  [46.0, 154.0], // 北東（北海道東部）
];

/**
 * デフォルトの地図中心（東京駅）
 */
export const DEFAULT_CENTER: [number, number] = [35.6812, 139.7671];

/**
 * デフォルトのズームレベル
 */
export const DEFAULT_ZOOM = 10;

/**
 * マーカーサイズの定義（ピクセル）
 */
export const MARKER_SIZES = {
  small: [20, 30],
  medium: [30, 45],
  large: [40, 60],
} as const;

/**
 * マーカーの色定義（ステータス別）
 */
export const MARKER_COLORS: Record<MarkerStatus, string> = {
  excellent: '#10b981', // green-500
  good: '#3b82f6',      // blue-500
  warning: '#f59e0b',   // amber-500
  error: '#ef4444',     // red-500
  offline: '#6b7280',   // gray-500
  unknown: '#9ca3af',   // gray-400
};

/**
 * データ品質からマーカーステータスへのマッピング
 */
export const DATA_QUALITY_TO_STATUS: Record<SensorDataQuality, MarkerStatus> = {
  excellent: 'excellent',
  good: 'good',
  warning: 'warning',
  error: 'error',
};

/**
 * 最新データとみなす時間（ミリ秒）
 * 1時間以内のデータを「最新」とみなす
 */
export const RECENT_DATA_THRESHOLD = 60 * 60 * 1000; // 1時間

/**
 * オフラインとみなす時間（ミリ秒）
 * 24時間以上更新がない場合「オフライン」とみなす
 */
export const OFFLINE_THRESHOLD = 24 * 60 * 60 * 1000; // 24時間

// ========================================
// Leaflet設定関数
// ========================================

/**
 * Leafletのデフォルトアイコン設定を修正
 * Next.jsでLeafletを使う場合、アイコンのパスが正しく解決されないため
 */
export function initializeLeafletConfig(): void {
  // デフォルトアイコンの設定
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

/**
 * Leaflet地図のオプションを取得
 */
export function getLeafletMapOptions(): L.MapOptions {
  return {
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    dragging: true,
    touchZoom: true,
    boxZoom: true,
    keyboard: true,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
  };
}

/**
 * 日本の境界を取得
 */
export function getJapanBounds(): L.LatLngBoundsExpression {
  return JAPAN_BOUNDS;
}

// ========================================
// タイルレイヤー関連
// ========================================

/**
 * 国土地理院タイルレイヤーを作成
 */
export function createGSITileLayer(mapType: GSIMapType = 'std'): L.TileLayer {
  const layerInfo = GSI_TILE_LAYERS[mapType];
  
  if (!layerInfo) {
    console.warn(`Unknown map type: ${mapType}, falling back to 'std'`);
    return createGSITileLayer('std');
  }
  
  return L.tileLayer(layerInfo.url, {
    attribution: layerInfo.attribution,
    maxZoom: layerInfo.maxZoom,
    minZoom: layerInfo.minZoom,
    crossOrigin: true,
  });
}

/**
 * フォールバックタイルレイヤーを作成（OpenStreetMap）
 */
export function createFallbackTileLayer(): L.TileLayer {
  return L.tileLayer(FALLBACK_TILE_LAYER.url, {
    attribution: FALLBACK_TILE_LAYER.attribution,
    maxZoom: FALLBACK_TILE_LAYER.maxZoom,
    minZoom: FALLBACK_TILE_LAYER.minZoom,
    subdomains: FALLBACK_TILE_LAYER.subdomains,
  });
}

/**
 * タイルレイヤーが利用可能か確認
 */
export async function isTileLayerAvailable(url: string): Promise<boolean> {
  try {
    // タイルの存在確認（ズームレベル10の東京付近）
    const testUrl = url
      .replace('{z}', '10')
      .replace('{x}', '909')
      .replace('{y}', '403');
    
    const response = await fetch(testUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Tile layer availability check failed:', error);
    return false;
  }
}

// ========================================
// マーカー関連
// ========================================

/**
 * マーカーサイズをピクセル配列に変換
 */
export function getMarkerSizePixels(size: MarkerSize): [number, number] {
  return MARKER_SIZES[size] as [number, number];
}

/**
 * SVGマーカーアイコンを生成
 */
export function createMarkerIcon(
  status: MarkerStatus = 'unknown',
  size: MarkerSize = 'medium'
): L.DivIcon {
  const color = MARKER_COLORS[status];
  const [width, height] = getMarkerSizePixels(size);
  
  // SVGマーカーのHTML
  const iconHtml = `
    <svg width="${width}" height="${height}" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-${status}" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>
      <path 
        d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24c0-6.6-5.4-12-12-12z" 
        fill="${color}" 
        filter="url(#shadow-${status})"
      />
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
    </svg>
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: `custom-marker custom-marker-${status}`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
  });
}

/**
 * カスタムマーカーアイコンを生成（画像URL指定）
 */
export function createCustomMarkerIcon(
  iconUrl: string,
  size: MarkerSize = 'medium',
  shadowUrl?: string
): L.Icon {
  const [width, height] = getMarkerSizePixels(size);
  
  return L.icon({
    iconUrl,
    shadowUrl,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
    shadowSize: shadowUrl ? [width, height] : undefined,
    shadowAnchor: shadowUrl ? [width / 2, height] : undefined,
  });
}

/**
 * パルスアニメーション付きマーカーアイコンを生成
 */
export function createPulsingMarkerIcon(
  status: MarkerStatus = 'unknown',
  size: MarkerSize = 'medium'
): L.DivIcon {
  const color = MARKER_COLORS[status];
  const [width, height] = getMarkerSizePixels(size);
  
  const iconHtml = `
    <div class="pulsing-marker" style="width: ${width}px; height: ${height}px;">
      <svg width="${width}" height="${height}" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24c0-6.6-5.4-12-12-12z" 
          fill="${color}"
        />
        <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
      </svg>
      <div class="pulse-ring" style="border-color: ${color};"></div>
    </div>
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: `custom-marker custom-marker-pulsing custom-marker-${status}`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
  });
}

// ========================================
// ステータス判定
// ========================================

/**
 * 最終更新時刻とデータ品質からマーカーステータスを判定
 */
export function determineMarkerStatus(
  lastUpdated?: string,
  dataQuality?: SensorDataQuality,
  sensorCount?: number
): MarkerStatus {
  // センサーがない場合
  if (!sensorCount || sensorCount === 0) {
    return 'unknown';
  }
  
  // 最終更新時刻がない場合
  if (!lastUpdated) {
    return 'unknown';
  }
  
  // 最終更新時刻をチェック
  const lastUpdateTime = new Date(lastUpdated).getTime();
  const now = Date.now();
  const timeSinceUpdate = now - lastUpdateTime;
  
  // 24時間以上更新がない場合はオフライン
  if (timeSinceUpdate > OFFLINE_THRESHOLD) {
    return 'offline';
  }
  
  // データ品質が指定されている場合はそれを使用
  if (dataQuality) {
    return DATA_QUALITY_TO_STATUS[dataQuality];
  }
  
  // 1時間以内のデータがあれば「良好」
  if (timeSinceUpdate <= RECENT_DATA_THRESHOLD) {
    return 'good';
  }
  
  // それ以外は「警告」
  return 'warning';
}

/**
 * データ品質からマーカーステータスに変換
 */
export function dataQualityToMarkerStatus(
  quality: SensorDataQuality
): MarkerStatus {
  return DATA_QUALITY_TO_STATUS[quality];
}

/**
 * 最終更新時刻が最新か判定
 */
export function isRecentData(lastUpdated: string): boolean {
  const lastUpdateTime = new Date(lastUpdated).getTime();
  const now = Date.now();
  return (now - lastUpdateTime) <= RECENT_DATA_THRESHOLD;
}

/**
 * 最終更新時刻がオフラインか判定
 */
export function isOffline(lastUpdated: string): boolean {
  const lastUpdateTime = new Date(lastUpdated).getTime();
  const now = Date.now();
  return (now - lastUpdateTime) > OFFLINE_THRESHOLD;
}

// ========================================
// ユーティリティ関数
// ========================================

/**
 * 2点間の距離を計算（メートル）
 * Haversine formula を使用
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 座標が日本国内か判定
 */
export function isInJapan(lat: number, lng: number): boolean {
  const [[minLat, minLng], [maxLat, maxLng]] = JAPAN_BOUNDS;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * 座標が有効か判定
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * 複数の座標の中心点を計算
 */
export function calculateCenter(
  coordinates: Array<[number, number]>
): [number, number] {
  if (coordinates.length === 0) {
    return DEFAULT_CENTER;
  }
  
  const sum = coordinates.reduce(
    (acc, [lat, lng]) => [acc[0] + lat, acc[1] + lng],
    [0, 0]
  );
  
  return [sum[0] / coordinates.length, sum[1] / coordinates.length];
}

/**
 * 複数の座標を含む境界を計算
 */
export function calculateBounds(
  coordinates: Array<[number, number]>
): L.LatLngBoundsExpression | null {
  if (coordinates.length === 0) {
    return null;
  }
  
  const lats = coordinates.map(([lat]) => lat);
  const lngs = coordinates.map(([, lng]) => lng);
  
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

/**
 * 適切なズームレベルを計算
 */
export function calculateZoomLevel(
  bounds: L.LatLngBoundsExpression,
  _mapWidth: number,
  _mapHeight: number
): number {
  // 簡易計算（実際のLeaflet内部の計算はより複雑）
  const [[minLat, minLng], [maxLat, maxLng]] = bounds as [[number, number], [number, number]];
  
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  
  const maxDiff = Math.max(latDiff, lngDiff);
  
  // おおよそのズームレベルを計算
  if (maxDiff > 10) return 6;
  if (maxDiff > 5) return 8;
  if (maxDiff > 2) return 10;
  if (maxDiff > 1) return 11;
  if (maxDiff > 0.5) return 12;
  if (maxDiff > 0.2) return 13;
  if (maxDiff > 0.1) return 14;
  return 15;
}

// ========================================
// デバッグ用
// ========================================

/**
 * 地図設定をコンソールに出力（開発環境のみ）
 */
export function logMapConfig(config: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.group('Map Configuration');
    console.log('Center:', config.center);
    console.log('Zoom:', config.zoom);
    console.log('Map Type:', config.mapType);
    console.log('Show Sensor Data:', config.showSensorData);
    console.log('Show Clusters:', config.showClusters);
    console.log('Auto Refresh:', config.autoRefresh);
    console.log('Refresh Interval:', config.refreshInterval);
    console.groupEnd();
  }
}

/**
 * マーカー情報をコンソールに出力（開発環境のみ）
 */
export function logMarkerInfo(
  placeName: string,
  status: MarkerStatus,
  lat: number,
  lng: number
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Marker: ${placeName} (${status}) at [${lat}, ${lng}]`);
  }
}

/**
 * タイルレイヤー読み込みエラーをログ
 */
export function logTileLayerError(error: Error, mapType: GSIMapType): void {
  console.error(`Failed to load tile layer: ${mapType}`, error);
}

// ========================================
// エクスポート
// ========================================

export default {
  GSI_TILE_LAYERS,
  FALLBACK_TILE_LAYER,
  JAPAN_BOUNDS,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MARKER_SIZES,
  MARKER_COLORS,
  DATA_QUALITY_TO_STATUS,
  RECENT_DATA_THRESHOLD,
  OFFLINE_THRESHOLD,
  
  // 関数
  initializeLeafletConfig,
  getLeafletMapOptions,
  getJapanBounds,
  createGSITileLayer,
  createFallbackTileLayer,
  isTileLayerAvailable,
  createMarkerIcon,
  createCustomMarkerIcon,
  createPulsingMarkerIcon,
  determineMarkerStatus,
  dataQualityToMarkerStatus,
  isRecentData,
  isOffline,
  calculateDistance,
  isInJapan,
  isValidCoordinate,
  calculateCenter,
  calculateBounds,
  calculateZoomLevel,
  logMapConfig,
  logMarkerInfo,
  logTileLayerError,
};