// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { authApi, RateLimitError, TransientError } from '@/lib/api/auth';
import { tenantApi } from '@/lib/api/admin';
import { isMockAuthActive, mockAuth } from '@/lib/auth/mockAuth';
import type { AuthUser } from '@/types/auth';
import type { User as Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: Session | null;
  userProfile: AuthUser | null;
  currentTenantId: string;
  loading: boolean;
  signOut: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<AuthUser | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // useRefでレースコンディションを防止（React stateは非同期のため）
  const profileFetchInProgressRef = useRef(false);
  // initializeAuthとonAuthStateChangeの重複呼び出し防止
  const initializedRef = useRef(false);

  // パス遷移時の loading 同期リセット（React公式パターン）
  // useEffect内のsetLoadingはレンダリング後に実行されるため、
  // dashboard layoutの最初のレンダリングに間に合わない。
  // レンダリング中にsetStateを呼ぶことで、Reactがコミット前に再レンダリングする。
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const prevPathnameRef = useRef(pathname);
  if (pathname !== prevPathnameRef.current) {
    const wasAuthPath = prevPathnameRef.current?.startsWith('/auth/');
    const isNowProtected = !pathname?.startsWith('/auth/');
    if (wasAuthPath && isNowProtected && !userProfile && !loading) {
      setLoading(true);
    }
    prevPathnameRef.current = pathname;
  }

  useEffect(() => {
    // /auth/* パスでは認証チェックをスキップ
    const isAuthPath = pathname?.startsWith('/auth/');

    // 初期セッションチェック
    const initializeAuth = async () => {
      try {
        // 認証パスの場合は初期化のみ（プロファイル取得しない）
        if (isAuthPath) {
          setLoading(false);
          return;
        }

        // モック認証チェック（開発環境のみ）
        if (isMockAuthActive()) {
          const mockUserProfile = mockAuth.getUserProfile();
          if (mockUserProfile) {
            setUserProfile(mockUserProfile);
            setLoading(false);
            return;
          }
        }

        // Supabaseセッションチェック
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);

          // PostgreSQLからユーザープロファイルを取得
          initializedRef.current = true;
          await fetchUserProfile(session.user.email!);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        // /auth/* パスでは状態更新のみ（リダイレクトしない）
        if (isAuthPath) {
          if (session?.user) {
            setUser(session.user);
          }
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);

          // initializeAuthで既にプロファイル取得中/済みならスキップ
          // INITIAL_SESSIONイベントはgetSession()と重複するため
          if (event === 'INITIAL_SESSION' && initializedRef.current) {
            console.log('Skipping duplicate profile fetch for INITIAL_SESSION');
            return;
          }

          await fetchUserProfile(session.user.email!);
        } else {
          setUser(null);
          setUserProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      initializedRef.current = false;
    };
  }, [supabase, pathname]);

  /**
   * PostgreSQLからユーザープロファイルを取得
   */
  const fetchUserProfile = async (email: string, retryCount = 0) => {
    // 既にプロファイル取得中の場合はスキップ（useRefでレースコンディション防止）
    if (retryCount === 0 && profileFetchInProgressRef.current) {
      console.log('Profile fetch already in progress, skipping');
      return;
    }
    if (retryCount === 0) {
      profileFetchInProgressRef.current = true;
    }

    try {
      console.log('Fetching user profile for:', email);

      // 新しいAPI（全テナント横断検索）を使用
      const userData = await authApi.getUserByEmail(email);

      if (!userData) {
        console.error('User not found in database:', email);
        profileFetchInProgressRef.current = false;
        // データベースにユーザーが存在しない場合はログアウト
        await signOut();
        return;
      }

      // テナント情報を取得
      const tenant = await tenantApi.get(userData.tenant_id);

      // AuthUser形式に変換
      const authUser: AuthUser = {
        id: BigInt(userData.id),
        tenant_id: userData.tenant_id,
        name: userData.name,
        email: userData.email,
        role_id: userData.role_id,
        is_super_admin: userData.is_super_admin,
        created_at: userData.created_at,
        tenant: {
          tenant_id: tenant.tenant_id,
          tenant_name: tenant.tenant_name,
          created_at: new Date().toISOString(),
        },
        permissions: getPermissionsByRole(userData.role_id, userData.is_super_admin),
      };

      setUserProfile(authUser);
      setCurrentTenantId(userData.tenant_id);
      profileFetchInProgressRef.current = false;
      console.log('User profile loaded:', authUser);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);

      // レート制限やサーバーエラーの場合はsignOutせずリトライ
      if ((error instanceof RateLimitError || error instanceof TransientError) && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.warn(`Transient error, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
        setTimeout(() => fetchUserProfile(email, retryCount + 1), delay);
        return;
      }

      // 一時的エラーの場合はリトライ上限でもsignOutしない
      if (error instanceof RateLimitError || error instanceof TransientError) {
        console.error('Max retries reached for transient error. Not signing out.');
        profileFetchInProgressRef.current = false;
        return;
      }

      // ユーザーが存在しないなど永続的なエラーの場合のみログアウト
      profileFetchInProgressRef.current = false;
      await signOut();
    }
  };

  /**
   * ロールIDから権限を取得
   */
  const getPermissionsByRole = (roleId: number, isSuperAdmin?: boolean): string[] => {
    if (isSuperAdmin) {
      return ['read', 'write', 'delete', 'admin', 'super_admin', 'manage_tenants'];
    }

    switch (roleId) {
      case 1: // テナント管理者
        return ['read', 'write', 'delete', 'admin'];
      case 2: // 一般ユーザー
        return ['read', 'write'];
      case 3: // 閲覧者
        return ['read'];
      default:
        return [];
    }
  };

  /**
   * サインアウト
   */
  const signOut = async () => {
    try {
      // モック認証の場合
      if (isMockAuthActive()) {
        await mockAuth.signOut();
        setUserProfile(null);
        setCurrentTenantId('');
        router.push('/auth/signin');
        return;
      }

      // Supabase認証の場合
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      setCurrentTenantId('');
      router.push('/auth/signin');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  /**
   * テナント切り替え（SUPER_ADMINのみ）
   */
  const switchTenant = async (tenantId: string) => {
    try {
      console.log('Switching tenant to:', tenantId);

      if (!userProfile?.is_super_admin) {
        console.error('Only SUPER_ADMIN can switch tenants');
        return;
      }

      // テナント情報を取得
      const tenant = await tenantApi.get(tenantId);

      // ユーザープロファイルのテナント情報を更新
      setUserProfile({
        ...userProfile,
        tenant_id: tenantId,
        tenant: {
          tenant_id: tenant.tenant_id,
          tenant_name: tenant.tenant_name,
          created_at: new Date().toISOString(),
        },
      });

      setCurrentTenantId(tenantId);
      console.log('Tenant switched successfully to:', tenantId);
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        currentTenantId,
        loading,
        signOut,
        switchTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
