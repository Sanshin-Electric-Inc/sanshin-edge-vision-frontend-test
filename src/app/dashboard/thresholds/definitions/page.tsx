// src/app/dashboard/thresholds/definitions/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { config } from '@/lib/config/environment';
import { thresholdApi } from '@/lib/api/thresholds';
import type { Place } from '@/types/places';
import type { SensorThreshold, ThresholdCreateRequest, ThresholdUpdateRequest, SensorCodeDefinition } from '@/types/thresholds';

type ModalMode = 'create' | 'edit' | 'view' | null;

export default function ThresholdDefinitionsPage() {
  const { userProfile, currentTenantId } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sensorDefinitions, setSensorDefinitions] = useState<SensorCodeDefinition[]>([]);
  const [thresholds, setThresholds] = useState<SensorThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedThreshold, setSelectedThreshold] = useState<SensorThreshold | null>(null);
  const [selectedSensorDef, setSelectedSensorDef] = useState<SensorCodeDefinition | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    lower_limit: string;
    upper_limit: string;
    is_active: boolean;
  }>({
    lower_limit: '',
    upper_limit: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userProfile) {
      fetchPlaces();
    }
  }, [userProfile, currentTenantId]);

  useEffect(() => {
    if (userProfile && selectedPlace) {
      fetchSensorDefinitions();
      fetchThresholds();
    }
  }, [userProfile, selectedPlace, currentTenantId]);

  const fetchPlaces = async () => {
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
      setSensorDefinitions(result.data || []);
    } catch (err) {
      console.error('Failed to fetch sensor definitions:', err);
      setError('センサー定義の取得に失敗しました');
    }
  };

  const fetchThresholds = async () => {
    if (!userProfile || !selectedPlace) return;

    try {
      setError(null);
      
      const result = await thresholdApi.list(
        currentTenantId,
        selectedPlace.area,
        selectedPlace.spot,
        { limit: 100 }
      );
      
      setThresholds(result.data);
    } catch (err) {
      console.error('Failed to fetch thresholds:', err);
      setError('閾値情報の取得に失敗しました');
    }
  };

  const openModal = (mode: ModalMode, sensorDef: SensorCodeDefinition, threshold?: SensorThreshold) => {
    setModalMode(mode);
    setSelectedSensorDef(sensorDef);
    setFormErrors({});
    
    if (mode === 'create') {
      setFormData({
        lower_limit: '',
        upper_limit: '',
        is_active: true,
      });
      setSelectedThreshold(null);
    } else if (threshold) {
      setSelectedThreshold(threshold);
      if (mode === 'edit') {
        setFormData({
          lower_limit: threshold.lower_limit?.toString() || '',
          upper_limit: threshold.upper_limit?.toString() || '',
          is_active: threshold.is_active,
        });
      }
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedThreshold(null);
    setSelectedSensorDef(null);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const lowerLimit = formData.lower_limit ? parseFloat(formData.lower_limit) : null;
    const upperLimit = formData.upper_limit ? parseFloat(formData.upper_limit) : null;

    if (formData.lower_limit && isNaN(lowerLimit!)) {
      errors.lower_limit = '数値を入力してください';
    }

    if (formData.upper_limit && isNaN(upperLimit!)) {
      errors.upper_limit = '数値を入力してください';
    }

    if (lowerLimit !== null && upperLimit !== null && lowerLimit >= upperLimit) {
      errors.lower_limit = '下限値は上限値より小さい値を設定してください';
    }

    if (!formData.lower_limit && !formData.upper_limit) {
      errors.lower_limit = '下限値または上限値のいずれかを設定してください';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !userProfile || !selectedPlace || !selectedSensorDef) return;

    try {
      setSubmitting(true);
      setError(null);

      const lowerLimit = formData.lower_limit ? parseFloat(formData.lower_limit) : null;
      const upperLimit = formData.upper_limit ? parseFloat(formData.upper_limit) : null;

      if (modalMode === 'create') {
        const requestData: ThresholdCreateRequest = {
          sensor_code_definition_id: selectedSensorDef.id,
          lower_limit: lowerLimit,
          upper_limit: upperLimit,
          is_active: formData.is_active,
        };

        await thresholdApi.create(
          currentTenantId,
          selectedPlace.area,
          selectedPlace.spot,
          requestData
        );
      } else if (modalMode === 'edit' && selectedThreshold) {
        const requestData: ThresholdUpdateRequest = {
          lower_limit: lowerLimit,
          upper_limit: upperLimit,
          is_active: formData.is_active,
        };

        await thresholdApi.update(
          currentTenantId,
          selectedThreshold.id,
          requestData
        );
      }

      await fetchThresholds();
      closeModal();
    } catch (err) {
      console.error('Failed to save threshold:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (threshold: SensorThreshold) => {
    if (!confirm(`閾値設定を削除してもよろしいですか？`)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await thresholdApi.delete(currentTenantId, threshold.id);
      await fetchThresholds();
    } catch (err) {
      console.error('Failed to delete threshold:', err);
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const getThresholdForSensor = (sensorDefId: number): SensorThreshold | undefined => {
    return thresholds.find(t => t.sensor_code_definition_id === sensorDefId);
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
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">閾値管理</h1>
          <p className="text-gray-600 mt-1">センサーの上限値・下限値を設定</p>
        </div>
      </div>

      {/* 場所選択 */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">場所を選択</label>
        {places.length === 0 ? (
          <div className="text-sm text-gray-500">場所が登録されていません。</div>
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

      {/* エラー表示 */}
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

      {/* センサー一覧 */}
      {selectedPlace && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">センサー閾値設定</h2>
            <p className="text-sm text-gray-600 mt-1">各センサーの閾値を設定してください</p>
          </div>

          <div className="divide-y divide-gray-200">
            {sensorDefinitions.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                この場所にセンサー定義がありません
              </div>
            ) : (
              sensorDefinitions.map((sensorDef) => {
                const threshold = getThresholdForSensor(sensorDef.id);
                const unit = threshold?.unit || sensorDef.unit;
                
                return (
                  <div key={sensorDef.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      {/* センサー情報 */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-base font-semibold text-gray-900">{sensorDef.name}</h3>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{sensorDef.sensor_code}</code>
                          <span className="text-xs text-gray-500">{unit}</span>
                        </div>
                        {sensorDef.description && (
                          <p className="text-sm text-gray-600 mb-3">{sensorDef.description}</p>
                        )}

                        {/* 閾値表示 */}
                        {threshold ? (
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">下限:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {threshold.lower_limit !== null ? `${threshold.lower_limit} ${unit}` : '未設定'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">上限:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {threshold.upper_limit !== null ? `${threshold.upper_limit} ${unit}` : '未設定'}
                              </span>
                            </div>
                            <div>
                              {threshold.is_active ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  有効
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  無効
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">閾値未設定</div>
                        )}
                      </div>

                      {/* アクションボタン */}
                      <div className="flex items-center space-x-2 ml-4">
                        {threshold ? (
                          <>
                            <button
                              onClick={() => openModal('view', sensorDef, threshold)}
                              className="text-gray-600 hover:text-gray-900"
                              title="詳細"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openModal('edit', sensorDef, threshold)}
                              className="text-blue-600 hover:text-blue-900"
                              title="編集"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(threshold)}
                              className="text-red-600 hover:text-red-900"
                              title="削除"
                              disabled={submitting}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openModal('create', sensorDef)}
                            className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            閾値設定
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* モーダル */}
      {modalMode && selectedSensorDef && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === 'create' && '閾値設定'}
                  {modalMode === 'edit' && '閾値編集'}
                  {modalMode === 'view' && '閾値詳細'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* センサー情報 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-base font-semibold text-gray-900">{selectedSensorDef.name}</h3>
                  <code className="text-xs bg-white px-2 py-1 rounded border">{selectedSensorDef.sensor_code}</code>
                </div>
                {selectedSensorDef.description && (
                  <p className="text-sm text-gray-600">{selectedSensorDef.description}</p>
                )}
              </div>

              {/* 詳細表示モード */}
              {modalMode === 'view' && selectedThreshold && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">下限値</label>
                      <p className="text-gray-900">
                        {selectedThreshold.lower_limit !== null 
                          ? `${selectedThreshold.lower_limit} ${selectedThreshold.unit}` 
                          : '未設定'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">上限値</label>
                      <p className="text-gray-900">
                        {selectedThreshold.upper_limit !== null 
                          ? `${selectedThreshold.upper_limit} ${selectedThreshold.unit}` 
                          : '未設定'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状態</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedThreshold.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedThreshold.is_active ? '有効' : '無効'}
                    </span>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      閉じる
                    </button>
                    <button onClick={() => openModal('edit', selectedSensorDef, selectedThreshold)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                      編集する
                    </button>
                  </div>
                </div>
              )}

              {/* フォームモード */}
              {(modalMode === 'create' || modalMode === 'edit') && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        下限値
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="any"
                          value={formData.lower_limit}
                          onChange={(e) => setFormData({ ...formData, lower_limit: e.target.value })}
                          className={`flex-1 px-3 py-2 border rounded-lg ${formErrors.lower_limit ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="例: 10.0"
                        />
                        <span className="text-sm text-gray-600">{selectedThreshold?.unit || selectedSensorDef.unit}</span>
                      </div>
                      {formErrors.lower_limit && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.lower_limit}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        上限値
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="any"
                          value={formData.upper_limit}
                          onChange={(e) => setFormData({ ...formData, upper_limit: e.target.value })}
                          className={`flex-1 px-3 py-2 border rounded-lg ${formErrors.upper_limit ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="例: 30.0"
                        />
                        <span className="text-sm text-gray-600">{selectedThreshold?.unit || selectedSensorDef.unit}</span>
                      </div>
                      {formErrors.upper_limit && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.upper_limit}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      💡 下限値または上限値のいずれか一方のみを設定することも可能です
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">この閾値設定を有効にする</span>
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
                      {submitting ? '処理中...' : modalMode === 'create' ? '設定' : '更新'}
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