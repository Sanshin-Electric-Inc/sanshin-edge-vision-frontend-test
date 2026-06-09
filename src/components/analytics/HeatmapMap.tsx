// src/components/analytics/HeatmapMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  GSI_TILE_LAYERS,
  getLeafletMapOptions,
  getJapanBounds,
  createGSITileLayer,
  createFallbackTileLayer,
  initializeLeafletConfig,
} from '@/lib/map/leafletConfig';
import { config } from '@/lib/config/environment';
import type { PlaceAlertData } from '@/app/dashboard/analytics/heatmap/page';

interface HeatmapMapProps {
  data: PlaceAlertData[];
  viewMode: 'marker' | 'heatmap';
}

// アラート数に基づく色を取得
const getAlertColor = (count: number, hasCritical: boolean): string => {
  if (hasCritical) return '#ef4444'; // 赤
  if (count === 0) return '#22c55e'; // 緑
  if (count <= 5) return '#eab308'; // 黄
  if (count <= 10) return '#f97316'; // オレンジ
  return '#ef4444'; // 赤
};

// アラート数に基づくサイズを取得
const getMarkerRadius = (count: number, isHeatmap: boolean): number => {
  if (isHeatmap) {
    // ヒートマップモードでは大きめのサイズ
    if (count === 0) return 15;
    if (count <= 5) return 25;
    if (count <= 10) return 35;
    return 45;
  }
  // マーカーモードでは固定サイズ
  return 12;
};

// アラート数に基づく透明度を取得
const getOpacity = (count: number, isHeatmap: boolean): number => {
  if (!isHeatmap) return 0.9;
  if (count === 0) return 0.3;
  if (count <= 5) return 0.5;
  if (count <= 10) return 0.6;
  return 0.7;
};

// タイルレイヤー切り替えコンポーネント
function TileLayerSwitcher({ mapType }: { mapType: string }) {
  const map = useMap();
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let newTileLayer: L.TileLayer;

    try {
      newTileLayer = createGSITileLayer(mapType as keyof typeof GSI_TILE_LAYERS);
    } catch {
      console.warn('国土地理院タイルの読み込みに失敗しました。フォールバックを使用します。');
      newTileLayer = createFallbackTileLayer();
    }

    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;

    return () => {
      if (newTileLayer && map.hasLayer(newTileLayer)) {
        map.removeLayer(newTileLayer);
      }
    };
  }, [mapType, map]);

  return null;
}

// 地図の中心を自動調整するコンポーネント
function MapBoundsAdjuster({ data }: { data: PlaceAlertData[] }) {
  const map = useMap();
  const adjustedRef = useRef(false);

  useEffect(() => {
    // 既に調整済み、またはデータがない場合はスキップ
    if (adjustedRef.current || data.length === 0) return;

    const validData = data.filter(
      (d) =>
        typeof d.lat === 'number' &&
        typeof d.lng === 'number' &&
        !isNaN(d.lat) &&
        !isNaN(d.lng)
    );

    if (validData.length === 0) return;

    // マップの準備完了を待つ
    const adjustBounds = () => {
      try {
        const bounds = L.latLngBounds(validData.map((d) => [d.lat, d.lng]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
          adjustedRef.current = true;
        }
      } catch (error) {
        console.error('Failed to adjust map bounds:', error);
      }
    };

    // 少し遅延させてマップの初期化完了を待つ
    const timeoutId = setTimeout(adjustBounds, 100);
    return () => clearTimeout(timeoutId);
  }, [data, map]);

  return null;
}

export default function HeatmapMap({ data, viewMode }: HeatmapMapProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [leafletMapOptions, setLeafletMapOptions] = useState<L.MapOptions | null>(null);
  const [mapType, setMapType] = useState<string>('std');

  // Leaflet設定の初期化
  useEffect(() => {
    initializeLeafletConfig();

    if (typeof window !== 'undefined') {
      setLeafletMapOptions(getLeafletMapOptions());
    }

    setIsInitialized(true);
  }, []);

  if (!isInitialized || !leafletMapOptions) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">地図を初期化中...</div>
        </div>
      </div>
    );
  }

  const isHeatmap = viewMode === 'heatmap';

  // データの中心を計算
  const center =
    data.length > 0
      ? ([
          data.reduce((sum, d) => sum + d.lat, 0) / data.length,
          data.reduce((sum, d) => sum + d.lng, 0) / data.length,
        ] as [number, number])
      : (config.map.defaultCenter as [number, number]);

  return (
    <MapContainer
      center={center}
      zoom={10}
      style={{ height: '100%', width: '100%' }}
      maxBounds={getJapanBounds()}
      maxBoundsViscosity={1.0}
      zoomControl={true}
      attributionControl={true}
      {...leafletMapOptions}
    >
      {/* タイルレイヤー */}
      <TileLayerSwitcher mapType={mapType} />

      {/* 地図の中心を調整 */}
      <MapBoundsAdjuster data={data} />

      {/* マーカー/ヒートマップ */}
      {data.map((place) => (
        <CircleMarker
          key={`${place.area}-${place.spot}`}
          center={[place.lat, place.lng]}
          radius={getMarkerRadius(place.totalCount, isHeatmap)}
          pathOptions={{
            color: getAlertColor(place.totalCount, place.criticalCount > 0),
            fillColor: getAlertColor(place.totalCount, place.criticalCount > 0),
            fillOpacity: getOpacity(place.totalCount, isHeatmap),
            weight: isHeatmap ? 0 : 2,
          }}
        >
          <Popup>
            <div className="min-w-[200px]">
              <h3 className="font-semibold text-gray-900 mb-2">{place.place_name}</h3>
              <div className="text-sm text-gray-500 mb-3">
                エリア {place.area} - スポット {place.spot}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">総アラート数:</span>
                  <span className="font-bold text-gray-900">{place.totalCount}件</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">WARNING:</span>
                  <span className="font-medium text-amber-500">{place.warningCount}件</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">CRITICAL:</span>
                  <span className="font-medium text-red-500">{place.criticalCount}件</span>
                </div>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* 地図タイプ選択 */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
          <div className="text-xs font-medium text-gray-700 mb-2">地図タイプ</div>
          <select
            value={mapType}
            onChange={(e) => setMapType(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Object.entries(GSI_TILE_LAYERS).map(([key, layer]) => (
              <option key={key} value={key}>
                {layer.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </MapContainer>
  );
}
