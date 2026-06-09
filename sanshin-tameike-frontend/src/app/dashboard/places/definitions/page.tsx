// src/app/dashboard/places/definitions/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { config } from '@/lib/config/environment';
import type { Place, PlaceCreateRequest, PlaceUpdateRequest, PlacesApiResponse } from '@/types/places';

type ModalMode = 'create' | 'edit' | 'view' | null;

export default function PlaceDefinitionsPage() {
  const { userProfile, currentTenantId } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<PlaceCreateRequest>({
    area: 1,
    spot: 1,
    place_name: '',
    lat: 35.6762,
    lng: 139.6503,
    display_order: 1,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userProfile) {
      fetchPlaces();
    }
  }, [userProfile, currentTenantId]);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('limit', '1000');
      params.append('sort_by', 'display_order');
      params.append('sort_order', 'asc');

      const apiUrl = `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places?${params.toString()}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'x-api-key': config.api.sensorApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: PlacesApiResponse = await response.json();
      setPlaces(result.data || []);
    } catch (err) {
      console.error('Failed to fetch places:', err);
      setError('場所定義の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: ModalMode, place?: Place) => {
    setModalMode(mode);
    setFormErrors({});
    
    if (mode === 'create') {
      setFormData({
        area: 1,
        spot: 1,
        place_name: '',
        lat: 35.6762,
        lng: 139.6503,
        display_order: places.length + 1,
      });
      setSelectedPlace(null);
    } else if (place) {
      setSelectedPlace(place);
      if (mode === 'edit') {
        setFormData({
          area: place.area,
          spot: place.spot,
          place_name: place.place_name,
          lat: place.lat,
          lng: place.lng,
          display_order: place.display_order,
        });
      }
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedPlace(null);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (formData.area < 1) {
      errors.area = 'エリアは1以上である必要があります';
    }

    if (formData.spot < 1) {
      errors.spot = 'スポットは1以上である必要があります';
    }

    if (!formData.place_name.trim()) {
      errors.place_name = '場所名は必須です';
    } else if (formData.place_name.length > 255) {
      errors.place_name = '場所名は255文字以内で入力してください';
    }

    if (formData.lat !== undefined && (formData.lat < -90 || formData.lat > 90)) {
      errors.lat = '緯度は-90～90の範囲で入力してください';
    }

    if (formData.lng !== undefined && (formData.lng < -180 || formData.lng > 180)) {
      errors.lng = '経度は-180～180の範囲で入力してください';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError(null);

      if (modalMode === 'create') {
        const response = await fetch(
          `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places`,
          {
            method: 'POST',
            headers: {
              'x-api-key': config.api.sensorApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '作成に失敗しました');
        }
      } else if (modalMode === 'edit' && selectedPlace) {
        const { area, spot, ...updateData } = formData;
        const response = await fetch(
          `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places/${selectedPlace.area}/${selectedPlace.spot}`,
          {
            method: 'PUT',
            headers: {
              'x-api-key': config.api.sensorApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '更新に失敗しました');
        }
      }

      await fetchPlaces();
      closeModal();
    } catch (err) {
      console.error('Failed to save place:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (place: Place) => {
    if (!confirm(`「${place.place_name}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(
        `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places/${place.area}/${place.spot}`,
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

      await fetchPlaces();
    } catch (err) {
      console.error('Failed to delete place:', err);
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">場所定義管理</h1>
          <p className="text-gray-600 mt-1">
            場所定義の作成・編集・削除
          </p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規作成
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* 場所定義一覧テーブル */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  場所
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  座標
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  表示順序
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {places.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <p>場所定義が登録されていません</p>
                      <button
                        onClick={() => openModal('create')}
                        className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        最初の定義を作成する
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                places.map((place) => (
                  <tr key={`${place.area}-${place.spot}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">{place.place_name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        エリア {place.area}-{place.spot}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {place.lat && place.lng 
                        ? `${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`
                        : '未設定'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {place.display_order ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openModal('view', place)}
                          className="text-gray-600 hover:text-gray-900"
                          title="詳細"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openModal('edit', place)}
                          className="text-blue-600 hover:text-blue-900"
                          title="編集"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(place)}
                          className="text-red-600 hover:text-red-900"
                          title="削除"
                          disabled={submitting}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

      {/* モーダル */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === 'create' && '新規場所定義作成'}
                  {modalMode === 'edit' && '場所定義編集'}
                  {modalMode === 'view' && '場所定義詳細'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {modalMode === 'view' && selectedPlace && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">エリア</label>
                      <p className="text-gray-900">{selectedPlace.area}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">スポット</label>
                      <p className="text-gray-900">{selectedPlace.spot}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">場所名</label>
                    <p className="text-gray-900">{selectedPlace.place_name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">緯度</label>
                      <p className="font-mono text-gray-900">
                        {selectedPlace.lat ? selectedPlace.lat.toFixed(6) : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">経度</label>
                      <p className="font-mono text-gray-900">
                        {selectedPlace.lng ? selectedPlace.lng.toFixed(6) : '-'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">表示順序</label>
                    <p className="text-gray-900">{selectedPlace.display_order ?? '-'}</p>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      閉じる
                    </button>
                    <button onClick={() => openModal('edit', selectedPlace)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                      編集する
                    </button>
                  </div>
                </div>
              )}

              {(modalMode === 'create' || modalMode === 'edit') && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        エリア <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: parseInt(e.target.value) || 1 })}
                        min="1"
                        required
                        disabled={modalMode === 'edit'}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          modalMode === 'edit' ? 'bg-gray-100' : ''
                        } ${formErrors.area ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {formErrors.area && <p className="mt-1 text-sm text-red-500">{formErrors.area}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        スポット <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.spot}
                        onChange={(e) => setFormData({ ...formData, spot: parseInt(e.target.value) || 1 })}
                        min="1"
                        required
                        disabled={modalMode === 'edit'}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          modalMode === 'edit' ? 'bg-gray-100' : ''
                        } ${formErrors.spot ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {formErrors.spot && <p className="mt-1 text-sm text-red-500">{formErrors.spot}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      場所名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.place_name}
                      onChange={(e) => setFormData({ ...formData, place_name: e.target.value })}
                      required
                      maxLength={255}
                      className={`w-full px-3 py-2 border rounded-lg ${formErrors.place_name ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="例: 第1工場エントランス"
                    />
                    {formErrors.place_name && <p className="mt-1 text-sm text-red-500">{formErrors.place_name}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">緯度</label>
                      <input
                        type="number"
                        value={formData.lat}
                        onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || undefined })}
                        step="0.000001"
                        min="-90"
                        max="90"
                        className={`w-full px-3 py-2 border rounded-lg ${formErrors.lat ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="35.681236"
                      />
                      {formErrors.lat && <p className="mt-1 text-sm text-red-500">{formErrors.lat}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">経度</label>
                      <input
                        type="number"
                        value={formData.lng}
                        onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || undefined })}
                        step="0.000001"
                        min="-180"
                        max="180"
                        className={`w-full px-3 py-2 border rounded-lg ${formErrors.lng ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="139.767125"
                      />
                      {formErrors.lng && <p className="mt-1 text-sm text-red-500">{formErrors.lng}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">表示順序</label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || undefined })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">一覧表示時の並び順（小さい数字が上位）</p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50" disabled={submitting}>
                      キャンセル
                    </button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50" disabled={submitting}>
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