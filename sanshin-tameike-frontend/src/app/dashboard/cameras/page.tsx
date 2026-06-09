// src/app/dashboard/cameras/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config/environment';
import { cameraApi } from '@/lib/api/camera';
import type { Place, PlacesApiResponse } from '@/types/places';
import type { CameraImage, CameraCodeInfo } from '@/types/camera';

interface PlaceWithCamera extends Place {
  latestImage?: CameraImage;
  imageLoading?: boolean;
  imageError?: string;
  selectedCameraCode?: string; // 選択中のカメラコード（未選択時は undefined = すべて）
  cameraCodes?: CameraCodeInfo[]; // この場所に登録されているカメラコード一覧
  cameraCodesLoading?: boolean; // カメラコード一覧のローディング状態
}

export default function CamerasPage() {
  const { userProfile, currentTenantId } = useAuth();
  const [places, setPlaces] = useState<PlaceWithCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<number | 'all'>('all');
  const [selectedImage, setSelectedImage] = useState<CameraImage | null>(null);

  useEffect(() => {
    if (userProfile) {
      fetchPlacesAndImages();
    }
  }, [userProfile, filterArea, currentTenantId]);

  const fetchPlacesAndImages = async () => {
    try {
      setLoading(true);
      setError(null);

      // 場所一覧を取得
      const params = new URLSearchParams();
      if (filterArea !== 'all') {
        params.append('area', filterArea.toString());
      }
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
      const placesData = result.data || [];

      setPlaces(placesData.map(p => ({ ...p, imageLoading: true, cameraCodesLoading: true })));

      // 各場所のカメラコード一覧と最新画像を取得
      placesData.forEach(async (place) => {
        // カメラコード一覧を取得
        try {
          const cameraCodesResponse = await cameraApi.getCameraCodes(
            currentTenantId || '',
            place.area,
            place.spot
          );

          setPlaces(prev => prev.map(p =>
            p.area === place.area && p.spot === place.spot
              ? {
                  ...p,
                  cameraCodes: cameraCodesResponse.data,
                  cameraCodesLoading: false
                }
              : p
          ));
        } catch (err) {
          console.error(`Failed to fetch camera codes for ${place.area}-${place.spot}:`, err);
          setPlaces(prev => prev.map(p =>
            p.area === place.area && p.spot === place.spot
              ? { ...p, cameraCodes: [], cameraCodesLoading: false }
              : p
          ));
        }

        // 最新カメラ画像を取得
        try {
          const image = await cameraApi.getLatestImage(
            currentTenantId || '',
            place.area,
            place.spot
          );

          // 画像が存在する場合もしない場合（null）も正常なケース
          setPlaces(prev => prev.map(p =>
            p.area === place.area && p.spot === place.spot
              ? {
                  ...p,
                  latestImage: image || undefined,
                  imageLoading: false
                }
              : p
          ));
        } catch (err) {
          // 本当のエラー（ネットワークエラーなど）の場合のみ
          console.error(`Failed to fetch image for ${place.area}-${place.spot}:`, err);
          setPlaces(prev => prev.map(p =>
            p.area === place.area && p.spot === place.spot
              ? { ...p, imageLoading: false, imageError: '画像取得失敗' }
              : p
          ));
        }
      });
    } catch (err) {
      console.error('Failed to fetch places:', err);
      setError('場所情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 特定の場所の画像を再取得する関数
  const fetchImageForPlace = async (area: number, spot: number, cameraCode?: string) => {
    // ローディング状態に設定
    setPlaces(prev => prev.map(p =>
      p.area === area && p.spot === spot
        ? { ...p, imageLoading: true, imageError: undefined, selectedCameraCode: cameraCode }
        : p
    ));

    try {
      const image = await cameraApi.getLatestImage(
        currentTenantId || '',
        area,
        spot,
        cameraCode
      );

      setPlaces(prev => prev.map(p =>
        p.area === area && p.spot === spot
          ? {
              ...p,
              latestImage: image || undefined,
              imageLoading: false,
              selectedCameraCode: cameraCode
            }
          : p
      ));
    } catch (err) {
      console.error(`Failed to fetch image for ${area}-${spot}:`, err);
      setPlaces(prev => prev.map(p =>
        p.area === area && p.spot === spot
          ? { ...p, imageLoading: false, imageError: '画像取得失敗', selectedCameraCode: cameraCode }
          : p
      ));
    }
  };

  const uniqueAreas = Array.from(new Set(places.map(p => p.area))).sort((a, b) => a - b);
  const placesWithImages = places.filter(p => p.latestImage);

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
          <h1 className="text-2xl font-bold text-gray-900">カメラ画像</h1>
          <p className="mt-1 text-sm text-gray-600">
            各場所のカメラ画像を確認します
          </p>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-md">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">総設置箇所数</p>
              <p className="text-2xl font-semibold text-gray-900">{places.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-md">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">画像取得済み</p>
              <p className="text-2xl font-semibold text-gray-900">{placesWithImages.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-md">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">エリア数</p>
              <p className="text-2xl font-semibold text-gray-900">{uniqueAreas.length}</p>
            </div>
          </div>
        </div>
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

      {/* フィルター */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">エリアフィルター:</label>
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">すべて</option>
            {uniqueAreas.map(area => (
              <option key={area} value={area}>エリア {area}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            {places.length}件の場所を表示中
          </span>
          <button
            onClick={fetchPlacesAndImages}
            className="ml-auto inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            更新
          </button>
        </div>
      </div>

      {/* カメラ画像グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {places.map((place) => (
          <div key={`${place.area}-${place.spot}`} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* ヘッダー */}
            <div className="px-4 py-3 bg-gray-50 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{place.place_name}</h3>
                  <p className="text-xs text-gray-500 mt-1">エリア {place.area}-{place.spot}</p>
                </div>
              </div>

              {/* カメラコード選択 */}
              <div className="mt-2 flex items-center space-x-2">
                <label className="text-xs text-gray-600">カメラ:</label>
                {place.cameraCodesLoading ? (
                  <div className="flex items-center text-xs text-gray-500">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-500 mr-1"></div>
                    読み込み中...
                  </div>
                ) : (
                  <select
                    value={place.selectedCameraCode || ''}
                    onChange={(e) => {
                      const value = e.target.value || undefined;
                      fetchImageForPlace(place.area, place.spot, value);
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={place.imageLoading}
                  >
                    <option value="">すべて（最新）</option>
                    {place.cameraCodes?.map((cameraCodeInfo) => (
                      <option key={cameraCodeInfo.camera_code} value={cameraCodeInfo.camera_code}>
                        {cameraCodeInfo.camera_code}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 画像エリア */}
            <div className="aspect-video bg-gray-100 relative">
              {place.imageLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-xs text-gray-500">読み込み中...</p>
                  </div>
                </div>
              ) : place.imageError ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs">{place.imageError}</p>
                  </div>
                </div>
              ) : place.latestImage ? (
                <>
                  <img
                    src={place.latestImage.image_url}
                    alt={`${place.place_name}のカメラ画像`}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedImage(place.latestImage!)}
                  />
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                    {new Date(place.latestImage.created_at).toLocaleString('ja-JP')}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-xs">画像なし</p>
                  </div>
                </div>
              )}
            </div>

            {/* フッター情報 */}
            {place.latestImage && (
              <div className="px-4 py-2 bg-gray-50 border-t">
                <p className="text-xs text-gray-600">
                  カメラコード: <span className="font-mono">{place.latestImage.camera_code}</span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 画像モーダル */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedImage.image_url}
              alt="拡大画像"
              className="max-w-full max-h-[85vh] object-contain"
            />
            <div className="p-4 bg-gray-50 border-t">
              <p className="text-sm text-gray-600">
                撮影日時: {new Date(selectedImage.created_at).toLocaleString('ja-JP')}
              </p>
              <p className="text-sm text-gray-600">
                カメラコード: <span className="font-mono">{selectedImage.camera_code}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
