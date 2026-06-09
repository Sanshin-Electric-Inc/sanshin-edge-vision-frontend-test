// src/app/dashboard/admin/page.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboardPage() {
  const { userProfile } = useAuth();

  const adminFeatures = [
    {
      title: 'テナント管理',
      description: 'テナントの作成、編集、削除を行います',
      href: '/dashboard/admin/tenants',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'blue',
    },
    {
      title: 'ユーザー管理',
      description: 'ユーザーの作成、編集、削除、権限管理を行います',
      href: '/dashboard/admin/users',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'green',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string; hover: string }> = {
      blue: {
        bg: 'bg-blue-50',
        icon: 'text-blue-600',
        hover: 'hover:bg-blue-100',
      },
      green: {
        bg: 'bg-green-50',
        icon: 'text-green-600',
        hover: 'hover:bg-green-100',
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* ウェルカムメッセージ */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          ようこそ、{userProfile?.name}さん
        </h2>
        <p className="text-gray-600">
          管理者として、テナントとユーザーの管理を行うことができます。
        </p>
      </div>

      {/* 管理機能カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminFeatures.map((feature) => {
          const colorClasses = getColorClasses(feature.color);
          return (
            <Link
              key={feature.href}
              href={feature.href}
              className={`block ${colorClasses.bg} ${colorClasses.hover} rounded-lg p-6 border border-gray-200 transition-all duration-200 transform hover:scale-105 hover:shadow-lg`}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 ${colorClasses.bg} rounded-lg ${colorClasses.icon}`}>
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {feature.description}
                  </p>
                  <div className="mt-4 flex items-center text-sm font-medium text-blue-600">
                    管理画面を開く
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* クイック統計 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          管理者情報
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">現在のテナント</div>
            <div className="text-lg font-semibold text-gray-900">
              {userProfile?.tenant.tenant_name}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">テナントID</div>
            <div className="text-sm font-mono text-gray-900">
              {userProfile?.tenant_id}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">権限</div>
            <div className="text-lg font-semibold text-gray-900">
              管理者
            </div>
          </div>
        </div>
      </div>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-yellow-800 mb-1">
              注意事項
            </h4>
            <p className="text-sm text-yellow-700">
              管理者として行った操作は、システム全体に影響を与える可能性があります。
              テナントやユーザーの削除は慎重に行ってください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}