// src/app/dashboard/alerts/templates/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { config } from '@/lib/config/environment';
import { alertTemplateApi } from '@/lib/api/alerts';
import type { Place } from '@/types/places';
import type { AlertEmailTemplate, TemplateCreateRequest, TemplateUpdateRequest, SensorCodeDefinition } from '@/types/alerts';
import { TEMPLATE_PLACEHOLDERS, DEFAULT_TEMPLATE } from '@/types/alerts';

type ModalMode = 'create' | 'edit' | 'view' | 'preview' | null;

export default function AlertTemplatesPage() {
  const { userProfile, currentTenantId } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sensorDefinitions, setSensorDefinitions] = useState<SensorCodeDefinition[]>([]);
  const [templates, setTemplates] = useState<AlertEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AlertEmailTemplate | null>(null);
  const [selectedSensorDef, setSelectedSensorDef] = useState<SensorCodeDefinition | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    subject: string;
    body_template: string;
    is_default: boolean;
  }>({
    subject: '',
    body_template: '',
    is_default: false,
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
      fetchTemplates();
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

  const fetchTemplates = async () => {
    if (!userProfile || !selectedPlace) return;

    try {
      setError(null);
      
      const result = await alertTemplateApi.list(
        currentTenantId,
        selectedPlace.area,
        selectedPlace.spot,
        { limit: 100 }
      );
      
      setTemplates(result.data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('テンプレート情報の取得に失敗しました');
    }
  };

  const openModal = (mode: ModalMode, sensorDef: SensorCodeDefinition, template?: AlertEmailTemplate) => {
    setModalMode(mode);
    setSelectedSensorDef(sensorDef);
    setFormErrors({});
    
    if (mode === 'create') {
      setFormData({
        subject: DEFAULT_TEMPLATE.subject,
        body_template: DEFAULT_TEMPLATE.body_template,
        is_default: false,
      });
      setSelectedTemplate(null);
    } else if (template) {
      setSelectedTemplate(template);
      if (mode === 'edit') {
        setFormData({
          subject: template.subject,
          body_template: template.body_template,
          is_default: template.is_default,
        });
      }
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedTemplate(null);
    setSelectedSensorDef(null);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      errors.subject = '件名は必須です';
    } else if (formData.subject.length > 200) {
      errors.subject = '件名は200文字以内で入力してください';
    }

    if (!formData.body_template.trim()) {
      errors.body_template = '本文は必須です';
    } else if (formData.body_template.length > 2000) {
      errors.body_template = '本文は2000文字以内で入力してください';
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

      if (modalMode === 'create') {
        const requestData: TemplateCreateRequest = {
          sensor_code_definition_id: selectedSensorDef.id,
          subject: formData.subject,
          body_template: formData.body_template,
          is_default: formData.is_default,
        };

        await alertTemplateApi.create(
          currentTenantId,
          selectedPlace.area,
          selectedPlace.spot,
          requestData
        );
      } else if (modalMode === 'edit' && selectedTemplate) {
        const requestData: TemplateUpdateRequest = {
          subject: formData.subject,
          body_template: formData.body_template,
          is_default: formData.is_default,
        };

        await alertTemplateApi.update(
          currentTenantId,
          selectedTemplate.id,
          requestData
        );
      }

      await fetchTemplates();
      closeModal();
    } catch (err) {
      console.error('Failed to save template:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (template: AlertEmailTemplate) => {
    if (!confirm(`テンプレートを削除してもよろしいですか？`)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await alertTemplateApi.delete(currentTenantId, template.id);
      await fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const getTemplateForSensor = (sensorDefId: number): AlertEmailTemplate | undefined => {
    return templates.find(t => t.sensor_code_definition_id === sensorDefId);
  };

  const insertPlaceholder = (placeholder: string) => {
    setFormData(prev => ({
      ...prev,
      body_template: prev.body_template + placeholder,
    }));
  };

  const renderPreview = () => {
    if (!selectedSensorDef || !selectedPlace) return null;

    const previewData = {
      place_name: selectedPlace.place_name,
      area: selectedPlace.area.toString(),
      spot: selectedPlace.spot.toString(),
      sensor_name: selectedSensorDef.name,
      sensor_code: selectedSensorDef.sensor_code,
      value: '25.5',
      unit: selectedSensorDef.unit,
      threshold: '30.0',
      threshold_type: '上限',
      timestamp: new Date().toLocaleString('ja-JP'),
    };

    let previewSubject = formData.subject;
    let previewBody = formData.body_template;

    Object.entries(previewData).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      previewSubject = previewSubject.replace(new RegExp(placeholder, 'g'), value);
      previewBody = previewBody.replace(new RegExp(placeholder, 'g'), value);
    });

    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">プレビュー</h4>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">件名:</div>
            <div className="bg-white p-2 rounded border text-sm">{previewSubject}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">本文:</div>
            <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">{previewBody}</div>
          </div>
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-bold text-gray-900">アラートメール文面管理</h1>
          <p className="text-gray-600 mt-1">センサーごとのアラートメール文面を設定</p>
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
            <h2 className="text-lg font-semibold text-gray-900">メール文面設定</h2>
            <p className="text-sm text-gray-600 mt-1">各センサーのアラートメール文面を設定してください</p>
          </div>

          <div className="divide-y divide-gray-200">
            {sensorDefinitions.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                この場所にセンサー定義がありません
              </div>
            ) : (
              sensorDefinitions.map((sensorDef) => {
                const template = getTemplateForSensor(sensorDef.id);
                
                return (
                  <div key={sensorDef.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      {/* センサー情報 */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-base font-semibold text-gray-900">{sensorDef.name}</h3>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{sensorDef.sensor_code}</code>
                        </div>
                        {sensorDef.description && (
                          <p className="text-sm text-gray-600 mb-3">{sensorDef.description}</p>
                        )}

                        {/* テンプレート表示 */}
                        {template ? (
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs text-gray-500">件名: </span>
                              <span className="text-sm text-gray-900">{template.subject}</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">本文: </span>
                              <span className="text-sm text-gray-900 line-clamp-2">{template.body_template}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            デフォルトテンプレートが使用されます
                          </div>
                        )}
                      </div>

                      {/* アクションボタン */}
                      <div className="flex items-center space-x-2 ml-4">
                        {template ? (
                          <>
                            <button
                              onClick={() => openModal('view', sensorDef, template)}
                              className="text-gray-600 hover:text-gray-900"
                              title="詳細"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openModal('edit', sensorDef, template)}
                              className="text-blue-600 hover:text-blue-900"
                              title="編集"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(template)}
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
                            文面設定
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
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === 'create' && 'メール文面設定'}
                  {modalMode === 'edit' && 'メール文面編集'}
                  {modalMode === 'view' && 'メール文面詳細'}
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
              {modalMode === 'view' && selectedTemplate && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
                    <div className="bg-gray-50 p-3 rounded border">{selectedTemplate.subject}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
                    <div className="bg-gray-50 p-3 rounded border whitespace-pre-wrap">{selectedTemplate.body_template}</div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      閉じる
                    </button>
                    <button onClick={() => openModal('edit', selectedSensorDef, selectedTemplate)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                      編集する
                    </button>
                  </div>
                </div>
              )}

              {/* フォームモード */}
              {(modalMode === 'create' || modalMode === 'edit') && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 左側: フォーム */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          件名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-lg ${formErrors.subject ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="例: 【警告】{{sensor_name}}が閾値を超過"
                          maxLength={200}
                        />
                        {formErrors.subject && (
                          <p className="mt-1 text-sm text-red-500">{formErrors.subject}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          本文 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formData.body_template}
                          onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-lg ${formErrors.body_template ? 'border-red-500' : 'border-gray-300'}`}
                          rows={12}
                          maxLength={2000}
                        />
                        {formErrors.body_template && (
                          <p className="mt-1 text-sm text-red-500">{formErrors.body_template}</p>
                        )}
                      </div>

                      {/* プレースホルダー一覧 */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">使用可能なプレースホルダー</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {TEMPLATE_PLACEHOLDERS.map((ph) => (
                            <button
                              key={ph.key}
                              type="button"
                              onClick={() => insertPlaceholder(ph.key)}
                              className="text-left px-2 py-1 bg-white hover:bg-blue-100 rounded text-xs border border-blue-200 transition-colors"
                              title={`クリックして挿入: ${ph.description}`}
                            >
                              <code className="text-blue-700">{ph.key}</code>
                              <div className="text-gray-600 text-xs">{ph.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 右側: プレビュー */}
                    <div>
                      {renderPreview()}
                    </div>
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