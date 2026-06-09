// src/components/dashboard/DashboardHeader.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { tenantApi, tenantSettingsApi } from '@/lib/api/admin';
import type { AuthUser } from '@/types/auth';
import type { Tenant, TenantSettings } from '@/types/admin';
import type { User } from '@supabase/supabase-js';
import { config } from '@/lib/config/environment';

interface DashboardHeaderProps {
  user: User | null;
  userProfile: AuthUser;
}

export function DashboardHeader({ user, userProfile }: DashboardHeaderProps) {
  const { signOut, currentTenantId, switchTenant } = useAuth();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null);

  // SUPER_ADMINの場合のみテナント一覧を取得
  useEffect(() => {
    if (userProfile?.is_super_admin) {
      fetchTenants();
    }
  }, [userProfile?.is_super_admin]);

  // テナント設定（アプリ名）を取得
  useEffect(() => {
    const fetchTenantSettings = async () => {
      try {
        const settings = await tenantSettingsApi.get(currentTenantId);
        setTenantSettings(settings);
      } catch {
        // 設定が存在しない場合はデフォルト値を使用
        console.debug('Using default app name');
        setTenantSettings(null);
      }
    };

    if (currentTenantId) {
      fetchTenantSettings();
    }
  }, [currentTenantId]);

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const result = await tenantApi.list({ limit: 1000 });
      setTenants(result.data || []);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleTenantSwitch = async (tenantId: string) => {
    try {
      await switchTenant(tenantId);
      setTenantDropdownOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to switch tenant:', error);
    }
  };

  const getRoleName = (roleId: number, isSuperAdmin: boolean = false): string => {
    if (isSuperAdmin) {
      return 'スーパー管理者';
    }
    const roleNames = {
      1: '管理者',
      2: '一般ユーザー',
      3: '閲覧者',
    };
    return roleNames[roleId as keyof typeof roleNames] || 'ユーザー';
  };

  // 現在のテナント情報を取得
  const currentTenant = tenants.find(t => t.tenant_id === currentTenantId) || userProfile.tenant;

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 z-40">
      <div className="flex items-center justify-between h-16 px-4">
        {/* ロゴ・タイトル */}
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Image
              src={tenantSettings?.app_icon_url || '/images/sanshin-logo.jpg'}
              alt={tenantSettings?.app_name || 'App Icon'}
              width={32}
              height={32}
              className="rounded-lg"
              unoptimized={!!tenantSettings?.app_icon_url}
            />
            <span className="text-xl font-semibold text-gray-900">
              {tenantSettings?.app_name || config.app.name}
            </span>
          </Link>
        </div>

        {/* テナント選択（SUPER_ADMINのみ） + テナント情報 */}
        <div className="hidden md:flex items-center space-x-4">
          {userProfile?.is_super_admin ? (
            // SUPER_ADMIN: ドロップダウンで選択可能
            <div className="relative">
              <button
                onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {currentTenant.tenant_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getRoleName(userProfile.role_id, userProfile.is_super_admin)}
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    tenantDropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* テナント選択ドロップダウン */}
              {tenantDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200 max-h-96 overflow-y-auto">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="text-xs font-semibold text-gray-500 uppercase">
                      テナント選択
                    </div>
                  </div>
                  {loadingTenants ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      読み込み中...
                    </div>
                  ) : tenants.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      テナントがありません
                    </div>
                  ) : (
                    tenants.map((tenant) => (
                      <button
                        key={tenant.tenant_id}
                        onClick={() => handleTenantSwitch(tenant.tenant_id)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          tenant.tenant_id === currentTenantId
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{tenant.tenant_name}</div>
                            <div className="text-xs text-gray-500">{tenant.tenant_id}</div>
                          </div>
                          {tenant.tenant_id === currentTenantId && (
                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            // 一般ユーザー: 表示のみ
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {userProfile.tenant?.tenant_name || 'テナント名不明'}
              </div>
              <div className="text-xs text-gray-500">
                {getRoleName(userProfile.role_id, userProfile.is_super_admin)}
              </div>
            </div>
          )}
        </div>

        {/* ユーザーメニュー */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 text-sm bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-2"
          >
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {userProfile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="hidden md:block text-gray-900 font-medium">
              {userProfile.name}
            </span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* ドロップダウンメニュー */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900">
                  {userProfile.name}
                </div>
                <div className="text-sm text-gray-500">
                  {userProfile.email}
                </div>
              </div>
              <div className="border-t border-gray-100">
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  ログアウト
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* モバイル用テナント情報 */}
      <div className="md:hidden px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {currentTenant.tenant_name}
          </div>
          <div className="text-xs text-gray-500">
            {getRoleName(userProfile.role_id, userProfile.is_super_admin)}
          </div>
        </div>
      </div>

      {/* オーバーレイ */}
      {(isDropdownOpen || tenantDropdownOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setIsDropdownOpen(false);
            setTenantDropdownOpen(false);
          }}
        />
      )}
    </header>
  );
}
