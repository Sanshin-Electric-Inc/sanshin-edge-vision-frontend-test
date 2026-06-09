// src/app/dashboard/cameras/list/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config/environment';
import { cameraApi } from '@/lib/api/camera';
import type { Place, PlacesApiResponse } from '@/types/places';
import type { CameraCodeInfo } from '@/types/camera';

interface PlaceWithCameras extends Place {
  cameras: CameraCodeInfo[];
  camerasLoading: boolean;
}

export default function CameraListPage() {
  const { userProfile, currentTenantId } = useAuth();
  const [places, setPlaces] = useState<PlaceWithCameras[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      fetchPlacesAndCameras();
    }
  }, [userProfile, currentTenantId]);

  const fetchPlacesAndCameras = async () => {
    try {
      setLoading(true);
      setError(null);

      // 場所一覧を取得
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
      const placesData = result.data || [];

      // 各場所に対してカメラコード一覧を取得
      const placesWithCameras: PlaceWithCameras[] = placesData.map((place) => ({
        ...place,
        cameras: [],
        camerasLoading: true,
      }));

      setPlaces(placesWithCameras);

      // 各場所のカメラコードを並列で取得
      await Promise.all(
        placesWithCameras.map(async (place, index) => {
          try {
            const cameraCodesResponse = await cameraApi.getCameraCodes(
              currentTenantId || '',
              place.area,
              place.spot
            );

            setPlaces((prev) => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                cameras: cameraCodesResponse.data,
                camerasLoading: false,
              };
              return updated;
            });
          } catch (err) {
            console.error(`Failed to fetch cameras for ${place.place_name}:`, err);
            setPlaces((prev) => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                cameras: [],
                camerasLoading: false,
              };
              return updated;
            });
          }
        })
      );
    } catch (err) {
      console.error('Failed to fetch places:', err);
      setError('場所情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // カメラが登録されている場所のみをフィルタリング
  const placesWithRegisteredCameras = places.filter((place) => place.cameras.length > 0);

  // 全カメラ数を計算
  const totalCameras = places.reduce((sum, place) => sum + place.cameras.length, 0);

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
          <h1 className="text-2xl font-bold text-gray-900">カメラ一覧</h1>
          <p className="mt-1 text-sm text-gray-600">
            設置されているカメラの一覧を確認できます
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">登録カメラ数</p>
          <p className="text-2xl font-bold text-blue-600">{totalCameras}</p>
        </div>
      </div>

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

      {/* カメラ一覧テーブル */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {placesWithRegisteredCameras.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-500 text-lg font-medium">カメラが登録されていません</p>
            <p className="text-gray-400 text-sm mt-2">
              カメラ画像をアップロードすると、ここに表示されます
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  場所名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  エリア-スポット
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  カメラコード
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最新画像日時
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {placesWithRegisteredCameras.map((place) =>
                place.cameras.map((camera, cameraIndex) => (
                  <tr
                    key={`${place.area}-${place.spot}-${camera.camera_code}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {cameraIndex === 0 && (
                      <>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                          rowSpan={place.cameras.length}
                        >
                          {place.place_name}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          rowSpan={place.cameras.length}
                        >
                          {place.area}-{place.spot}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {camera.camera_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(camera.latest_image_created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 情報カード */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">カメラについて</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>各場所に複数のカメラを設置できます</li>
          <li>カメラコードでカメラを識別します</li>
          <li>最新画像日時は、そのカメラで最後に撮影された画像の日時です</li>
        </ul>
      </div>
    </div>
  );
}
