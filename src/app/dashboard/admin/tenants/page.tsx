// src/app/dashboard/admin/tenants/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { tenantApi } from '@/lib/api/admin';
import type { Tenant, TenantCreateRequest, TenantUpdateRequest } from '@/types/admin';

type ModalMode = 'create' | 'edit' | 'view' | null;

export default function TenantsManagementPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<TenantCreateRequest>({
    tenant_id: '',
    tenant_name: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // アクセス制御
  useEffect(() => {
    if (!authLoading) {
      // スーパー管理者でない場合はダッシュボードにリダイレクト
      if (!userProfile?.is_super_admin) {
        router.push('/dashboard');
      }
    }
  }, [authLoading, userProfile, router]);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await tenantApi.list({ limit: 1000 });
      setTenants(result.data || []);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
      setError('テナント一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: ModalMode, tenant?: Tenant) => {
    setModalMode(mode);
    setFormErrors({});
    
    if (mode === 'create') {
      setFormData({
        tenant_id: '',
        tenant_name: '',
      });
      setSelectedTenant(null);
    } else if (tenant) {
      setSelectedTenant(tenant);
      if (mode === 'edit') {
        setFormData({
          tenant_id: tenant.tenant_id,
          tenant_name: tenant.tenant_name,
        });
      }
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedTenant(null);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (modalMode === 'create') {
      if (!formData.tenant_id.trim()) {
        errors.tenant_id = 'テナントIDは必須です';
      } else if (formData.tenant_id.length > 100) {
        errors.tenant_id = 'テナントIDは100文字以内で入力してください';
      }
    }

    if (!formData.tenant_name.trim()) {
      errors.tenant_name = 'テナント名は必須です';
    } else if (formData.tenant_name.length > 255) {
      errors.tenant_name = 'テナント名は255文字以内で入力してください';
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
        await tenantApi.create(formData);
      } else if (modalMode === 'edit' && selectedTenant) {
        const { tenant_id: _tenant_id, ...updateData } = formData;
        await tenantApi.update(selectedTenant.tenant_id, updateData as TenantUpdateRequest);
      }

      await fetchTenants();
      closeModal();
    } catch (err) {
      console.error('Failed to save tenant:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (!confirm(`「${tenant.tenant_name}」を削除してもよろしいですか？\nこの操作は取り消せません。関連するすべてのデータも削除されます。`)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await tenantApi.delete(tenant.tenant_id);
      await fetchTenants();
    } catch (err) {
      console.error('Failed to delete tenant:', err);
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  // 認証確認中
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証確認中...</p>
        </div>
      </div>
    );
  }

  // アクセス拒否（リダイレクト中）
  if (!userProfile?.is_super_admin) {
    return null;
  }

  // データ読み込み中
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
          <h2 className="text-2xl font-bold text-gray-900">テナント管理</h2>
          <p className="text-gray-600 mt-1">
            テナントの作成・編集・削除
          </p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規テナント作成
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

      {/* テナント一覧テーブル */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  テナント
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  テナントID
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p>テナントが登録されていません</p>
                      <button
                        onClick={() => openModal('create')}
                        className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        最初のテナントを作成する
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.tenant_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{tenant.tenant_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {tenant.tenant_id}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openModal('view', tenant)}
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
                          onClick={() => openModal('edit', tenant)}
                          className="text-blue-600 hover:text-blue-900"
                          title="編集"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(tenant)}
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
              {/* モーダルヘッダー */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === 'create' && '新規テナント作成'}
                  {modalMode === 'edit' && 'テナント編集'}
                  {modalMode === 'view' && 'テナント詳細'}
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
              {modalMode === 'view' && selectedTenant && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">テナントID</label>
                    <code className="block bg-gray-100 px-3 py-2 rounded">{selectedTenant.tenant_id}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">テナント名</label>
                    <p className="text-gray-900">{selectedTenant.tenant_name}</p>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      閉じる
                    </button>
                    <button
                      onClick={() => openModal('edit', selectedTenant)}
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
                  {modalMode === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        テナントID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.tenant_id}
                        onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg ${formErrors.tenant_id ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="例: tenant-001"
                        maxLength={100}
                        required
                      />
                      {formErrors.tenant_id && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.tenant_id}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        作成後は変更できません
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      テナント名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.tenant_name}
                      onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${formErrors.tenant_name ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="例: サンプルテナント"
                      maxLength={255}
                      required
                    />
                    {formErrors.tenant_name && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.tenant_name}</p>
                    )}
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