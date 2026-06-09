// src/app/dashboard/settings/display/page.tsx
'use client';

import { useTheme } from '@/contexts/ThemeContext';

export default function DisplaySettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">表示設定</h2>
        <p className="text-gray-600 mt-1">
          画面の表示に関する設定を変更できます
        </p>
      </div>

      {/* ダークモード設定 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">テーマ</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">ダークモード</p>
            <p className="text-sm text-gray-500 mt-1">
              画面を暗い配色に切り替えます
            </p>
          </div>

          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="ダークモード切替"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* プレビュー */}
        <div className="mt-6 p-4 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">プレビュー</p>
          <div className="flex space-x-4">
            {/* ライトモードプレビュー */}
            <div
              className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                theme === 'light'
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => theme === 'dark' && toggleTheme()}
            >
              <div className="bg-white border border-gray-200 rounded p-2 mb-2">
                <div className="h-2 bg-gray-800 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-gray-400 rounded w-1/2"></div>
              </div>
              <p className="text-xs text-center text-gray-600 font-medium">ライト</p>
            </div>

            {/* ダークモードプレビュー */}
            <div
              className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => theme === 'light' && toggleTheme()}
            >
              <div className="bg-gray-800 border border-gray-600 rounded p-2 mb-2">
                <div className="h-2 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-gray-500 rounded w-1/2"></div>
              </div>
              <p className="text-xs text-center text-gray-600 font-medium">ダーク</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
