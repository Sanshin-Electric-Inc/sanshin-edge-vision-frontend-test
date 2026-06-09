// src/app/dashboard/admin/alert-recipients/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { alertRecipientApi } from '@/lib/api/alertRecipients';
import { tenantApi } from '@/lib/api/admin';
import type { AlertRecipient, AlertRecipientCreateRequest, AlertRecipientUpdateRequest } from '@/types/alertRecipients';
import type { Tenant } from '@/types/admin';

type ModalMode = 'create' | 'edit' | 'view' | null;

export default function AlertRecipientsPage() {
  const [recipients, setRecipients] = useState<AlertRecipient[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<AlertRecipient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<AlertRecipientCreateRequest>({
    name: '',
    email: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<boolean | 'all'>('all');

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchRecipients();
    }
  }, [selectedTenantId, activeFilter]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await tenantApi.list({ limit: 1000 });
      const tenantsData = result.data || [];
      setTenants(tenantsData);

      if (tenantsData.length > 0 && !selectedTenantId) {
        setSelectedTenantId(tenantsData[0].tenant_id);
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
      setError('テナント一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    if (!selectedTenantId) return;

    try {
      setLoading(true);
      setError(null);
      const params: { is_active?: boolean; limit: number } = { limit: 1000 };
      if (activeFilter !== 'all') {
        params.is_active = activeFilter;
      }

      const result = await alertRecipientApi.list(selectedTenantId, params);
      setRecipients(result.data || []);
    } catch (err) {
      console.error('Failed to fetch alert recipients:', err);
      setError('配信先一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: ModalMode, recipient?: AlertRecipient) => {
    setModalMode(mode);
    setFormErrors({});

    if (mode === 'create') {
      setFormData({
        name: '',
        email: '',
        is_active: true,
      });
      setSelectedRecipient(null);
    } else if (recipient) {
      setSelectedRecipient(recipient);
      if (mode === 'edit') {
        setFormData({
          name: recipient.name,
          email: recipient.email,
          is_active: recipient.is_active,
        });
      }
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedRecipient(null);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '名前は必須です';
    } else if (formData.name.length > 255) {
      errors.name = '名前は255文字以内で入力してください';
    }

    if (!formData.email.trim()) {
      errors.email = 'メールアドレスは必須です';
    } else if (formData.email.length > 255) {
      errors.email = 'メールアドレスは255文字以内で入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
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
        await alertRecipientApi.create(selectedTenantId, formData);
      } else if (modalMode === 'edit' && selectedRecipient) {
        await alertRecipientApi.update(
          selectedTenantId,
          selectedRecipient.id,
          formData as AlertRecipientUpdateRequest
        );
      }

      await fetchRecipients();
      closeModal();
    } catch (err) {
      console.error('Failed to save alert recipient:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recipient: AlertRecipient) => {
    if (!confirm(`「${recipient.name}（${recipient.email}）」を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await alertRecipientApi.delete(selectedTenantId, recipient.id);
      await fetchRecipients();
    } catch (err) {
      console.error('Failed to delete alert recipient:', err);
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && tenants.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">メール配信先管理</h1>
          <p className="text-gray-600 mt-1">システム外部のアラートメール配信先を管理します</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規配信先
        </button>
      </div>

      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800">
            ダッシュボードにログインしないが、センサーの閾値超過時にアラートメールを受け取りたい方（外部関係者・自治体担当者など）のメールアドレスを登録できます。
            ここに登録された配信先は、システムユーザーの「アラート受信」設定とは独立して管理されます。
          </p>
        </div>
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

      {/* テナント選択とフィルター */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              テナント
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tenants.map((tenant) => (
                <option key={tenant.tenant_id} value={tenant.tenant_id}>
                  {tenant.tenant_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータスフィルター
            </label>
            <select
              value={activeFilter === 'all' ? 'all' : activeFilter.toString()}
              onChange={(e) => setActiveFilter(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="true">有効のみ</option>
              <option value="false">無効のみ</option>
            </select>
          </div>
        </div>
      </div>

      {/* 配信先一覧 */}
      {selectedTenantId && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名前
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メールアドレス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作成日時
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">読み込み中...</span>
                      </div>
                    </td>
                  </tr>
                ) : recipients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      配信先が登録されていません
                    </td>
                  </tr>
                ) : (
                  recipients.map((recipient) => (
                    <tr key={recipient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {recipient.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {recipient.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {recipient.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {recipient.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            有効
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            無効
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(recipient.created_at).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openModal('view', recipient)}
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
                            onClick={() => openModal('edit', recipient)}
                            className="text-blue-600 hover:text-blue-900"
                            title="編集"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(recipient)}
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
      )}

      {/* モーダル */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* モーダルヘッダー */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === 'create' && '新規配信先登録'}
                  {modalMode === 'edit' && '配信先編集'}
                  {modalMode === 'view' && '配信先詳細'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 詳細表示モード */}
              {modalMode === 'view' && selectedRecipient && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                    <p className="text-gray-900">{selectedRecipient.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                    <p className="text-gray-900">{selectedRecipient.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                    <p className="text-gray-900">{selectedRecipient.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                    <p className="text-gray-900">
                      {selectedRecipient.is_active ? '有効（メール配信あり）' : '無効（メール配信なし）'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">テナントID</label>
                    <code className="block bg-gray-100 px-3 py-2 rounded">{selectedRecipient.tenant_id}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">作成日時</label>
                    <p className="text-gray-900">{new Date(selectedRecipient.created_at).toLocaleString('ja-JP')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">更新日時</label>
                    <p className="text-gray-900">{new Date(selectedRecipient.updated_at).toLocaleString('ja-JP')}</p>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      閉じる
                    </button>
                    <button
                      onClick={() => openModal('edit', selectedRecipient)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      編集する
                    </button>
                  </div>
                </div>
              )}

              {/* フォームモード */}
              {(modalMode === 'create' || modalMode === 'edit') && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="例: 山田太郎（自治体担当）"
                      maxLength={255}
                      required
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="例: external@example.com"
                      maxLength={255}
                      required
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active ?? true}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">配信を有効にする</span>
                        <p className="text-xs text-gray-600 mt-1">
                          無効にすると、登録情報を保持したままアラートメールの配信を一時停止できます
                        </p>
                      </div>
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
                      {submitting ? '処理中...' : modalMode === 'create' ? '登録' : '更新'}
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
