// src/components/dashboard/DashboardSidebar.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

interface UserProfile {
  id: bigint | string;
  tenant_id: string;
  name: string;
  email: string;
  role_id: number;
  tenant: {
    tenant_id: string;
    tenant_name: string;
  };
}

interface DashboardSidebarProps {
  userProfile: UserProfile;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  permissions?: number[];
  children?: NavigationItem[];
}

export function DashboardSidebar({ userProfile }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['sensors', 'places', 'cameras', 'settings', 'admin', 'analytics']);

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  // ナビゲーション項目の定義
  const navigation: NavigationItem[] = [
    {
      name: 'ダッシュボード',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2H3a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      name: '場所管理',
      href: '/dashboard/places',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      permissions: [1, 2],
      children: [
        {
          name: '場所一覧',
          href: '/dashboard/places',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: '地図表示',
          href: '/dashboard/places/map',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: '場所定義',
          href: '/dashboard/places/definitions',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
          permissions: [1],
        },
      ],
    },
    {
      name: 'センサー',
      href: '/dashboard/sensors',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      children: [
        {
          name: 'センサー一覧',
          href: '/dashboard/sensors',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: 'リアルタイム監視',
          href: '/dashboard/sensors/realtime',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: 'センサー定義',
          href: '/dashboard/sensors/definitions',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
          permissions: [1],
        },
        {
          name: '一括インポート',
          href: '/dashboard/sensors/definitions/import',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
          permissions: [1],
        },
      ],
    },
    {
      name: 'カメラ',
      href: '/dashboard/cameras',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      children: [
        {
          name: 'カメラ画像一覧',
          href: '/dashboard/cameras',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: 'カメラ一覧',
          href: '/dashboard/cameras/list',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: 'カメラ画像履歴',
          href: '/dashboard/cameras/history',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: 'カメラ画像登録',
          href: '/dashboard/cameras/upload',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
          permissions: [1, 2],
        },
        {
          name: 'カメラ設定',
          href: '/dashboard/cameras/settings',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
          permissions: [1],
        },
        {
          name: '一括インポート',
          href: '/dashboard/cameras/settings/import',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
          permissions: [1],
        },
      ],
    },
    {
      name: '閾値管理',
      href: '/dashboard/thresholds',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      permissions: [1, 2],
      children: [
        {
          name: '閾値設定',
          href: '/dashboard/thresholds/definitions',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
      ],
    },
    {
      name: 'アラート',
      href: '/dashboard/alerts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      children: [
        {
          name: 'アラート履歴',
          href: '/dashboard/alerts',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: 'メール文面管理',
          href: '/dashboard/alerts/templates',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
          permissions: [1, 2],
        },
      ],
    },
    {
      name: '分析・レポート',
      href: '/dashboard/analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
      children: [
        {
          name: '概要',
          href: '/dashboard/analytics',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: 'エリア別マップ',
          href: '/dashboard/analytics/heatmap',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
      ],
    },
    {
      name: '管理',
      href: '/dashboard/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
      permissions: [1],
      children: [
        {
          name: '管理ダッシュボード',
          href: '/dashboard/admin',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: 'テナント管理',
          href: '/dashboard/admin/tenants',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: 'ユーザー管理',
          href: '/dashboard/admin/users',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: 'メール配信先管理',
          href: '/dashboard/admin/alert-recipients',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: 'アプリ管理',
          href: '/dashboard/admin/app-settings',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
      ],
    },
    {
      name: '設定',
      href: '/dashboard/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      children: [
        {
          name: 'アカウント設定',
          href: '/dashboard/settings/account',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
        {
          name: '表示設定',
          href: '/dashboard/settings/display',
          icon: <div className="w-2 h-2 bg-current rounded-full" />,
        },
      ],
    },
  ];

  // 権限チェック
  const hasPermission = (permissions?: number[]): boolean => {
    if (!permissions) return true;
    return permissions.includes(userProfile.role_id);
  };

  // アクティブ状態チェック
  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === href;
  };

  // 親項目がアクティブかチェック
  const isParentActive = (item: NavigationItem): boolean => {
    if (isActive(item.href)) return true;
    
    if (item.children) {
      return item.children.some(child => isActive(child.href));
    }
    
    return false;
  };

  // ナビゲーション項目をレンダリング
  const renderNavItem = (item: NavigationItem, level: number = 0) => {
    if (!hasPermission(item.permissions)) {
      return null;
    }

    const active = isActive(item.href);
    const parentActive = isParentActive(item);
    const hasChildren = item.children && item.children.length > 0;
    const expanded = expandedItems.includes(item.name.toLowerCase());

    return (
      <div key={item.name}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.name.toLowerCase())}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              parentActive
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            } ${level > 0 ? 'ml-4' : ''}`}
          >
            <div className="flex items-center space-x-3">
              {item.icon}
              <span>{item.name}</span>
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <Link
            href={item.href}
            className={`flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              active
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            } ${level > 0 ? 'ml-6' : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        )}

        {/* 子項目 */}
        {hasChildren && expanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 h-full overflow-y-auto">
      <nav className="p-4 space-y-2">
        {navigation.map(item => renderNavItem(item))}
      </nav>
    </div>
  );
}