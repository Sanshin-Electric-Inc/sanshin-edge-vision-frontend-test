// src/app/dashboard/cameras/upload/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config/environment';
import { cameraApi } from '@/lib/api/camera';
import type { Place, PlacesApiResponse } from '@/types/places';

export default function CameraUploadPage() {
  const router = useRouter();
  const { userProfile, currentTenantId } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // フォームの状態
  const [selectedPlace, setSelectedPlace] = useState<{ area: number; spot: number } | null>(null);
  const [cameraCode, setCameraCode] = useState('');
  const [metadata, setMetadata] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      fetchPlaces();
    }
  }, [userProfile, currentTenantId]);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('limit', '1000');
      params.append('sort_by', 'display_order');
      params.append('sort_order', 'asc');

      const apiUrl = `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/places?${params.toString()}`;

      const response = await fetch(apiUrl, {
        headers: {
          'x-api-key': config.api.sensorApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: PlacesApiResponse = await response.json();
      setPlaces(result.data || []);
    } catch (err) {
      console.error('Failed to fetch places:', err);
      setError('場所情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイルサイズチェック（10MB制限）
      if (file.size > 10 * 1024 * 1024) {
        setError('画像ファイルは10MB以下にしてください');
        return;
      }

      // ファイルタイプチェック
      if (!file.type.startsWith('image/')) {
        setError('画像ファイルを選択してください');
        return;
      }

      setImageFile(file);
      setError(null);

      // プレビュー生成
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlace) {
      setError('場所を選択してください');
      return;
    }

    if (!cameraCode.trim()) {
      setError('カメラコードを入力してください');
      return;
    }

    if (!imageFile) {
      setError('画像ファイルを選択してください');
      return;
    }

    // メタデータのバリデーション
    let metadataObj: Record<string, unknown> | undefined;
    if (metadata.trim()) {
      try {
        metadataObj = JSON.parse(metadata);
      } catch {
        setError('メタデータのJSON形式が不正です');
        return;
      }
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      await cameraApi.uploadImage(currentTenantId || '', {
        area: selectedPlace.area,
        spot: selectedPlace.spot,
        camera_code: cameraCode,
        metadata: metadataObj,
        image: imageFile,
      });

      setSuccess(true);

      // フォームをリセット
      setSelectedPlace(null);
      setCameraCode('');
      setMetadata('');
      setImageFile(null);
      setImagePreview(null);

      // 3秒後にカメラ画像一覧ページに遷移
      setTimeout(() => {
        router.push('/dashboard/cameras');
      }, 3000);
    } catch (err) {
      console.error('Failed to upload image:', err);
      setError(err instanceof Error ? err.message : '画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/cameras');
  };

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
          <h1 className="text-2xl font-bold text-gray-900">カメラ画像登録</h1>
          <p className="mt-1 text-sm text-gray-600">
            場所に紐づくカメラ画像をアップロードします
          </p>
        </div>
      </div>

      {/* 成功メッセージ */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-800">画像のアップロードに成功しました。カメラ画像一覧に戻ります...</span>
          </div>
        </div>
      )}

      {/* エラーメッセージ */}
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

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
        {/* 場所選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            場所 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedPlace ? `${selectedPlace.area}-${selectedPlace.spot}` : ''}
            onChange={(e) => {
              if (e.target.value) {
                const [area, spot] = e.target.value.split('-').map(Number);
                setSelectedPlace({ area, spot });
              } else {
                setSelectedPlace(null);
              }
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">場所を選択してください</option>
            {places.map((place) => (
              <option key={`${place.area}-${place.spot}`} value={`${place.area}-${place.spot}`}>
                {place.place_name} (エリア {place.area}-{place.spot})
              </option>
            ))}
          </select>
        </div>

        {/* カメラコード */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            カメラコード <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={cameraCode}
            onChange={(e) => setCameraCode(e.target.value)}
            placeholder="例: CAMERA_01"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500">カメラを識別するコードを入力してください</p>
        </div>

        {/* 画像ファイル選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            画像ファイル <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            JPG, PNG, GIF形式の画像（最大10MB）
          </p>
        </div>

        {/* 画像プレビュー */}
        {imagePreview && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">プレビュー</label>
            <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
              <img
                src={imagePreview}
                alt="アップロード予定の画像"
                className="max-w-full max-h-96 mx-auto object-contain"
              />
            </div>
          </div>
        )}

        {/* メタデータ（オプション） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            メタデータ（オプション）
          </label>
          <textarea
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            placeholder='{"temperature": 25.5, "humidity": 60}'
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            JSON形式でメタデータを入力できます（任意）
          </p>
        </div>

        {/* ボタン */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleCancel}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                アップロード中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                アップロード
              </>
            )}
          </button>
        </div>
      </form>

      {/* 注意事項 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">注意事項</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>画像ファイルは最大10MBまでアップロード可能です</li>
          <li>同じ場所・カメラコードの画像を複数回アップロードできます</li>
          <li>カメラ画像一覧では、各場所の最新画像のみが表示されます</li>
        </ul>
      </div>
    </div>
  );
}
