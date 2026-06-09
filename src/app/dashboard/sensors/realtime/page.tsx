// src/app/dashboard/sensors/realtime/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config/environment';
import { thresholdApi } from '@/lib/api/thresholds';
import type { Place } from '@/types/places';
import type { SensorThreshold } from '@/types/thresholds';

interface SensorCodeDefinition {
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

interface SensorDataRecord {
  id: number;
  tenant_id: string;
  area: number;
  spot: number;
  seq: number;
  tim: string;
  dynamic_data: Record<string, any>;
  sensor_img?: string;
  created_at: string;
}

interface TimeSeriesDataPoint {
  timestamp: string;
  [sensorCode: string]: string | number;
}

const COLOR_PALETTE = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#a4de6c', '#ffa07a', '#20b2aa', '#ff69b4',
];

type ViewMode = 'realtime' | 'history';

// API のセーフガード上限（バックエンドの limit 最大値と一致）
const SAFE_LIMIT = 1000;

// datetime-local 用にローカル時刻でフォーマット（toISOString は UTC 化されるため使えない）
const formatLocalDateTime = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const RealtimeSensorMonitoring: React.FC = () => {
  const { userProfile, currentTenantId } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sensorDefinitions, setSensorDefinitions] = useState<SensorCodeDefinition[]>([]);
  const [sensorThresholds, setSensorThresholds] = useState<SensorThreshold[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [selectedSensors, setSelectedSensors] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [showThresholds, setShowThresholds] = useState(true);

  // 表示モード（リアルタイム or 期間指定）
  const [viewMode, setViewMode] = useState<ViewMode>('realtime');

  // リアルタイムモードの表示期間（分単位）
  const [realtimeWindowMinutes, setRealtimeWindowMinutes] = useState<number>(60);

  // 期間指定モードの開始・終了日時
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // 表示範囲管理
  const [brushStartIndex, setBrushStartIndex] = useState<number>(0);
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>(undefined);
  const [zoomLevel, setZoomLevel] = useState(100); // パーセント（100 = 全体表示）

  // 古い fetchInitialData をキャンセルするための AbortController 参照
  // 期間を連続変更した際に、遅れて返ってくる古いリクエストが新しい結果を上書きしないようにする
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (userProfile) {
      fetchPlaces();
    }
  }, [userProfile, currentTenantId]);

  useEffect(() => {
    if (userProfile && selectedPlace) {
      fetchSensorDefinitions();
      fetchSensorThresholds();
    }
  }, [userProfile, selectedPlace, currentTenantId]);

  useEffect(() => {
    if (sensorDefinitions.length === 0 || !selectedPlace) return;

    // 期間指定モードで開始/終了が未設定なら fetch しない
    if (viewMode === 'history' && (!fromDate || !toDate)) {
      setTimeSeriesData([]);
      return;
    }

    fetchInitialData();
  }, [sensorDefinitions, selectedPlace, currentTenantId, viewMode, realtimeWindowMinutes, fromDate, toDate]);

  const fetchPlaces = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      setError(null);

      const apiUrl = `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places?limit=1000&sort_by=display_order&sort_order=asc`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'x-api-key': config.api.sensorApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      const placesData = result.data || [];
      setPlaces(placesData);

      if (placesData.length > 0 && !selectedPlace) {
        setSelectedPlace(placesData[0]);
      }
    } catch (err) {
      console.error('Failed to fetch places:', err);
      setError('場所情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchSensorDefinitions = async () => {
    if (!userProfile || !selectedPlace) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places/${selectedPlace.area}/${selectedPlace.spot}/sensor-code-definitions?is_active=true&limit=100`,
        {
          headers: {
            'x-api-key': config.api.sensorApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      const definitions = result.data || [];
      setSensorDefinitions(definitions);

      const defaultSelected = new Set<string>(
        definitions.slice(0, 3).map((d: SensorCodeDefinition) => d.sensor_code)
      );
      setSelectedSensors(defaultSelected);

      console.log('センサー定義を取得しました:', definitions.length);
    } catch (err) {
      console.error('センサー定義の取得に失敗:', err);
      setError('センサー定義の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchSensorThresholds = async () => {
    if (!userProfile || !selectedPlace) return;

    try {
      console.log('閾値を取得中:', {
        tenantId: currentTenantId,
        area: selectedPlace.area,
        spot: selectedPlace.spot,
      });

      const result = await thresholdApi.list(
        currentTenantId,
        selectedPlace.area,
        selectedPlace.spot,
        {
          is_active: true,
          limit: 100,
        }
      );

      setSensorThresholds(result.data || []);
      console.log('閾値を取得しました:', result.data.length);
    } catch (err) {
      console.error('閾値の取得に失敗:', err);
      // 閾値取得失敗はエラー表示しない（必須ではないため）
    }
  };

  const fetchInitialData = async () => {
    if (!userProfile || !selectedPlace) return;

    // 直前のリクエストをキャンセル（短期間に複数の期間変更が行われた場合のレース対策）
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      // URLパラメータを構築（バックエンドが area/spot/from/to/limit に対応）
      const params = new URLSearchParams();
      params.append('area', String(selectedPlace.area));
      params.append('spot', String(selectedPlace.spot));
      params.append('limit', String(SAFE_LIMIT));

      if (viewMode === 'realtime') {
        // 直近 N 分のデータを取得
        const fromTime = new Date(Date.now() - realtimeWindowMinutes * 60 * 1000);
        params.append('from', fromTime.toISOString());
      } else {
        // 期間指定モード（from/to は呼び出し前にバリデーション済み）
        params.append('from', new Date(fromDate).toISOString());
        params.append('to', new Date(toDate).toISOString());
      }

      const response = await fetch(
        `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/sensor-data?${params.toString()}`,
        {
          signal: controller.signal,
          headers: {
            'x-api-key': config.api.sensorApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      const records: SensorDataRecord[] = result.data || [];

      const processedData = processRecordsToTimeSeries(records);
      setTimeSeriesData(processedData);
      // データ置換と同時に Brush も再初期化（範囲外 endIndex の残留を防ぐ）
      setBrushStartIndex(0);
      setBrushEndIndex(processedData.length > 0 ? processedData.length - 1 : undefined);

      console.log(
        '初期データを取得しました:',
        records.length,
        viewMode === 'realtime' ? `(直近 ${realtimeWindowMinutes} 分)` : `(期間: ${fromDate} 〜 ${toDate})`
      );
    } catch (err) {
      // 後続のリクエストにより意図的にキャンセルされた場合は無視（古い結果で上書きしない）
      if ((err as Error).name === 'AbortError') {
        console.log('初期データ取得をキャンセル（新しいリクエストにより置換）');
        return;
      }
      console.error('初期データの取得に失敗:', err);
    }
  };

  const processRecordsToTimeSeries = useCallback((records: SensorDataRecord[]): TimeSeriesDataPoint[] => {
    const validSensorCodes = new Set(sensorDefinitions.map(d => d.sensor_code));
    
    return records
      .map(record => {
        const dataPoint: TimeSeriesDataPoint = {
          timestamp: record.tim || record.created_at,
        };

        if (record.dynamic_data) {
          Object.entries(record.dynamic_data).forEach(([code, value]) => {
            if (validSensorCodes.has(code)) {
              const numValue = typeof value === 'number' ? value : parseFloat(String(value));
              if (!isNaN(numValue)) {
                dataPoint[code] = numValue;
              }
            }
          });
        }

        return dataPoint;
      })
      .filter(point => Object.keys(point).length > 1)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [sensorDefinitions]);

  useEffect(() => {
    // 期間指定モードの場合はリアルタイム更新を無効化
    if (viewMode === 'history') {
      setConnectionStatus('disconnected');
      return;
    }

    if (!config.supabase.url || !config.supabase.anonKey) {
      console.error('Supabase設定が不足しています');
      setConnectionStatus('disconnected');
      setError('Supabase設定が不足しています。環境変数を確認してください。');
      return;
    }

    if (sensorDefinitions.length === 0 || !selectedPlace) {
      return;
    }

    setConnectionStatus('connecting');

    let realtimeClient: any = null;
    let channel: any = null;

    const setupRealtime = async () => {
      try {
        const { RealtimeClient } = await import('@supabase/realtime-js');

        realtimeClient = new RealtimeClient(
          `${config.supabase.url}/realtime/v1`,
          {
            params: {
              apikey: config.supabase.anonKey,
            },
          }
        );

        channel = realtimeClient.channel('sensor-data-changes');

        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sensor_data',
            filter: `tenant_id=eq.${currentTenantId}`,
          },
          (payload: any) => {
            const newRecord = payload.new as SensorDataRecord;

            if (newRecord.area !== selectedPlace.area || newRecord.spot !== selectedPlace.spot) {
              return;
            }

            setTimeSeriesData(prevData => {
              const newData = processRecordsToTimeSeries([newRecord]);

              if (newData.length === 0) {
                return prevData;
              }

              const combined = [...prevData, ...newData];

              // 表示期間のウィンドウ外（現在時刻 - window より古い）のデータを除去
              const cutoff = Date.now() - realtimeWindowMinutes * 60 * 1000;
              const pruned = combined.filter(p => new Date(p.timestamp).getTime() >= cutoff);

              return pruned;
            });
          }
        );

        channel.subscribe((status: string, err: any) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('接続エラー:', err);
            setConnectionStatus('disconnected');
            setError('Supabase Realtimeへの接続に失敗しました');
          } else if (status === 'TIMED_OUT') {
            console.error('接続タイムアウト');
            setConnectionStatus('disconnected');
            setError('Supabase Realtimeへの接続がタイムアウトしました');
          }
        });
      } catch (err) {
        console.error('Supabase Realtimeのセットアップエラー:', err);
        setConnectionStatus('disconnected');
        setError('Supabase Realtimeのセットアップに失敗しました');
      }
    };

    setupRealtime();

    return () => {
      if (realtimeClient && channel) {
        realtimeClient.removeChannel(channel);
        console.log('Supabase Realtime接続を終了しました');
      }
    };
  }, [sensorDefinitions, selectedPlace, processRecordsToTimeSeries, currentTenantId, viewMode, realtimeWindowMinutes]);

  // データ変更時にBrush範囲を更新
  useEffect(() => {
    if (timeSeriesData.length > 0) {
      // 新しいデータが来たら、最新データが見えるように調整
      const visibleCount = Math.max(10, Math.floor(timeSeriesData.length * (zoomLevel / 100)));
      const newEndIndex = timeSeriesData.length - 1;
      const newStartIndex = Math.max(0, newEndIndex - visibleCount + 1);

      // 自動で最新を追跡（ユーザーが手動で移動していない場合）
      if (brushEndIndex === undefined || brushEndIndex >= timeSeriesData.length - 2) {
        setBrushStartIndex(newStartIndex);
        setBrushEndIndex(newEndIndex);
      }
    }
  }, [timeSeriesData.length, zoomLevel]);

  // Brushの変更ハンドラー
  const handleBrushChange = (brushData: { startIndex?: number; endIndex?: number }) => {
    if (brushData.startIndex !== undefined) {
      setBrushStartIndex(brushData.startIndex);
    }
    if (brushData.endIndex !== undefined) {
      setBrushEndIndex(brushData.endIndex);
    }
  };

  // ズームレベル変更ハンドラー
  const handleZoomChange = (newZoomLevel: number) => {
    setZoomLevel(newZoomLevel);

    // 現在の中心を維持してズーム
    const currentCenter = brushEndIndex !== undefined
      ? Math.floor((brushStartIndex + brushEndIndex) / 2)
      : Math.floor(timeSeriesData.length / 2);

    const visibleCount = Math.max(10, Math.floor(timeSeriesData.length * (newZoomLevel / 100)));
    const halfVisible = Math.floor(visibleCount / 2);

    const newStartIndex = Math.max(0, currentCenter - halfVisible);
    const newEndIndex = Math.min(timeSeriesData.length - 1, newStartIndex + visibleCount - 1);

    setBrushStartIndex(newStartIndex);
    setBrushEndIndex(newEndIndex);
  };

  // マウスホイールでズーム
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 10 : -10; // スクロールダウンでズームアウト
    const newZoom = Math.max(10, Math.min(100, zoomLevel + delta));
    handleZoomChange(newZoom);
  }, [zoomLevel, brushStartIndex, brushEndIndex, timeSeriesData.length]);

  // 表示範囲をリセット（全体表示）
  const resetZoom = () => {
    setZoomLevel(100);
    setBrushStartIndex(0);
    setBrushEndIndex(timeSeriesData.length - 1);
  };

  // 最新データへ移動
  const goToLatest = () => {
    const visibleCount = brushEndIndex !== undefined
      ? brushEndIndex - brushStartIndex + 1
      : timeSeriesData.length;
    const newEndIndex = timeSeriesData.length - 1;
    const newStartIndex = Math.max(0, newEndIndex - visibleCount + 1);
    setBrushStartIndex(newStartIndex);
    setBrushEndIndex(newEndIndex);
  };

  // CSV出力機能
  const exportToCsv = () => {
    if (timeSeriesData.length === 0 || selectedSensors.size === 0) return;

    // 選択されているセンサーの定義を取得
    const selectedSensorDefs = sensorDefinitions.filter(d => selectedSensors.has(d.sensor_code));

    // ヘッダー行を作成（日時 + 各センサー）
    const headers = [
      '日時',
      ...selectedSensorDefs.map(def => `${def.name}${def.unit ? ` (${def.unit})` : ''}`)
    ];

    // データ行を作成
    const rows = timeSeriesData.map(point => {
      const timestamp = new Date(point.timestamp).toLocaleString('ja-JP');
      const values = selectedSensorDefs.map(def => {
        const value = point[def.sensor_code];
        if (value === undefined || value === null) return '';
        if (typeof value === 'number') return value.toString();
        return String(value);
      });
      return [timestamp, ...values];
    });

    // CSV文字列を生成（BOM付きでExcel対応）
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // ダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    // ファイル名を生成（場所名_日付.csv）
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const placeName = selectedPlace?.place_name || 'sensor_data';
    const fileName = `${placeName}_${dateStr}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleSensor = (sensorCode: string) => {
    setSelectedSensors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sensorCode)) {
        newSet.delete(sensorCode);
      } else {
        newSet.add(sensorCode);
      }
      return newSet;
    });
  };

  const toggleAllSensors = () => {
    if (selectedSensors.size === sensorDefinitions.length) {
      setSelectedSensors(new Set());
    } else {
      setSelectedSensors(new Set(sensorDefinitions.map(d => d.sensor_code)));
    }
  };

  // センサーコードに対応する閾値を取得
  const getThresholdForSensor = (sensorCode: string): SensorThreshold | undefined => {
    const definition = sensorDefinitions.find(d => d.sensor_code === sensorCode);
    if (!definition) return undefined;
    
    return sensorThresholds.find(t => t.sensor_code_definition_id === definition.id);
  };

  // Y軸の範囲を計算する関数（単一センサー用）
  const calculateYAxisDomain = (sensorCode: string): [number, number] | undefined => {
    if (timeSeriesData.length === 0) return undefined;

    // センサーデータから値を抽出
    const values = timeSeriesData
      .map(point => point[sensorCode])
      .filter(val => val !== undefined && typeof val === 'number') as number[];

    if (values.length === 0) return undefined;

    // データの最小値・最大値
    let minValue = Math.min(...values);
    let maxValue = Math.max(...values);

    // 閾値を考慮
    const threshold = getThresholdForSensor(sensorCode);
    if (threshold && showThresholds) {
      if (threshold.lower_limit !== null) {
        minValue = Math.min(minValue, threshold.lower_limit);
      }
      if (threshold.upper_limit !== null) {
        maxValue = Math.max(maxValue, threshold.upper_limit);
      }
    }

    // マージン追加（範囲の10%）
    const range = maxValue - minValue;
    const margin = range * 0.1 || 1; // 範囲が0の場合は1をマージンとする
    
    return [
      Math.floor((minValue - margin) * 100) / 100, // 小数点第2位で切り捨て
      Math.ceil((maxValue + margin) * 100) / 100   // 小数点第2位で切り上げ
    ];
  };

  // 複数センサーが選択されている場合の統合Y軸範囲を計算
  const calculateCombinedYAxisDomain = (): [number, number] | undefined => {
    const selectedSensorArray = Array.from(selectedSensors);
    if (selectedSensorArray.length === 0 || timeSeriesData.length === 0) {
      return undefined;
    }

    let globalMin = Infinity;
    let globalMax = -Infinity;

    selectedSensorArray.forEach(sensorCode => {
      const domain = calculateYAxisDomain(sensorCode);
      if (domain) {
        globalMin = Math.min(globalMin, domain[0]);
        globalMax = Math.max(globalMax, domain[1]);
      }
    });

    if (globalMin === Infinity || globalMax === -Infinity) {
      return undefined;
    }

    return [globalMin, globalMax];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm text-gray-600 mb-2">
            {new Date(label).toLocaleString('ja-JP')}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
              const definition = sensorDefinitions.find(d => d.sensor_code === entry.name);
              const threshold = getThresholdForSensor(entry.name);
              const isOutOfRange = threshold && (
                (threshold.upper_limit !== null && entry.value > threshold.upper_limit) ||
                (threshold.lower_limit !== null && entry.value < threshold.lower_limit)
              );
              
              return (
                <div key={index} className="flex items-center text-sm">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="font-medium">{definition?.name || entry.name}:</span>
                  <span className={`ml-1 ${isOutOfRange ? 'text-red-600 font-bold' : ''}`}>
                    {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                    {definition?.unit && ` ${definition.unit}`}
                  </span>
                  {isOutOfRange && (
                    <span className="ml-2 text-xs text-red-600">⚠️ 閾値超過</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // X 軸の目盛り表示。データが複数日にまたがる場合は MM/DD HH:MM、同日内なら HH:MM
  const formatXAxisTick = (timestamp: string | number): string => {
    const date = new Date(timestamp);
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');

    if (timeSeriesData.length >= 2) {
      const first = new Date(timeSeriesData[0].timestamp);
      const last = new Date(timeSeriesData[timeSeriesData.length - 1].timestamp);
      const sameDay =
        first.getFullYear() === last.getFullYear() &&
        first.getMonth() === last.getMonth() &&
        first.getDate() === last.getDate();
      if (!sameDay) {
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${mm}/${dd} ${hh}:${mi}`;
      }
    }
    return `${hh}:${mi}`;
  };

  if (loading && places.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">リアルタイムセンサー監視</h1>
              <p className="text-gray-600 mt-1">センサーデータをリアルタイムで監視・可視化</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {viewMode === 'history' ? (
                  <>
                    <div className="w-3 h-3 rounded-full mr-2 bg-blue-500" />
                    <span className="text-sm text-blue-600">期間指定モード</span>
                  </>
                ) : (
                  <>
                    <div
                      className={`w-3 h-3 rounded-full mr-2 ${
                        connectionStatus === 'connected'
                          ? 'bg-green-500'
                          : connectionStatus === 'connecting'
                          ? 'bg-yellow-500 animate-pulse'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="text-sm text-gray-600">
                      {connectionStatus === 'connected' ? '接続中' : connectionStatus === 'connecting' ? '接続中...' : '切断'}
                    </span>
                  </>
                )}
              </div>
              <div className="text-sm text-gray-500">データ数: {timeSeriesData.length}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">場所を選択</label>
              {places.length === 0 ? (
                <div className="text-sm text-gray-500">場所が登録されていません。先に場所を登録してください。</div>
              ) : (
                <select
                  value={selectedPlace ? `${selectedPlace.area}-${selectedPlace.spot}` : ''}
                  onChange={(e) => {
                    const [area, spot] = e.target.value.split('-').map(Number);
                    const place = places.find(p => p.area === area && p.spot === spot);
                    setSelectedPlace(place || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {places.map((place) => (
                    <option key={`${place.area}-${place.spot}`} value={`${place.area}-${place.spot}`}>
                      {place.place_name} (Area: {place.area}, Spot: {place.spot})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showThresholds}
                  onChange={(e) => setShowThresholds(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">閾値を表示</span>
              </label>
            </div>
          </div>

          {/* 表示モードセクション */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-6 mb-4">
              <span className="text-sm font-medium text-gray-700">表示モード:</span>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="viewMode"
                  value="realtime"
                  checked={viewMode === 'realtime'}
                  onChange={() => setViewMode('realtime')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">リアルタイム表示</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="viewMode"
                  value="history"
                  checked={viewMode === 'history'}
                  onChange={() => setViewMode('history')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">期間指定表示</span>
              </label>
            </div>

            {viewMode === 'realtime' ? (
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">表示期間</label>
                  <select
                    value={realtimeWindowMinutes}
                    onChange={(e) => setRealtimeWindowMinutes(Number(e.target.value))}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value={30}>直近30分</option>
                    <option value={60}>直近1時間</option>
                    <option value={180}>直近3時間</option>
                    <option value={1440}>直近24時間</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 pb-2">
                  指定した期間のデータを表示し、新規データをリアルタイムに追加します。
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">開始日時</label>
                    <input
                      type="datetime-local"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">終了日時</label>
                    <input
                      type="datetime-local"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <button
                      onClick={() => {
                        const now = new Date();
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        setFromDate(formatLocalDateTime(today));
                        setToDate(formatLocalDateTime(now));
                      }}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      今日
                    </button>
                    <button
                      onClick={() => {
                        const now = new Date();
                        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        setFromDate(formatLocalDateTime(yesterday));
                        setToDate(formatLocalDateTime(now));
                      }}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      過去24時間
                    </button>
                    <button
                      onClick={() => {
                        const now = new Date();
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        setFromDate(formatLocalDateTime(weekAgo));
                        setToDate(formatLocalDateTime(now));
                      }}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      過去1週間
                    </button>
                    <button
                      onClick={() => {
                        setFromDate('');
                        setToDate('');
                      }}
                      className="px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
                    >
                      クリア
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  期間指定モードではリアルタイム更新が無効になります。
                  {(!fromDate || !toDate) && ' 開始日時と終了日時を指定してください。'}
                </p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {selectedPlace && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">センサー選択</h2>
                  <button onClick={toggleAllSensors} className="text-sm text-blue-600 hover:text-blue-700">
                    {selectedSensors.size === sensorDefinitions.length ? '全解除' : '全選択'}
                  </button>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {sensorDefinitions.map((def, index) => {
                    const threshold = getThresholdForSensor(def.sensor_code);
                    
                    return (
                      <label
                        key={def.sensor_code}
                        className="flex items-start p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSensors.has(def.sensor_code)}
                          onChange={() => toggleSensor(def.sensor_code)}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLOR_PALETTE[index % COLOR_PALETTE.length] }}
                            />
                            <span className="text-sm font-medium text-gray-900">{def.name}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {def.sensor_code}
                            {def.unit && ` (${def.unit})`}
                          </div>
                          {def.description && (
                            <div className="text-xs text-gray-400 mt-1 line-clamp-2">{def.description}</div>
                          )}
                          {threshold && showThresholds && (
                            <div className="mt-2 text-xs bg-gray-50 rounded p-2 space-y-1">
                              {threshold.upper_limit !== null && (
                                <div className="flex items-center text-red-600">
                                  <span className="mr-1">▲</span>
                                  上限: {threshold.upper_limit}{def.unit}
                                </div>
                              )}
                              {threshold.lower_limit !== null && (
                                <div className="flex items-center text-orange-600">
                                  <span className="mr-1">▼</span>
                                  下限: {threshold.lower_limit}{def.unit}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {sensorDefinitions.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">この場所にセンサー定義がありません</div>
                )}
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">時系列グラフ</h2>

                  {/* ズームコントロール */}
                  {timeSeriesData.length > 0 && (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">ズーム:</span>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={zoomLevel}
                          onChange={(e) => handleZoomChange(Number(e.target.value))}
                          className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm text-gray-500 w-10">{zoomLevel}%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={resetZoom}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                          title="全体表示"
                        >
                          全体
                        </button>
                        <button
                          onClick={goToLatest}
                          className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                          title="最新データへ移動"
                        >
                          最新へ
                        </button>
                        <button
                          onClick={exportToCsv}
                          disabled={timeSeriesData.length === 0 || selectedSensors.size === 0}
                          className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          title="CSVダウンロード"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          CSV
                        </button>
                      </div>
                      <div className="text-xs text-gray-400">
                        {brushEndIndex !== undefined && (
                          <>表示: {brushEndIndex - brushStartIndex + 1}/{timeSeriesData.length}件</>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {timeSeriesData.length === 0 ? (
                  <div className="h-96 flex items-center justify-center text-gray-500">
                    データがありません。センサーデータの受信を待っています...
                  </div>
                ) : selectedSensors.size === 0 ? (
                  <div className="h-96 flex items-center justify-center text-gray-500">
                    表示するセンサーを選択してください
                  </div>
                ) : (
                  <div className="h-96" onWheel={handleWheel}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeSeriesData} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={formatXAxisTick}
                          tick={{ fontSize: 12 }}
                          interval="preserveStartEnd"
                          minTickGap={30}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          domain={calculateCombinedYAxisDomain() || ['auto', 'auto']}
                          allowDataOverflow={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />

                        {/* センサーデータの線 */}
                        {Array.from(selectedSensors).map((sensorCode) => {
                          const sensorIndex = sensorDefinitions.findIndex(d => d.sensor_code === sensorCode);
                          return (
                            <Line
                              key={sensorCode}
                              type="monotone"
                              dataKey={sensorCode}
                              name={sensorCode}
                              stroke={COLOR_PALETTE[sensorIndex % COLOR_PALETTE.length]}
                              dot={false}
                              isAnimationActive={false}
                              connectNulls
                            />
                          );
                        })}

                        {/* 閾値の線（上限・下限） */}
                        {showThresholds && Array.from(selectedSensors).map((sensorCode) => {
                          const threshold = getThresholdForSensor(sensorCode);
                          if (!threshold) return null;

                          return (
                            <React.Fragment key={`threshold-${sensorCode}`}>
                              {threshold.upper_limit !== null && (
                                <ReferenceLine
                                  y={threshold.upper_limit}
                                  stroke="#ef4444"
                                  strokeDasharray="5 5"
                                  strokeWidth={2}
                                  label={{
                                    value: `${sensorCode} 上限: ${threshold.upper_limit}`,
                                    position: 'insideTopRight',
                                    fill: '#ef4444',
                                    fontSize: 11,
                                  }}
                                />
                              )}
                              {threshold.lower_limit !== null && (
                                <ReferenceLine
                                  y={threshold.lower_limit}
                                  stroke="#f97316"
                                  strokeDasharray="5 5"
                                  strokeWidth={2}
                                  label={{
                                    value: `${sensorCode} 下限: ${threshold.lower_limit}`,
                                    position: 'insideBottomRight',
                                    fill: '#f97316',
                                    fontSize: 11,
                                  }}
                                />
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* ブラシ（スライダー）でドラッグ移動・範囲選択 */}
                        <Brush
                          dataKey="timestamp"
                          height={30}
                          stroke="#8884d8"
                          startIndex={brushStartIndex}
                          endIndex={brushEndIndex}
                          onChange={handleBrushChange}
                          tickFormatter={formatXAxisTick}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {timeSeriesData.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">最新データ</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Array.from(selectedSensors).map(sensorCode => {
                        const definition = sensorDefinitions.find(d => d.sensor_code === sensorCode);
                        const latestValue = timeSeriesData[timeSeriesData.length - 1]?.[sensorCode];
                        const threshold = getThresholdForSensor(sensorCode);
                        
                        // 閾値チェック
                        const isOutOfRange = threshold && latestValue !== undefined && (
                          (threshold.upper_limit !== null && Number(latestValue) > threshold.upper_limit) ||
                          (threshold.lower_limit !== null && Number(latestValue) < threshold.lower_limit)
                        );
                        
                        return (
                          <div 
                            key={sensorCode} 
                            className={`rounded-lg p-3 ${isOutOfRange ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}
                          >
                            <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                              <span>{definition?.name}</span>
                              {isOutOfRange && (
                                <span className="text-red-600 font-bold">⚠️</span>
                              )}
                            </div>
                            <div className={`text-lg font-semibold ${isOutOfRange ? 'text-red-700' : 'text-gray-900'}`}>
                              {latestValue !== undefined
                                ? typeof latestValue === 'number'
                                  ? latestValue.toFixed(2)
                                  : latestValue
                                : '-'}
                              {definition?.unit && latestValue !== undefined && (
                                <span className="text-sm text-gray-600 ml-1">{definition.unit}</span>
                              )}
                            </div>
                            {threshold && showThresholds && (
                              <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                                {threshold.upper_limit !== null && (
                                  <div>上限: {threshold.upper_limit}{definition?.unit}</div>
                                )}
                                {threshold.lower_limit !== null && (
                                  <div>下限: {threshold.lower_limit}{definition?.unit}</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeSensorMonitoring;