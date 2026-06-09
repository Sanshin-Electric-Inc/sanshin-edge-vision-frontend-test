// src/app/auth/set-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      console.log('Checking session on set-password page...');
      
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        let session = initialSession;

        // セッションがない場合、セッションストレージから復元
        if (!session) {
          console.log('No session found, attempting to restore from sessionStorage...');
          
          const accessToken = sessionStorage.getItem('auth_access_token');
          const refreshToken = sessionStorage.getItem('auth_refresh_token');
          
          if (accessToken) {
            console.log('Restoring session from sessionStorage...');
            
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (sessionError) {
              console.error('Failed to restore session:', sessionError);
              setError('セッションの確認に失敗しました');
              setCheckingSession(false);
              return;
            }
            
            session = sessionData.session;
            console.log('Session restored successfully from sessionStorage');
            
            // トークンをクリア（セキュリティのため）
            sessionStorage.removeItem('auth_access_token');
            sessionStorage.removeItem('auth_refresh_token');
          }
        }

        if (error) {
          console.error('Session check error:', error);
          setError('セッションの確認に失敗しました');
          setCheckingSession(false);
          return;
        }

        if (!session) {
          console.error('No session found after restore attempt');
          setError('セッションが見つかりません。招待メールの認証コードから再度ログインしてください。');
          setCheckingSession(false);
          return;
        }

        console.log('Session found:', {
          email: session.user.email,
          userId: session.user.id,
        });

        setCheckingSession(false);
      } catch (err) {
        console.error('Session check exception:', err);
        setError('セッションの確認中にエラーが発生しました');
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [supabase]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // バリデーション
    if (password.length < 6) {
      setError('パスワードは6文字以上である必要があります');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    setLoading(true);

    try {
      console.log('Setting password...');

      // セッションを再確認
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('セッションが失われました。招待メールの認証コードから再度ログインしてください。');
        setLoading(false);
        return;
      }

      console.log('Session confirmed, updating password...');

      // パスワードを設定
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        setError(updateError.message);
        setLoading(false);
        return;
      }

      console.log('Password set successfully');

      // ダッシュボードにリダイレクト
      router.push('/dashboard');

    } catch (error) {
      console.error('Set password error:', error);
      setError('パスワードの設定に失敗しました');
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">セッションを確認中...</p>
        </div>
      </div>
    );
  }

  if (error && !password) {
    // セッションエラーの場合
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">セッションエラー</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
            >
              ログインページへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          パスワード設定
        </h1>
        
        <p className="text-gray-600 text-center mb-6">
          アカウントを有効化するため、パスワードを設定してください。
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="6文字以上"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="もう一度入力"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '設定中...' : 'パスワードを設定'}
          </button>
        </form>
      </div>
    </div>
  );
}