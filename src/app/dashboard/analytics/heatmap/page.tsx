// src/app/dashboard/analytics/heatmap/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config/environment';
import { alertHistoryApi } from '@/lib/api/alerts';
import type { Place } from '@/types/places';
import type { AlertHistory } from '@/types/alerts';

// LeafletMapコンポーネントを動的インポート（SSR無効化）
const HeatmapMap = dynamic(() => import('@/components/analytics/HeatmapMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <div className="text-sm text-gray-600">地図を読み込み中...</div>
      </div>
    </div>
  ),
});

// 期間選択のオプション
const PERIOD_OPTIONS = [
  { value: 7, label: '過去7日' },
  { value: 14, label: '過去14日' },
  { value: 30, label: '過去30日' },
  { value: 90, label: '過去90日' },
];

// 表示モード
type ViewMode = 'marker' | 'heatmap';

// 場所ごとのアラート集計データ
export interface PlaceAlertData {
  area: number;
  spot: number;
  place_name: string;
  lat: number;
  lng: number;
  totalCount: number;
  warningCount: number;
  criticalCount: number;
}

export default function AnalyticsHeatmapPage() {
  const { currentTenantId } = useAuth();
  const [period, setPeriod] = useState(30);
  const [viewMode, setViewMode] = useState<ViewMode>('marker');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [mounted, setMounted] = useState(false);

  // クライアントサイドでのマウント確認
  useEffect(() => {
    setMounted(true);
  }, []);

  // 日付範囲を計算
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };
  }, [period]);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      if (!currentTenantId || !mounted) return;

      setLoading(true);
      setError(null);

      try {
        // 場所一覧を取得
        const placesParams = new URLSearchParams({
          limit: '1000',
          sort_by: 'display_order',
          sort_order: 'asc',
        });

        const placesUrl = `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places?${placesParams.toString()}`;

        const placesResponse = await fetch(placesUrl, {
          headers: {
            'x-api-key': config.api.sensorApiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!placesResponse.ok) {
          throw new Error('場所データの取得に失敗しました');
        }

        const placesResult = await placesResponse.json();
        setPlaces(placesResult.data || []);

        // アラート履歴を取得
        const alertResponse = await alertHistoryApi.list(currentTenantId, {
          start_date: dateRange.start,
          end_date: dateRange.end,
          limit: 1000,
        });
        setAlertHistory(alertResponse.data || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentTenantId, dateRange, mounted]);

  // 場所ごとのアラート集計
  const placeAlertData: PlaceAlertData[] = useMemo(() => {
    // 座標を持つ場所のみフィルタ
    const placesWithCoords = places.filter((p) => p.lat && p.lng);

    // アラートを場所ごとに集計
    const alertCountMap = new Map<string, { total: number; warning: number; critical: number }>();

    alertHistory.forEach((alert) => {
      const key = `${alert.area}-${alert.spot}`;
      const existing = alertCountMap.get(key) || { total: 0, warning: 0, critical: 0 };
      existing.total += 1;
      if (alert.alert_level === 'WARNING') existing.warning += 1;
      if (alert.alert_level === 'CRITICAL') existing.critical += 1;
      alertCountMap.set(key, existing);
    });

    // 場所データとアラート集計を統合
    return placesWithCoords.map((place) => {
      const key = `${place.area}-${place.spot}`;
      const counts = alertCountMap.get(key) || { total: 0, warning: 0, critical: 0 };

      return {
        area: place.area,
        spot: place.spot,
        place_name: place.place_name,
        lat: place.lat!,
        lng: place.lng!,
        totalCount: counts.total,
        warningCount: counts.warning,
        criticalCount: counts.critical,
      };
    });
  }, [places, alertHistory]);

  // 統計サマリー
  const summary = useMemo(() => {
    const totalAlerts = alertHistory.length;
    const placesWithAlerts = placeAlertData.filter((p) => p.totalCount > 0).length;
    const maxAlerts = Math.max(...placeAlertData.map((p) => p.totalCount), 0);
    const criticalPlaces = placeAlertData.filter((p) => p.criticalCount > 0).length;

    return {
      totalAlerts,
      placesWithAlerts,
      maxAlerts,
      criticalPlaces,
    };
  }, [alertHistory, placeAlertData]);

  // クライアントサイドレンダリングのみ
  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* ヘッダー */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/dashboard/analytics" className="hover:text-blue-600">
                分析・レポート
              </Link>
              <span>/</span>
              <span>エリア別マップ</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">エリア別アラートマップ</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* 期間選択 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">期間:</label>
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 表示モード切り替え */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('marker')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'marker'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                マーカー
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'heatmap'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ヒートマップ
              </button>
            </div>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">総アラート数</div>
            <div className="text-xl font-bold text-gray-900">{summary.totalAlerts}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">アラート発生場所</div>
            <div className="text-xl font-bold text-blue-600">
              {summary.placesWithAlerts}
              <span className="text-sm font-normal text-gray-500">
                {' '}/ {placeAlertData.length}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">最大アラート数</div>
            <div className="text-xl font-bold text-amber-500">{summary.maxAlerts}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">CRITICAL発生場所</div>
            <div className="text-xl font-bold text-red-500">{summary.criticalPlaces}</div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ（地図エリア） */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <div className="text-sm text-gray-600">データを読み込み中...</div>
              </div>
            </div>
          ) : placeAlertData.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                <p className="text-gray-500">座標が設定された場所がありません</p>
                <p className="text-sm text-gray-400 mt-1">
                  場所定義ページで座標を設定してください
                </p>
              </div>
            </div>
          ) : (
            <HeatmapMap data={placeAlertData} viewMode={viewMode} />
          )}
        </div>
      </div>

      {/* フッター（凡例） */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">アラート件数:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>0件</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>1-5件</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>6-10件</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>11件以上</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            表示期間: {new Date(dateRange.start).toLocaleDateString('ja-JP')} 〜{' '}
            {new Date(dateRange.end).toLocaleDateString('ja-JP')}
          </div>
        </div>
      </div>
    </div>
  );
}
