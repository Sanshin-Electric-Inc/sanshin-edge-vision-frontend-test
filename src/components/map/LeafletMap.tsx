// src/components/map/LeafletMap.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '@/contexts/AuthContext';
import { cameraApi } from '@/lib/api/camera';
import type { CameraImage, CameraCodeInfo } from '@/types/camera';

import {
  GSI_TILE_LAYERS,
  getLeafletMapOptions,
  getJapanBounds,
  createGSITileLayer,
  createFallbackTileLayer,
  createMarkerIcon,
  initializeLeafletConfig,
  logMapConfig,
  determineMarkerStatus,
} from '@/lib/map/leafletConfig';

import type {
  MapData,
  MapConfig,
  PlaceWithSensorData,
  MapEvent,
} from '@/types/map';

interface LeafletMapProps {
  mapData: MapData | null;
  config: MapConfig;
  onConfigChange?: (config: Partial<MapConfig>) => void;
  onPlaceClick?: (place: PlaceWithSensorData) => void;
  onMapEvent?: (event: MapEvent) => void;
}

// ========================================
// 地図イベントハンドラーコンポーネント
// ========================================
function MapEventHandler({ 
  onMapEvent 
}: { 
  onMapEvent?: (event: MapEvent) => void;
}) {
  const map = useMap();

  useMapEvents({
    click: (e) => {
      onMapEvent?.({
        type: 'click',
        position: [e.latlng.lat, e.latlng.lng],
      });
    },
    zoomend: () => {
      const zoom = map.getZoom();
      onMapEvent?.({
        type: 'zoom',
        zoom,
      });
    },
    moveend: () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      
      onMapEvent?.({
        type: 'move',
        position: [center.lat, center.lng],
        bounds: {
          lat_min: bounds.getSouth(),
          lng_min: bounds.getWest(),
          lat_max: bounds.getNorth(),
          lng_max: bounds.getEast(),
        },
      });
    },
  });

  return null;
}

// ========================================
// タイルレイヤー切り替えコンポーネント
// ========================================
function TileLayerSwitcher({ mapType }: { mapType: string }) {
  const map = useMap();
  const [currentTileLayer, setCurrentTileLayer] = useState<L.TileLayer | null>(null);

  useEffect(() => {
    // 既存のタイルレイヤーを削除
    if (currentTileLayer) {
      map.removeLayer(currentTileLayer);
    }

    // 新しいタイルレイヤーを追加
    let newTileLayer: L.TileLayer;
    
    try {
      newTileLayer = createGSITileLayer(mapType as any);
    } catch (error) {
      console.warn('国土地理院タイルの読み込みに失敗しました。フォールバックを使用します。', error);
      newTileLayer = createFallbackTileLayer();
    }

    newTileLayer.addTo(map);
    setCurrentTileLayer(newTileLayer);

    // クリーンアップ
    return () => {
      if (newTileLayer && map.hasLayer(newTileLayer)) {
        map.removeLayer(newTileLayer);
      }
    };
  }, [mapType, map]);

  return null;
}

// ========================================
// センサーマーカーコンポーネント
// ========================================
function SensorMarker({
  place,
  onClick
}: {
  place: PlaceWithSensorData;
  onClick?: (place: PlaceWithSensorData) => void;
}) {
  const { currentTenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'camera'>('info');
  const [cameraCodes, setCameraCodes] = useState<CameraCodeInfo[]>([]);
  const [selectedCameraCode, setSelectedCameraCode] = useState<string>('all');
  const [cameraImage, setCameraImage] = useState<CameraImage | null>(null);
  const [cameraCodesLoading, setCameraCodesLoading] = useState(false);
  const [cameraImageLoading, setCameraImageLoading] = useState(false);

  const status = determineMarkerStatus(
    place.last_updated,
    place.latest_sensor_data?.data_quality,
    place.sensor_count
  );

  const icon = createMarkerIcon(status, 'medium');

  const handleClick = useCallback(() => {
    onClick?.(place);
  }, [place, onClick]);

  // カメラコード一覧を取得
  useEffect(() => {
    if (activeTab === 'camera' && currentTenantId) {
      setCameraCodesLoading(true);
      cameraApi
        .getCameraCodes(currentTenantId, place.area, place.spot)
        .then((response) => {
          setCameraCodes(response.data);
          setCameraCodesLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch camera codes:', error);
          setCameraCodes([]);
          setCameraCodesLoading(false);
        });
    }
  }, [activeTab, currentTenantId, place.area, place.spot]);

  // カメラ画像を取得
  useEffect(() => {
    if (activeTab === 'camera' && currentTenantId) {
      setCameraImageLoading(true);
      const cameraCode = selectedCameraCode === 'all' ? undefined : selectedCameraCode;

      cameraApi
        .getLatestImage(currentTenantId, place.area, place.spot, cameraCode)
        .then((image) => {
          setCameraImage(image);
          setCameraImageLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch camera image:', error);
          setCameraImage(null);
          setCameraImageLoading(false);
        });
    }
  }, [activeTab, currentTenantId, place.area, place.spot, selectedCameraCode]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Marker
      position={[place.lat, place.lng]}
      icon={icon}
      eventHandlers={{
        click: handleClick,
      }}
    >
      <Popup maxWidth={400} minWidth={300}>
        <div className="sensor-popup">
          <div className="popup-header">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {place.place_name}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              エリア {place.area}-{place.spot}
            </div>
          </div>

          {/* タブ */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mt-3">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                activeTab === 'info'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              基本情報
            </button>
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                activeTab === 'camera'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              カメラ画像
            </button>
          </div>

          {/* タブコンテンツ */}
          <div className="popup-content mt-3">
            {activeTab === 'info' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">緯度:</span>
                    <span className="ml-1 font-mono">{place.lat.toFixed(6)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">経度:</span>
                    <span className="ml-1 font-mono">{place.lng.toFixed(6)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">センサー数:</span>
                    <span className="font-medium">{place.sensor_count}</span>
                  </div>

                  {place.last_updated && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">最終更新:</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(place.last_updated).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  )}
                </div>

                {place.latest_sensor_data && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      最新データ:
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-xs">
                      {Object.entries(place.latest_sensor_data.dynamic_data)
                        .slice(0, 3)
                        .map(([key, value]) => {
                          // 値を安全に文字列化
                          let displayValue: string;
                          if (value === null || value === undefined) {
                            displayValue = '-';
                          } else if (typeof value === 'object') {
                            displayValue = JSON.stringify(value);
                          } else {
                            displayValue = String(value);
                          }

                          return (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                              <span className="font-medium">{displayValue}</span>
                            </div>
                          );
                        })}
                      {Object.keys(place.latest_sensor_data.dynamic_data).length > 3 && (
                        <div className="text-gray-500 dark:text-gray-400 mt-1">
                          +{Object.keys(place.latest_sensor_data.dynamic_data).length - 3}項目
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* カメラコード選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    カメラを選択
                  </label>
                  {cameraCodesLoading ? (
                    <div className="text-xs text-gray-500">読み込み中...</div>
                  ) : (
                    <select
                      value={selectedCameraCode}
                      onChange={(e) => setSelectedCameraCode(e.target.value)}
                      className="w-full text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-2 py-1"
                    >
                      <option value="all">すべて（最新）</option>
                      {cameraCodes.map((camera) => (
                        <option key={camera.camera_code} value={camera.camera_code}>
                          {camera.camera_code}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* カメラ画像 */}
                {cameraImageLoading ? (
                  <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <div className="text-xs text-gray-500">読み込み中...</div>
                    </div>
                  </div>
                ) : cameraImage ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img
                        src={cameraImage.image_url}
                        alt={`Camera ${cameraImage.camera_code}`}
                        className="w-full h-auto rounded border border-gray-200 dark:border-gray-700"
                      />
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div className="flex justify-between">
                        <span>カメラコード:</span>
                        <span className="font-medium">{cameraImage.camera_code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>撮影日時:</span>
                        <span className="font-medium">{formatDate(cameraImage.created_at)}</span>
                      </div>
                      {cameraImage.metadata && Object.keys(cameraImage.metadata).length > 0 && (
                        <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                          <div className="font-medium mb-1">メタデータ:</div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded p-1 text-xs">
                            {JSON.stringify(cameraImage.metadata, null, 2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="text-center">
                      <svg
                        className="w-12 h-12 text-gray-400 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <p className="text-sm text-gray-500">カメラ画像がありません</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ========================================
// 地図コントロールコンポーネント
// ========================================
function MapControls({
  config,
  onConfigChange,
}: {
  config: MapConfig;
  onConfigChange?: (config: Partial<MapConfig>) => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-[1000] space-y-2">
      {/* 地図タイプ選択 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">地図タイプ</div>
        <select
          value={config.mapType}
          onChange={(e) => onConfigChange?.({ mapType: e.target.value as any })}
          className="w-full text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {Object.entries(GSI_TILE_LAYERS).map(([key, layer]) => (
            <option key={key} value={key}>
              {layer.name}
            </option>
          ))}
        </select>
      </div>

      {/* 表示オプション */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">表示オプション</div>
        <div className="space-y-1">
          <label className="flex items-center text-xs">
            <input
              type="checkbox"
              checked={config.showSensorData}
              onChange={(e) => onConfigChange?.({ showSensorData: e.target.checked })}
              className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
            />
            <span className="text-gray-700 dark:text-gray-300">センサーデータ</span>
          </label>
          <label className="flex items-center text-xs">
            <input
              type="checkbox"
              checked={config.showClusters}
              onChange={(e) => onConfigChange?.({ showClusters: e.target.checked })}
              className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
            />
            <span className="text-gray-700 dark:text-gray-300">マーカークラスター</span>
          </label>
        </div>
      </div>

      {/* 自動更新設定 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">自動更新</div>
        <label className="flex items-center text-xs">
          <input
            type="checkbox"
            checked={config.autoRefresh}
            onChange={(e) => onConfigChange?.({ autoRefresh: e.target.checked })}
            className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
          />
          <span className="text-gray-700 dark:text-gray-300">有効</span>
        </label>
        {config.autoRefresh && (
          <select
            value={config.refreshInterval}
            onChange={(e) => onConfigChange?.({ refreshInterval: parseInt(e.target.value) })}
            className="w-full text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={10000}>10秒</option>
            <option value={30000}>30秒</option>
            <option value={60000}>1分</option>
            <option value={300000}>5分</option>
          </select>
        )}
      </div>
    </div>
  );
}

// ========================================
// メインLeafletMapコンポーネント
// ========================================
export default function LeafletMap({
  mapData,
  config,
  onConfigChange,
  onPlaceClick,
  onMapEvent,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [leafletMapOptions, setLeafletMapOptions] = useState<L.MapOptions | null>(null);

  // Leaflet設定の初期化
  useEffect(() => {
    initializeLeafletConfig();
    
    // クライアントサイドでのみLeafletオプションを取得
    if (typeof window !== 'undefined') {
      setLeafletMapOptions(getLeafletMapOptions());
    }
    
    setIsInitialized(true);
    
    // 開発環境でのデバッグログ
    if (process.env.NODE_ENV === 'development') {
      logMapConfig(config);
    }
  }, [config]);

  // 地図の中心とズームを外部から制御
  useEffect(() => {
    if (mapRef.current && isInitialized) {
      const map = mapRef.current;
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      
      const [newLat, newLng] = config.center;
      
      // より大きな閾値で変更を検出（細かい変更を無視）
      const centerChanged = Math.abs(currentCenter.lat - newLat) > 0.01 || 
                           Math.abs(currentCenter.lng - newLng) > 0.01;
      const zoomChanged = currentZoom !== config.zoom;
      
      if (centerChanged || zoomChanged) {
        map.setView(config.center as L.LatLngExpression, config.zoom, {
          animate: false, // アニメーションを無効化して余計なイベントを防ぐ
        });
      }
    }
  }, [config.center, config.zoom, isInitialized]);

  if (!isInitialized || !leafletMapOptions) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600 dark:text-gray-400">地図を初期化中...</div>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={config.center as L.LatLngExpression}
      zoom={config.zoom}
      style={{ height: '100%', width: '100%' }}
      maxBounds={getJapanBounds()}
      maxBoundsViscosity={1.0}
      zoomControl={true}
      attributionControl={true}
      ref={(map) => {
        if (map) {
          mapRef.current = map;
        }
      }}
      {...leafletMapOptions}
    >
      {/* タイルレイヤー */}
      <TileLayerSwitcher mapType={config.mapType} />

      {/* 地図イベントハンドラー */}
      <MapEventHandler 
        onMapEvent={onMapEvent}
      />

      {/* センサーマーカー */}
      {config.showSensorData && mapData?.places && mapData.places.map((place) => (
        <SensorMarker
          key={`${place.area}-${place.spot}`}
          place={place}
          onClick={onPlaceClick}
        />
      ))}

      {/* 地図コントロール */}
      <MapControls 
        config={config}
        onConfigChange={onConfigChange}
      />
    </MapContainer>
  );
}