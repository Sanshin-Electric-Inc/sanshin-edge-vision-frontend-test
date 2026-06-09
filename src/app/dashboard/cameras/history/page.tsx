// src/app/dashboard/cameras/history/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config/environment';
import { cameraApi } from '@/lib/api/camera';
import type { Place, PlacesApiResponse } from '@/types/places';
import type { CameraImage, CameraCodeInfo } from '@/types/camera';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Swiperスタイル
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// 日時プリセットの定義
type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'week', label: '過去7日' },
  { value: 'month', label: '過去30日' },
  { value: 'custom', label: 'カスタム' },
];

// 日付プリセットから日時範囲を計算
const getDateRange = (preset: DatePreset): { from: string | undefined; to: string | undefined } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        from: today.toISOString(),
        to: tomorrow.toISOString(),
      };
    }
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: yesterday.toISOString(),
        to: today.toISOString(),
      };
    }
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return {
        from: weekAgo.toISOString(),
        to: now.toISOString(),
      };
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return {
        from: monthAgo.toISOString(),
        to: now.toISOString(),
      };
    }
    case 'all':
    default:
      return { from: undefined, to: undefined };
  }
};

// ローカル日時文字列をISO文字列に変換
const localToIso = (localDateTime: string): string => {
  if (!localDateTime) return '';
  const date = new Date(localDateTime);
  return date.toISOString();
};

// ISO文字列をローカル日時入力用に変換
const isoToLocal = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

export default function CameraHistoryPage() {
  const { userProfile, currentTenantId } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [cameraCodes, setCameraCodes] = useState<CameraCodeInfo[]>([]);
  const [cameraImages, setCameraImages] = useState<CameraImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 選択状態
  const [selectedPlace, setSelectedPlace] = useState<{ area: number; spot: number } | null>(null);
  const [selectedCameraCode, setSelectedCameraCode] = useState<string>('');

  // 日時フィルター
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');

  // 画像選択ドロップダウン
  const [isImageDropdownOpen, setIsImageDropdownOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const swiperRef = useRef<SwiperType | null>(null);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsImageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 画像選択時のハンドラー
  const handleImageSelect = (index: number) => {
    setCurrentSlideIndex(index);
    setIsImageDropdownOpen(false);
    if (swiperRef.current) {
      swiperRef.current.slideTo(index);
    }
  };

  // 場所一覧を取得
  useEffect(() => {
    if (userProfile && currentTenantId) {
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

  // 場所が選択されたらカメラコード一覧を取得
  useEffect(() => {
    if (selectedPlace && currentTenantId) {
      fetchCameraCodes(selectedPlace.area, selectedPlace.spot);
    } else {
      setCameraCodes([]);
      setSelectedCameraCode('');
      setCameraImages([]);
    }
  }, [selectedPlace, currentTenantId]);

  const fetchCameraCodes = async (area: number, spot: number) => {
    try {
      const response = await cameraApi.getCameraCodes(currentTenantId || '', area, spot);
      setCameraCodes(response.data);

      // カメラコードがある場合、最初のものを選択
      if (response.data.length > 0) {
        setSelectedCameraCode(response.data[0].camera_code);
      } else {
        setSelectedCameraCode('');
        setCameraImages([]);
      }
    } catch (err) {
      console.error('Failed to fetch camera codes:', err);
      setCameraCodes([]);
      setSelectedCameraCode('');
      setCameraImages([]);
    }
  };

  // カメラコードまたは日時フィルターが変更されたら画像一覧を取得
  useEffect(() => {
    if (selectedPlace && selectedCameraCode && currentTenantId) {
      fetchCameraImages(selectedPlace.area, selectedPlace.spot, selectedCameraCode);
    } else {
      setCameraImages([]);
    }
  }, [selectedPlace, selectedCameraCode, currentTenantId, datePreset, customFromDate, customToDate]);

  const fetchCameraImages = async (area: number, spot: number, cameraCode: string) => {
    try {
      setImagesLoading(true);
      setError(null);

      // 日時範囲を計算
      let fromDate: string | undefined;
      let toDate: string | undefined;

      if (datePreset === 'custom') {
        fromDate = customFromDate ? localToIso(customFromDate) : undefined;
        toDate = customToDate ? localToIso(customToDate) : undefined;
      } else {
        const range = getDateRange(datePreset);
        fromDate = range.from;
        toDate = range.to;
      }

      const response = await cameraApi.getCameraImages(
        currentTenantId || '',
        area,
        spot,
        {
          camera_code: cameraCode,
          from: fromDate,
          to: toDate,
          limit: 100,
          order: 'desc', // 新しい順
        }
      );

      setCameraImages(response.data);
    } catch (err) {
      console.error('Failed to fetch camera images:', err);
      setError('カメラ画像の取得に失敗しました');
      setCameraImages([]);
    } finally {
      setImagesLoading(false);
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
      second: '2-digit',
    }).format(date);
  };

  // プリセット変更時のハンドラー
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setCurrentSlideIndex(0); // 画像選択をリセット
    if (preset !== 'custom') {
      setCustomFromDate('');
      setCustomToDate('');
    }
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
          <h1 className="text-2xl font-bold text-gray-900">カメラ画像履歴</h1>
          <p className="mt-1 text-sm text-gray-600">
            カメラ毎の過去の画像を時系列で確認できます
          </p>
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

      {/* 選択フォーム */}
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 場所選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              場所を選択
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
                setCurrentSlideIndex(0); // 画像選択をリセット
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">場所を選択してください</option>
              {places.map((place) => (
                <option key={`${place.area}-${place.spot}`} value={`${place.area}-${place.spot}`}>
                  {place.place_name} (エリア {place.area}-{place.spot})
                </option>
              ))}
            </select>
          </div>

          {/* カメラコード選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カメラを選択
            </label>
            <select
              value={selectedCameraCode}
              onChange={(e) => {
                setSelectedCameraCode(e.target.value);
                setCurrentSlideIndex(0); // 画像選択をリセット
              }}
              disabled={!selectedPlace || cameraCodes.length === 0}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">カメラを選択してください</option>
              {cameraCodes.map((camera) => (
                <option key={camera.camera_code} value={camera.camera_code}>
                  {camera.camera_code} (最新: {formatDate(camera.latest_image_created_at)})
                </option>
              ))}
            </select>
          </div>

          {/* 画像選択（カスタムドロップダウン） */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              画像を選択
            </label>
            <button
              type="button"
              onClick={() => setIsImageDropdownOpen(!isImageDropdownOpen)}
              disabled={cameraImages.length === 0}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between"
            >
              <span className={cameraImages.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                {cameraImages.length === 0
                  ? '画像がありません'
                  : cameraImages[currentSlideIndex]
                    ? formatDate(cameraImages[currentSlideIndex].created_at)
                    : '画像を選択してください'}
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isImageDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isImageDropdownOpen && cameraImages.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {cameraImages.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => handleImageSelect(index)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between ${
                      index === currentSlideIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                    }`}
                  >
                    <span>{formatDate(image.created_at)}</span>
                    <span className="text-xs text-gray-500">#{image.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 日時フィルター */}
        <div className="pt-4 border-t">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            期間で絞り込み
          </label>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetChange(preset.value)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  datePreset === preset.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* カスタム日時入力 */}
          {datePreset === 'custom' && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  開始日時
                </label>
                <input
                  type="datetime-local"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  終了日時
                </label>
                <input
                  type="datetime-local"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 情報表示 */}
        {selectedPlace && selectedCameraCode && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{cameraImages.length}枚</span>の画像が見つかりました
              {cameraImages.length >= 100 && (
                <span className="text-amber-600 ml-2">（最大100件）</span>
              )}
            </div>
            {cameraImages.length > 0 && (
              <div className="text-sm text-gray-500">
                期間: {formatDate(cameraImages[cameraImages.length - 1].created_at)} 〜 {formatDate(cameraImages[0].created_at)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 画像スライダー */}
      {imagesLoading ? (
        <div className="flex items-center justify-center min-h-[500px] bg-white rounded-lg shadow-sm border">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">画像を読み込み中...</p>
          </div>
        </div>
      ) : cameraImages.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <Swiper
            modules={[Navigation, Pagination]}
            spaceBetween={30}
            slidesPerView={1}
            navigation
            pagination={{
              type: 'fraction',
            }}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onSlideChange={(swiper) => {
              setCurrentSlideIndex(swiper.activeIndex);
            }}
            className="camera-history-swiper"
            style={{ height: '600px' }}
          >
            {cameraImages.map((image, index) => (
              <SwiperSlide key={image.id}>
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="relative w-full h-[500px] flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={image.image_url}
                      alt={`カメラ画像 ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-4 w-full">
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                      <div>
                        <p className="text-sm text-gray-600">撮影日時</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatDate(image.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">画像 ID</p>
                        <p className="text-lg font-mono text-gray-900">#{image.id}</p>
                      </div>
                    </div>
                    {image.metadata && Object.keys(image.metadata).length > 0 && (
                      <div className="mt-2 bg-blue-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-blue-900 mb-1">メタデータ</p>
                        <pre className="text-xs text-blue-800 overflow-auto">
                          {JSON.stringify(image.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      ) : selectedPlace && selectedCameraCode ? (
        <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-lg shadow-sm border">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500 text-lg font-medium">画像が見つかりませんでした</p>
          <p className="text-gray-400 text-sm mt-2">
            {datePreset !== 'all'
              ? '指定した期間内に画像がないか、条件を変更してください'
              : '選択したカメラにはまだ画像がアップロードされていません'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-lg shadow-sm border">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 text-lg font-medium">場所とカメラを選択してください</p>
          <p className="text-gray-400 text-sm mt-2">
            履歴を表示するには、上記のフォームから場所とカメラを選択してください
          </p>
        </div>
      )}

      {/* 使い方 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">使い方</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>場所を選択すると、その場所に登録されているカメラ一覧が表示されます</li>
          <li>カメラを選択すると、過去100枚までの画像が時系列で表示されます</li>
          <li>「画像を選択」から特定の日時の画像に直接ジャンプできます</li>
          <li>「期間で絞り込み」で表示する画像の期間を指定できます</li>
          <li>「カスタム」を選択すると、任意の開始・終了日時を指定できます</li>
          <li>左右の矢印ボタンで画像を切り替えられます</li>
        </ul>
      </div>
    </div>
  );
}
