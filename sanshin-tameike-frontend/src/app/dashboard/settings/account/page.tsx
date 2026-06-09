// src/app/dashboard/settings/account/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

function getRoleName(roleId: number): string {
  switch (roleId) {
    case 1:
      return 'テナント管理者';
    case 2:
      return '一般ユーザー';
    case 3:
      return '閲覧者';
    default:
      return '不明';
  }
}

export default function AccountSettingsPage() {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const infoItems = [
    { label: 'ユーザー名', value: userProfile.name },
    { label: 'メールアドレス', value: userProfile.email },
    { label: 'ロール', value: getRoleName(userProfile.role_id) },
    { label: 'テナント', value: userProfile.tenant.tenant_name },
    { label: 'テナントID', value: userProfile.tenant_id },
    {
      label: '登録日',
      value: userProfile.created_at
        ? new Date(userProfile.created_at).toLocaleDateString('ja-JP')
        : '—',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">アカウント設定</h2>
        <p className="text-gray-600 mt-1">
          ログイン中のアカウント情報を確認できます
        </p>
      </div>

      {/* アカウント情報 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          アカウント情報
        </h3>

        <dl className="divide-y divide-gray-200">
          {infoItems.map((item) => (
            <div key={item.label} className="py-3 flex justify-between">
              <dt className="text-sm font-medium text-gray-500">{item.label}</dt>
              <dd className="text-sm text-gray-900">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* 権限情報 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          権限
        </h3>

        <div className="flex flex-wrap gap-2">
          {userProfile.permissions.map((perm) => (
            <span
              key={perm}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
            >
              {perm}
            </span>
          ))}
        </div>

        {userProfile.is_super_admin && (
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            スーパー管理者
          </div>
        )}
      </div>

      {/* 注意書き */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-500">
          アカウント情報の変更は管理者にお問い合わせください。
        </p>
      </div>
    </div>
  );
}
