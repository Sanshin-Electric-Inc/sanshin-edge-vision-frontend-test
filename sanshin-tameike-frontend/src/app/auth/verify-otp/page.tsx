// src/app/auth/verify-otp/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

type OtpType = 'invite' | 'recovery';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const typeParam = searchParams.get('type');
  const emailParam = searchParams.get('email');

  const [email, setEmail] = useState(emailParam || '');
  const [otpCode, setOtpCode] = useState('');
  const [otpType, setOtpType] = useState<OtpType>(
    typeParam === 'recovery' ? 'recovery' : 'invite'
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // スペースやハイフンを除去（メールに「834 291」のように表示される想定）
    const token = otpCode.replace(/[\s\-]/g, '');

    if (!token || token.length < 6) {
      setError('6桁の認証コードを入力してください');
      setLoading(false);
      return;
    }

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: otpType,
      });

      if (verifyError) {
        console.error('OTP verification error:', verifyError);
        setError(verifyError.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        setError('セッションの確立に失敗しました。もう一度お試しください。');
        setLoading(false);
        return;
      }

      console.log('OTP verification successful, type:', otpType);

      // タイプに応じてリダイレクト
      if (otpType === 'invite') {
        router.push('/auth/set-password');
      } else if (otpType === 'recovery') {
        router.push('/auth/update-password');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('OTP verification exception:', err);
      setError('認証コードの検証中にエラーが発生しました');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
        <div className="text-center">
          {/* ロゴ */}
          <div className="flex justify-center mb-6">
            <Image
              src="/images/sanshin-logo.jpg"
              alt="SANSHIN ELECTRONICS"
              width={80}
              height={80}
              className="rounded-lg"
            />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            認証コード入力
          </h2>
          <p className="text-gray-600">
            メールに記載された認証コードを入力してください
          </p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
          <div className="space-y-4">
            {/* 認証タイプ選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                認証の種類
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="otpType"
                    value="invite"
                    checked={otpType === 'invite'}
                    onChange={() => setOtpType('invite')}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">招待（初回パスワード設定）</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="otpType"
                    value="recovery"
                    checked={otpType === 'recovery'}
                    onChange={() => setOtpType('recovery')}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">パスワードリセット</span>
                </label>
              </div>
            </div>

            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            {/* 認証コード */}
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                認証コード
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                placeholder="000 000"
                maxLength={10}
              />
              <p className="mt-1 text-xs text-gray-500">
                メールに記載された6桁のコードを入力してください
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                検証中...
              </div>
            ) : (
              '認証コードを検証'
            )}
          </button>
        </form>

        {/* フッター */}
        <div className="text-center text-sm text-gray-500 pt-4 border-t">
          <Link
            href="/auth/signin"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            ログインページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
