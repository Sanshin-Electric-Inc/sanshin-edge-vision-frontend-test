// src/app/dashboard/places/map/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { config, debugLog } from '@/lib/config/environment';
import type { MapData, MapConfig, PlaceWithSensorData } from '@/types/map';

// LeafletMapを動的インポート（SSR無効化）
const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <div className="text-sm text-gray-600">地図を読み込み中...</div>
      </div>
    </div>
  )
});

// デフォルトマップ設定
const DEFAULT_MAP_CONFIG: MapConfig = {
  center: config.map.defaultCenter,
  zoom: config.map.defaultZoom,
  mapType: config.map.defaultMapType,
  showSensorData: true,
  showClusters: config.map.clusterEnabled,
  autoRefresh: config.map.autoRefresh,
  refreshInterval: config.map.refreshInterval,
  maxZoom: config.map.maxZoom,
  minZoom: config.map.minZoom,
};

// ========================================
// API データ取得関数
// ========================================

/**
 * 場所一覧とセンサーデータを取得
 */
const fetchMapData = async (tenantId: string): Promise<MapData> => {
  try {
    // 1. 場所一覧を取得
    const placesParams = new URLSearchParams({
      limit: '1000',
      sort_by: 'display_order',
      sort_order: 'asc',
    });
    
    const placesUrl = `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${tenantId}/places?${placesParams.toString()}`;
    
    const placesResponse = await fetch(placesUrl, {
      headers: {
        'x-api-key': config.api.sensorApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!placesResponse.ok) {
      throw new Error(`場所データの取得に失敗: ${placesResponse.status}`);
    }

    const placesResult = await placesResponse.json();
    const places = placesResult.data || [];
    
    // 座標を持つ場所のみをフィルタ
    const placesWithCoords = places.filter((p: any) => p.lat && p.lng);

    // 2. センサーデータを取得（最新1000件）
    const sensorParams = new URLSearchParams({
      limit: '1000',
      offset: '0',
    });
    
    const sensorUrl = `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${tenantId}/sensor-data?${sensorParams.toString()}`;
    
    const sensorResponse = await fetch(sensorUrl, {
      headers: {
        'x-api-key': config.api.sensorApiKey,
        'Content-Type': 'application/json',
      },
    });

    const sensorDataMap = new Map<string, any>();
    
    if (sensorResponse.ok) {
      const sensorResult = await sensorResponse.json();
      const sensorData = sensorResult.data || [];
      
      // 各場所の最新データをマップに保存
      sensorData.forEach((data: any) => {
        const key = `${data.area}-${data.spot}`;
        const existing = sensorDataMap.get(key);
        
        // より新しいデータで更新
        if (!existing || new Date(data.tim) > new Date(existing.tim)) {
          sensorDataMap.set(key, data);
        }
      });
    }

    // 3. 場所データとセンサーデータを統合
    const placesWithSensorData: PlaceWithSensorData[] = placesWithCoords.map((place: any) => {
      const key = `${place.area}-${place.spot}`;
      const latestSensorData = sensorDataMap.get(key);
      
      // センサーデータの品質を判定（簡易版）
      let dataQuality: 'excellent' | 'good' | 'warning' | 'error' = 'good';
      if (latestSensorData) {
        const hoursSinceUpdate = (Date.now() - new Date(latestSensorData.tim).getTime()) / (1000 * 60 * 60);
        if (hoursSinceUpdate < 0.5) {
          dataQuality = 'excellent';
        } else if (hoursSinceUpdate < 2) {
          dataQuality = 'good';
        } else if (hoursSinceUpdate < 6) {
          dataQuality = 'warning';
        } else {
          dataQuality = 'error';
        }
      }
      
      return {
        area: place.area,
        spot: place.spot,
        tenant_id: place.tenant_id,
        place_name: place.place_name,
        lat: place.lat,
        lng: place.lng,
        display_order: place.display_order,
        latest_sensor_data: latestSensorData ? {
          id: BigInt(latestSensorData.id),
          tim: latestSensorData.tim,
          dynamic_data: latestSensorData.dynamic_data || {},
          data_quality: dataQuality,
        } : undefined,
        sensor_count: latestSensorData ? Object.keys(latestSensorData.dynamic_data || {}).length : 0,
        last_updated: latestSensorData?.tim,
      };
    });

    // 4. 統計情報を計算
    const now = Date.now();
    const summary = {
      total_places: placesWithSensorData.length,
      active_places: placesWithSensorData.filter(p => p.sensor_count > 0).length,
      places_with_data: placesWithSensorData.filter(p => p.latest_sensor_data).length,
      places_with_recent_data: placesWithSensorData.filter(p => {
        if (!p.last_updated) return false;
        const hoursSinceUpdate = (now - new Date(p.last_updated).getTime()) / (1000 * 60 * 60);
        return hoursSinceUpdate <= 1;
      }).length,
    };

    return {
      places: placesWithSensorData,
      summary,
      last_updated: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('地図データ取得エラー:', error);
    throw error;
  }
};

// ========================================
// メインページコンポーネント
// ========================================
export default function MapPage() {
  const { userProfile, currentTenantId } = useAuth();
  
  // 状態管理
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [mapConfig, setMapConfig] = useState<MapConfig>(DEFAULT_MAP_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithSensorData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(true);

  // クライアントサイドでのマウント確認
  useEffect(() => {
    setMounted(true);
  }, []);

  // 地図データ取得
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      debugLog('Fetching map data from API...');
      
      const data = await fetchMapData(currentTenantId);
      
      setMapData(data);
      debugLog('Map data loaded successfully:', data.summary);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '地図データの取得に失敗しました';
      setError(errorMessage);
      debugLog('Map data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  // 初期データ読み込み
  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [fetchData, mounted]);

  // 自動更新処理
  useEffect(() => {
    if (!mapConfig.autoRefresh || !mounted) return;

    const interval = setInterval(() => {
      debugLog('Auto-refreshing map data...');
      fetchData();
    }, mapConfig.refreshInterval);

    return () => clearInterval(interval);
  }, [mapConfig.autoRefresh, mapConfig.refreshInterval, fetchData, mounted]);

  // 地図設定変更ハンドラ
  const handleConfigChange = useCallback((updates: Partial<MapConfig>) => {
    setMapConfig(prev => {
      const newConfig = { ...prev, ...updates };
      debugLog('Map config updated:', updates);
      return newConfig;
    });
  }, []);

  // 場所クリックハンドラ
  const handlePlaceClick = useCallback((place: PlaceWithSensorData) => {
    setSelectedPlace(place);
    debugLog('Place selected:', place.place_name);
  }, []);

  // 地図イベントハンドラ
  const handleMapEvent = useCallback((event: any) => {
    debugLog('Map event:', event.type, event);
  }, []);

  // クライアントサイドレンダリングのみ
  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">アプリケーションを読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* ヘッダー */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">センサー地図</h1>
            <p className="mt-1 text-sm text-gray-600">
              IoTセンサーの位置とリアルタイムデータを地図上で確認
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* サイドパネル切り替え */}
            <button
              onClick={() => setShowSidePanel(!showSidePanel)}
              className="btn-secondary"
            >
              {showSidePanel ? 'パネルを隠す' : 'パネルを表示'}
            </button>
            
            {/* 更新ボタン */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  更新中...
                </>
              ) : (
                '更新'
              )}
            </button>
            
            {/* 場所管理ページへのリンク */}
            <Link
              href="/dashboard/places"
              className="btn-secondary"
            >
              場所管理
            </Link>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {/* サイドパネル */}
        {showSidePanel && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="flex-shrink-0 p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">場所一覧</h2>
              {mapData && (
                <div className="mt-2 text-sm text-gray-600">
                  {mapData.summary.total_places}箇所中 {mapData.summary.active_places}箇所がアクティブ
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-center text-red-600 text-sm">
                  {error}
                </div>
              ) : mapData ? (
                <div className="space-y-2">
                  {mapData.places.map((place) => (
                    <div
                      key={`${place.area}-${place.spot}`}
                      className={`p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedPlace?.area === place.area && selectedPlace?.spot === place.spot
                          ? 'bg-blue-50 border-blue-300'
                          : ''
                      }`}
                      onClick={() => handlePlaceClick(place)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {place.place_name}
                          </h3>
                          <div className="text-xs text-gray-500 mt-1">
                            {place.area}-{place.spot} | センサー数: {place.sensor_count}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          {place.latest_sensor_data ? (
                            <div className={`w-3 h-3 rounded-full ${
                              place.latest_sensor_data.data_quality === 'excellent' ? 'bg-green-500' :
                              place.latest_sensor_data.data_quality === 'good' ? 'bg-blue-500' :
                              place.latest_sensor_data.data_quality === 'warning' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-gray-300" />
                          )}
                        </div>
                      </div>
                      
                      {place.latest_sensor_data && (
                        <div className="mt-2 text-xs text-gray-600">
                          最終更新: {new Date(place.latest_sensor_data.tim).toLocaleString('ja-JP')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* 地図エリア */}
        <div className="flex-1 relative">
          {mounted && (
            <LeafletMap
              mapData={mapData}
              config={mapConfig}
              onConfigChange={handleConfigChange}
              onPlaceClick={handlePlaceClick}
              onMapEvent={handleMapEvent}
            />
          )}

          {/* エラー表示 */}
          {error && (
            <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 z-[1000]">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    エラーが発生しました
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={fetchData}
                      className="bg-red-100 px-3 py-1 rounded text-sm text-red-800 hover:bg-red-200"
                    >
                      再試行
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* フッター統計 */}
      {mapData && (
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-6">
              <span>総場所数: {mapData.summary.total_places}</span>
              <span>アクティブ: {mapData.summary.active_places}</span>
              <span>データあり: {mapData.summary.places_with_data}</span>
              <span>最新データあり: {mapData.summary.places_with_recent_data}</span>
            </div>
            <div>
              最終更新: {new Date(mapData.last_updated).toLocaleString('ja-JP')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}