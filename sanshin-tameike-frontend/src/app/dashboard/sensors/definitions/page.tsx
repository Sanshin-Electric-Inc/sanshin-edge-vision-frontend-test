// src/app/dashboard/sensors/definitions/page.tsx
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

type ModalMode = 'create' | 'edit' | 'view' | null;

export default function SensorDefinitionsPage() {
  const { userProfile, currentTenantId } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sensorDefinitions, setSensorDefinitions] = useState<SensorCodeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedSensor, setSelectedSensor] = useState<SensorCodeDefinition | null>(null);
  const [formData, setFormData] = useState<{
    sensor_code: string;
    name: string;
    description: string;
    data_type: 'string' | 'int' | 'float' | 'boolean';
    unit: string;
    is_active: boolean;
  }>({
    sensor_code: '',
    name: '',
    description: '',
    data_type: 'float',
    unit: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userProfile) {
      fetchPlaces();
    }
  }, [userProfile, currentTenantId]);

  useEffect(() => {
    if (userProfile && selectedPlace) {
      fetchSensorDefinitions();
    }
  }, [userProfile, selectedPlace, currentTenantId]);

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

      const apiUrl = `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places/${selectedPlace.area}/${selectedPlace.spot}/sensor-code-definitions?limit=100`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'x-api-key': config.api.sensorApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      setSensorDefinitions(result.data || []);
    } catch (err) {
      console.error('Failed to fetch sensors:', err);
      setError('センサー定義の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: ModalMode, sensor?: SensorCodeDefinition) => {
    setModalMode(mode);
    setFormErrors({});
    
    if (mode === 'create') {
      setFormData({
        sensor_code: '',
        name: '',
        description: '',
        data_type: 'float',
        unit: '',
        is_active: true,
      });
      setSelectedSensor(null);
    } else if (sensor) {
      setSelectedSensor(sensor);
      if (mode === 'edit') {
        setFormData({
          sensor_code: sensor.sensor_code,
          name: sensor.name,
          description: sensor.description,
          data_type: sensor.data_type,
          unit: sensor.unit,
          is_active: sensor.is_active,
        });
      }
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedSensor(null);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.sensor_code.trim()) {
      errors.sensor_code = 'センサーコードは必須です';
    } else if (formData.sensor_code.length > 100) {
      errors.sensor_code = 'センサーコードは100文字以内で入力してください';
    }

    if (!formData.name.trim()) {
      errors.name = '名称は必須です';
    } else if (formData.name.length > 255) {
      errors.name = '名称は255文字以内で入力してください';
    }

    if (formData.description.length > 1000) {
      errors.description = '説明は1000文字以内で入力してください';
    }

    if (formData.unit.length > 50) {
      errors.unit = '単位は50文字以内で入力してください';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !userProfile || !selectedPlace) return;

    try {
      setSubmitting(true);
      setError(null);

      const requestBody = {
        ...formData,
        area: selectedPlace.area,
        spot: selectedPlace.spot,
      };

      const url = modalMode === 'create'
        ? `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places/${selectedPlace.area}/${selectedPlace.spot}/sensor-code-definitions`
        : `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places/${selectedPlace.area}/${selectedPlace.spot}/sensor-code-definitions/${selectedSensor?.id}`;

      const response = await fetch(url, {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: {
          'x-api-key': config.api.sensorApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'エラーが発生しました');
      }

      await fetchSensorDefinitions();
      closeModal();
    } catch (err) {
      console.error('Failed to save sensor:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (sensor: SensorCodeDefinition) => {
    if (!confirm(`「${sensor.name}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return;
    }

    if (!selectedPlace) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(
        `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places/${selectedPlace.area}/${selectedPlace.spot}/sensor-code-definitions/${sensor.id}`,
        {
          method: 'DELETE',
          headers: {
            'x-api-key': config.api.sensorApiKey,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }

      await fetchSensorDefinitions();
    } catch (err) {
      console.error('Failed to delete sensor:', err);
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setSubmitting(false);
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
          <h1 className="text-2xl font-bold text-gray-900">センサーコード定義管理</h1>
          <p className="text-gray-600 mt-1">センサーコード定義の作成・編集・削除</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
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
          {selectedPlace && (
            <button
              onClick={() => openModal('create')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規作成
            </button>
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
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">センサーコード</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">データ型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">単位</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sensorDefinitions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p>この場所にセンサー定義が登録されていません</p>
                        <button onClick={() => openModal('create')} className="mt-4 text-blue-600 hover:text-blue-700 font-medium">
                          最初の定義を作成する
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sensorDefinitions.map((sensor) => (
                    <tr key={sensor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{sensor.sensor_code}</code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">{sensor.name}</div>
                        {sensor.description && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{sensor.description}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDataTypeBadgeColor(sensor.data_type)}`}>
                          {getDataTypeLabel(sensor.data_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sensor.unit || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sensor.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">アクティブ</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">非アクティブ</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => openModal('view', sensor)} className="text-gray-600 hover:text-gray-900" title="詳細">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button onClick={() => openModal('edit', sensor)} className="text-blue-600 hover:text-blue-900" title="編集">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDelete(sensor)} className="text-red-600 hover:text-red-900" title="削除" disabled={submitting}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === 'create' && '新規センサー定義作成'}
                  {modalMode === 'edit' && 'センサー定義編集'}
                  {modalMode === 'view' && 'センサー定義詳細'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {modalMode === 'view' && selectedSensor && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                    <p className="text-gray-900">{selectedSensor.id}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">エリア</label>
                      <p className="text-gray-900">{selectedSensor.area}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">スポット</label>
                      <p className="text-gray-900">{selectedSensor.spot}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">センサーコード</label>
                    <code className="bg-gray-100 px-2 py-1 rounded">{selectedSensor.sensor_code}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                    <p className="text-gray-900">{selectedSensor.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                    <p className="text-gray-900">{selectedSensor.description || '-'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">データ型</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDataTypeBadgeColor(selectedSensor.data_type)}`}>
                        {getDataTypeLabel(selectedSensor.data_type)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
                      <p className="text-gray-900">{selectedSensor.unit || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状態</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedSensor.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {selectedSensor.is_active ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作成日時</label>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedSensor.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">更新日時</label>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedSensor.updated_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      閉じる
                    </button>
                    <button onClick={() => openModal('edit', selectedSensor)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                      編集する
                    </button>
                  </div>
                </div>
              )}

              {(modalMode === 'create' || modalMode === 'edit') && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      センサーコード <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.sensor_code}
                      onChange={(e) => setFormData({ ...formData, sensor_code: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.sensor_code ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="例: TEMPERATURE_01"
                      maxLength={100}
                    />
                    {formErrors.sensor_code && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.sensor_code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="例: 環境温度センサー"
                      maxLength={255}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.description ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="センサーの詳細な説明を入力してください"
                      rows={3}
                      maxLength={1000}
                    />
                    {formErrors.description && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        データ型 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.data_type}
                        onChange={(e) => setFormData({ ...formData, data_type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="string">文字列</option>
                        <option value="int">整数</option>
                        <option value="float">小数</option>
                        <option value="boolean">真偽値</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.unit ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="例: °C, %, hPa"
                        maxLength={50}
                      />
                      {formErrors.unit && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.unit}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">アクティブ</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      disabled={submitting}
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                      disabled={submitting}
                    >
                      {submitting ? '処理中...' : modalMode === 'create' ? '作成' : '更新'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}