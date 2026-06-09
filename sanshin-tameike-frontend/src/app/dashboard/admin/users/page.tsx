// src/app/dashboard/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { userApi, tenantApi } from '@/lib/api/admin';
import type { User, UserCreateRequest, UserUpdateRequest, Tenant } from '@/types/admin';
import { USER_ROLE_LABELS } from '@/types/admin';

type ModalMode = 'create' | 'edit' | 'view' | null;

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<UserCreateRequest>({
    tenant_id: '',
    name: '',
    email: '',
    role_id: 2,
    receive_alerts: true, // 新規追加: デフォルトON
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [roleFilter, setRoleFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchUsers();
    }
  }, [selectedTenantId, roleFilter]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await tenantApi.list({ limit: 1000 });
      const tenantsData = result.data || [];
      setTenants(tenantsData);
      
      // 最初のテナントを自動選択
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

  const fetchUsers = async () => {
    if (!selectedTenantId) return;

    try {
      setLoading(true);
      setError(null);
      const params: { role_id?: number; limit: number } = { limit: 1000 };
      if (roleFilter !== 'all') {
        params.role_id = roleFilter;
      }
      
      const result = await userApi.list(selectedTenantId, params);
      setUsers(result.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('ユーザー一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: ModalMode, user?: User) => {
    setModalMode(mode);
    setFormErrors({});
    
    if (mode === 'create') {
      setFormData({
        tenant_id: selectedTenantId,
        name: '',
        email: '',
        role_id: 2,
        receive_alerts: true, // 新規追加: デフォルトON
      });
      setSelectedUser(null);
    } else if (user) {
      setSelectedUser(user);
      if (mode === 'edit') {
        setFormData({
          tenant_id: user.tenant_id,
          name: user.name,
          email: user.email,
          role_id: user.role_id,
          receive_alerts: user.receive_alerts ?? true, // 新規追加: 既存値を設定、undefinedの場合はtrueをデフォルト
        });
      }
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
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

    if (formData.role_id < 1 || formData.role_id > 3) {
      errors.role_id = '有効なロールを選択してください';
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
        await userApi.create(selectedTenantId, formData);
      } else if (modalMode === 'edit' && selectedUser) {
        const { tenant_id: _tenant_id, ...updateData } = formData;
        await userApi.update(selectedTenantId, selectedUser.id, updateData as UserUpdateRequest);
      }

      await fetchUsers();
      closeModal();
    } catch (err) {
      console.error('Failed to save user:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`「${user.name}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await userApi.delete(selectedTenantId, user.id);
      await fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeColor = (roleId: number): string => {
    const colors: Record<number, string> = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-gray-100 text-gray-800',
    };
    return colors[roleId] || 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="text-gray-600 mt-1">システムユーザーの管理</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規ユーザー
        </button>
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
          {/* テナント選択 */}
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

          {/* ロールフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ロールフィルター
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value={1}>管理者</option>
              <option value={2}>一般ユーザー</option>
              <option value={3}>閲覧者</option>
            </select>
          </div>
        </div>
      </div>

      {/* ユーザー一覧 */}
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
                    ロール
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アラート受信
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
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">読み込み中...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      ユーザーが見つかりませんでした
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role_id)}`}>
                          {USER_ROLE_LABELS[user.role_id] || 'Unknown'}
                        </span>
                      </td>
                      {/* 新規追加: アラート受信列 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.receive_alerts ?? false ? (
                          <div className="flex items-center text-green-600">
                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs">受信</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-400">
                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs">なし</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openModal('view', user)}
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
                            onClick={() => openModal('edit', user)}
                            className="text-blue-600 hover:text-blue-900"
                            title="編集"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
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
                  {modalMode === 'create' && '新規ユーザー作成'}
                  {modalMode === 'edit' && 'ユーザー編集'}
                  {modalMode === 'view' && 'ユーザー詳細'}
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
              {modalMode === 'view' && selectedUser && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ユーザーID</label>
                    <p className="text-gray-900">{selectedUser.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                    <p className="text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                    <p className="text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ロール</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(selectedUser.role_id)}`}>
                      {USER_ROLE_LABELS[selectedUser.role_id] || 'Unknown'}
                    </span>
                  </div>
                  {/* 新規追加: アラート受信表示 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">アラートメール受信</label>
                    <p className="text-gray-900">
                      {selectedUser.receive_alerts ?? false ? '受信する' : '受信しない'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">テナントID</label>
                    <code className="block bg-gray-100 px-3 py-2 rounded">{selectedUser.tenant_id}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">作成日時</label>
                    <p className="text-gray-900">{new Date(selectedUser.created_at).toLocaleString('ja-JP')}</p>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      閉じる
                    </button>
                    <button
                      onClick={() => openModal('edit', selectedUser)}
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
                      placeholder="例: 山田太郎"
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
                      placeholder="例: user@example.com"
                      maxLength={255}
                      required
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ロール <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.role_id}
                      onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
                      className={`w-full px-3 py-2 border rounded-lg ${formErrors.role_id ? 'border-red-500' : 'border-gray-300'}`}
                      required
                    >
                      <option value={1}>管理者</option>
                      <option value={2}>一般ユーザー</option>
                      <option value={3}>閲覧者</option>
                    </select>
                    {formErrors.role_id && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.role_id}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      管理者: すべての操作が可能 | 一般ユーザー: データの閲覧・編集 | 閲覧者: データの閲覧のみ
                    </p>
                  </div>

                  {/* 新規追加: アラートメール受信チェックボックス */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.receive_alerts}
                        onChange={(e) => setFormData({ ...formData, receive_alerts: e.target.checked })}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">アラートメールを受信する</span>
                        <p className="text-xs text-gray-600 mt-1">
                          センサーが閾値を超過した際に、このユーザーにアラートメールを送信します
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