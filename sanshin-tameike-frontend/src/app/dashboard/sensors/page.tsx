// src/app/dashboard/sensors/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { config } from '@/lib/config/environment';
import type { Place } from '@/types/places';

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

interface ApiResponse {
  count: number;
  data: SensorCodeDefinition[];
}

export default function SensorListPage() {
  const { userProfile, currentTenantId } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sensors, setSensors] = useState<SensorCodeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    is_active: true,
    data_type: '',
    sensor_code: '',
  });

  useEffect(() => {
    if (userProfile) {
      fetchPlaces();
    }
  }, [userProfile, currentTenantId]);

  useEffect(() => {
    if (userProfile && selectedPlace) {
      fetchSensors();
    }
  }, [userProfile, selectedPlace, filter, currentTenantId]);

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
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const placesData = result.data || [];
      setPlaces(placesData);

      if (placesData.length > 0 && !selectedPlace) {
        setSelectedPlace(placesData[0]);
      }
    } catch (err) {
      console.error('Failed to fetch places:', err);
      setError(err instanceof Error ? err.message : '場所情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchSensors = async () => {
    if (!userProfile || !selectedPlace) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filter.is_active !== null) {
        params.append('is_active', filter.is_active.toString());
      }
      if (filter.data_type) {
        params.append('data_type', filter.data_type);
      }
      if (filter.sensor_code) {
        params.append('sensor_code', filter.sensor_code);
      }
      params.append('limit', '100');

      const apiUrl = `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places/${selectedPlace.area}/${selectedPlace.spot}/sensor-code-definitions?${params.toString()}`;
      
      console.log('Fetching sensors from:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'x-api-key': config.api.sensorApiKey,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const result: ApiResponse = await response.json();
      console.log('Fetched sensors:', result);
      setSensors(result.data || []);
    } catch (err) {
      console.error('Failed to fetch sensors:', err);
      setError(err instanceof Error ? err.message : 'センサー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getDataTypeLabel = (dataType: string): string => {
    const labels: Record<string, string> = {
      string: '文字列',
      int: '整数',
      float: '小数',
      boolean: '真偽値',
    };
    return labels[dataType] || dataType;
  };

  const getDataTypeBadgeColor = (dataType: string): string => {
    const colors: Record<string, string> = {
      string: 'bg-blue-100 text-blue-800',
      int: 'bg-green-100 text-green-800',
      float: 'bg-purple-100 text-purple-800',
      boolean: 'bg-yellow-100 text-yellow-800',
    };
    return colors[dataType] || 'bg-gray-100 text-gray-800';
  };

  if (loading && places.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">センサー一覧</h1>
          <p className="text-gray-600 mt-1">
            登録されているセンサーコード定義の一覧
          </p>
        </div>
        <div className="text-sm text-gray-500">
          全 {sensors.length} 件
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          場所を選択
        </label>
        {places.length === 0 ? (
          <div className="text-sm text-gray-500">
            場所が登録されていません。先に場所を登録してください。
          </div>
        ) : (
          <select
            value={selectedPlace ? `${selectedPlace.area}-${selectedPlace.spot}` : ''}
            onChange={(e) => {
              const [area, spot] = e.target.value.split('-').map(Number);
              const place = places.find(p => p.area === area && p.spot === spot);
              setSelectedPlace(place || null);
            }}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {places.map((place) => (
              <option key={`${place.area}-${place.spot}`} value={`${place.area}-${place.spot}`}>
                {place.place_name} (Area: {place.area}, Spot: {place.spot})
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedPlace && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">フィルター</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状態</label>
              <select
                value={filter.is_active ? 'true' : 'false'}
                onChange={(e) => setFilter({ ...filter, is_active: e.target.value === 'true' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">アクティブのみ</option>
                <option value="false">非アクティブのみ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">データ型</label>
              <select
                value={filter.data_type}
                onChange={(e) => setFilter({ ...filter, data_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                <option value="string">文字列</option>
                <option value="int">整数</option>
                <option value="float">小数</option>
                <option value="boolean">真偽値</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">センサーコード検索</label>
              <input
                type="text"
                value={filter.sensor_code}
                onChange={(e) => setFilter({ ...filter, sensor_code: e.target.value })}
                placeholder="部分一致で検索"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

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
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">センサーコード</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">データ型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">単位</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登録日時</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sensors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p>センサーが見つかりませんでした</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sensors.map((sensor) => (
                    <tr key={sensor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sensor.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{sensor.sensor_code}</code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{sensor.name}</div>
                        {sensor.description && (
                          <div className="text-xs text-gray-500 mt-1">{sensor.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDataTypeBadgeColor(sensor.data_type)}`}>
                          {getDataTypeLabel(sensor.data_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sensor.unit || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sensor.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            アクティブ
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            非アクティブ
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(sensor.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}