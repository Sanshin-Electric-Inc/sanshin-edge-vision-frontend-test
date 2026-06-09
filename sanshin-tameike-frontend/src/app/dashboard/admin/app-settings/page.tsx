// src/app/dashboard/admin/app-settings/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { tenantSettingsApi } from '@/lib/api/admin';
import type { TenantSettings } from '@/types/admin';
import { config } from '@/lib/config/environment';

const MAX_ICON_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_ICON_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default function AppSettingsPage() {
  const { currentTenantId } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [deletingIcon, setDeletingIcon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [appName, setAppName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await tenantSettingsApi.get(currentTenantId);
        setSettings(result);
        setAppName(result.app_name || '');
      } catch (err) {
        console.error('Failed to fetch tenant settings:', err);
        // 設定が存在しない場合はデフォルト値を使用
        setAppName(config.app.name);
      } finally {
        setLoading(false);
      }
    };

    if (currentTenantId) {
      fetchSettings();
    }
  }, [currentTenantId]);

  const validateForm = (): boolean => {
    if (!appName.trim()) {
      setFormError('アプリ名は必須です');
      return false;
    }
    if (appName.length > 100) {
      setFormError('アプリ名は100文字以内で入力してください');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await tenantSettingsApi.update(currentTenantId, {
        app_name: appName.trim(),
      });

      setSettings(result);
      setSuccess('設定を保存しました');

      // 3秒後に成功メッセージを消す
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save tenant settings:', err);
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setAppName(settings?.app_name || config.app.name);
    setFormError(null);
  };

  const validateIconFile = (file: File): string | null => {
    if (!ALLOWED_ICON_TYPES.includes(file.type)) {
      return 'PNG、JPEG、WebP形式のみアップロード可能です';
    }
    if (file.size > MAX_ICON_SIZE) {
      return 'ファイルサイズは1MB以下にしてください';
    }
    return null;
  };

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateIconFile(file);
    if (validationError) {
      setIconError(validationError);
      return;
    }

    setIconError(null);
    // プレビュー用のURLを作成
    const previewUrl = URL.createObjectURL(file);
    setIconPreview(previewUrl);
  };

  const handleIconUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setIconError('ファイルを選択してください');
      return;
    }

    const validationError = validateIconFile(file);
    if (validationError) {
      setIconError(validationError);
      return;
    }

    try {
      setUploadingIcon(true);
      setIconError(null);
      setError(null);
      setSuccess(null);

      const result = await tenantSettingsApi.uploadIcon(currentTenantId, file);
      setSettings(result);
      setIconPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSuccess('アイコンをアップロードしました');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to upload icon:', err);
      setIconError(err instanceof Error ? err.message : 'アイコンのアップロードに失敗しました');
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleIconDelete = async () => {
    if (!settings?.app_icon_url) return;

    if (!confirm('アイコンを削除してもよろしいですか？')) return;

    try {
      setDeletingIcon(true);
      setIconError(null);
      setError(null);
      setSuccess(null);

      const result = await tenantSettingsApi.deleteIcon(currentTenantId);
      setSettings(result);
      setSuccess('アイコンを削除しました');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to delete icon:', err);
      setIconError(err instanceof Error ? err.message : 'アイコンの削除に失敗しました');
    } finally {
      setDeletingIcon(false);
    }
  };

  const handleCancelIconPreview = () => {
    setIconPreview(null);
    setIconError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 現在表示するアイコンURL（プレビュー > 設定済み > デフォルト）
  const displayIconUrl = iconPreview || settings?.app_icon_url || '/images/sanshin-logo.jpg';
  const hasCustomIcon = !!settings?.app_icon_url;

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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">アプリ管理</h2>
        <p className="text-gray-600 mt-1">
          アプリケーションの表示設定を管理します
        </p>
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

      {/* 成功メッセージ */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800">{success}</span>
          </div>
        </div>
      )}

      {/* アイコン設定 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          アプリアイコン
        </h3>

        <div className="space-y-4">
          {/* 現在のアイコン表示 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                {displayIconUrl ? (
                  <Image
                    src={displayIconUrl}
                    alt="App Icon"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized={displayIconUrl.startsWith('blob:') || displayIconUrl.includes('s3.amazonaws.com')}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              {iconPreview && (
                <div className="mt-1 text-xs text-blue-600 text-center">プレビュー</div>
              )}
            </div>

            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-2">
                {hasCustomIcon ? 'カスタムアイコンが設定されています' : 'デフォルトアイコンを使用中'}
              </div>

              {/* ファイル選択 */}
              <div className="flex items-center space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleIconSelect}
                  className="hidden"
                  id="icon-upload"
                />
                <label
                  htmlFor="icon-upload"
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors"
                >
                  ファイルを選択
                </label>

                {iconPreview && (
                  <>
                    <button
                      onClick={handleIconUpload}
                      disabled={uploadingIcon}
                      className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {uploadingIcon ? 'アップロード中...' : 'アップロード'}
                    </button>
                    <button
                      onClick={handleCancelIconPreview}
                      disabled={uploadingIcon}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      キャンセル
                    </button>
                  </>
                )}

                {hasCustomIcon && !iconPreview && (
                  <button
                    onClick={handleIconDelete}
                    disabled={deletingIcon}
                    className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                  >
                    {deletingIcon ? '削除中...' : '削除'}
                  </button>
                )}
              </div>

              {/* アイコンエラー */}
              {iconError && (
                <p className="mt-2 text-sm text-red-500">{iconError}</p>
              )}

              <p className="mt-2 text-xs text-gray-500">
                PNG、JPEG、WebP形式 / 最大1MB
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* アプリ名設定 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          アプリ名
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* アプリ名 */}
          <div>
            <label htmlFor="appName" className="block text-sm font-medium text-gray-700 mb-1">
              アプリ名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="appName"
              value={appName}
              onChange={(e) => {
                setAppName(e.target.value);
                setFormError(null);
              }}
              className={`w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                formError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="例: Sanshin Edge Vision"
              maxLength={100}
            />
            {formError && (
              <p className="mt-1 text-sm text-red-500">{formError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              ヘッダーに表示されるアプリケーション名です
            </p>
          </div>

          {/* プレビュー */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">プレビュー</div>
            <div className="flex items-center space-x-2 bg-white rounded-lg p-3 border">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                {displayIconUrl ? (
                  <Image
                    src={displayIconUrl}
                    alt="App Icon"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    unoptimized={displayIconUrl.startsWith('blob:') || displayIconUrl.includes('s3.amazonaws.com')}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <span className="text-xl font-semibold text-gray-900">
                {appName || 'アプリ名未設定'}
              </span>
            </div>
          </div>

          {/* 最終更新日時 */}
          {settings?.updated_at && (
            <div className="text-sm text-gray-500">
              最終更新: {new Date(settings.updated_at).toLocaleString('ja-JP')}
            </div>
          )}

          {/* ボタン */}
          <div className="flex items-center space-x-3 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </span>
              ) : (
                '保存'
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              リセット
            </button>
          </div>
        </form>
      </div>

      {/* 現在のテナント情報 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium">現在のテナント:</span>{' '}
          <code className="bg-gray-200 px-2 py-0.5 rounded">{currentTenantId}</code>
        </div>
      </div>
    </div>
  );
}
