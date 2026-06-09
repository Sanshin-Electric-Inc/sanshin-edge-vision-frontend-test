// lib/auth/mockAuth.ts
import { isLocal, debugLog } from '@/lib/config/environment';
import type { AuthUser, Tenant } from '@/types/auth';

// 文字列をBigIntに戻すヘルパー関数
const deserializeAuthUser = (userData: Record<string, unknown>): AuthUser => {
  return {
    ...userData,
    id: BigInt(userData.id as string), // 文字列をBigIntに戻す
  } as AuthUser;
};

// モックユーザーデータ（BigIntではなく文字列で管理）
const MOCK_USERS = {
  'User': {
    password: 'pw',
    userData: {
      id: '1', // 文字列として保存
      tenant_id: 'test-tenant-002-dev-blue-swagger',
      name: 'Test User',
      email: 'test@example.com',
      role_id: 1, // 管理者
      is_super_admin: false,
      created_at: new Date().toISOString(),
      tenant: {
        tenant_id: 'test-tenant-002-dev-blue-swagger',
        tenant_name: 'Development Tenant',
        created_at: new Date().toISOString(),
      } as Tenant,
      permissions: ['read', 'write', 'delete', 'admin'],
    },
  },
  'demo': {
    password: 'demo',
    userData: {
      id: '2', // 文字列として保存
      tenant_id: 'tenant-demo-001',
      name: 'Demo User',
      email: 'demo@example.com',
      role_id: 2, // 一般ユーザー
      is_super_admin: false,
      created_at: new Date().toISOString(),
      tenant: {
        tenant_id: 'tenant-demo-001',
        tenant_name: 'Demo Tenant',
        created_at: new Date().toISOString(),
      } as Tenant,
      permissions: ['read', 'write'],
    },
  },
};

// モック認証の実行
export const mockAuth = {
  signIn: async (username: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
    if (!isLocal()) {
      return { success: false, error: 'Mock authentication is only available in local environment' };
    }

    debugLog('Attempting mock authentication for:', username);

    // ユーザー検証
    const mockUser = MOCK_USERS[username as keyof typeof MOCK_USERS];
    if (!mockUser || mockUser.password !== password) {
      return { success: false, error: 'Invalid username or password' };
    }

    // モックセッションをセッションストレージに保存（開発環境のみ）
    if (typeof window !== 'undefined') {
      const mockSession = {
        user: {
          id: mockUser.userData.id, // 既に文字列
          email: mockUser.userData.email,
          user_metadata: {
            name: mockUser.userData.name,
          },
        },
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24時間後
        token_type: 'bearer',
      };

      // シリアライゼーション可能なデータとして保存
      const serializableUserData = {
        ...mockUser.userData,
        id: mockUser.userData.id, // 既に文字列なのでそのまま
      };

      sessionStorage.setItem('mock-session', JSON.stringify(mockSession));
      sessionStorage.setItem('mock-user-profile', JSON.stringify(serializableUserData));
    }

    debugLog('Mock authentication successful for:', username);
    
    // AuthUserとして返す際はBigIntに変換
    const authUser: AuthUser = {
      ...mockUser.userData,
      id: BigInt(mockUser.userData.id), // 文字列をBigIntに変換
    };
    
    return { success: true, user: authUser };
  },

  signOut: async (): Promise<void> => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mock-session');
      sessionStorage.removeItem('mock-user-profile');
    }
    debugLog('Mock sign out completed');
  },

  getSession: (): Record<string, unknown> | null => {
    if (typeof window !== 'undefined' && isLocal()) {
      const mockSession = sessionStorage.getItem('mock-session');
      return mockSession ? JSON.parse(mockSession) : null;
    }
    return null;
  },

  getUserProfile: (): AuthUser | null => {
    if (typeof window !== 'undefined' && isLocal()) {
      const profile = sessionStorage.getItem('mock-user-profile');
      if (profile) {
        const userData = JSON.parse(profile);
        // 取得時にBigIntに変換
        return deserializeAuthUser(userData);
      }
    }
    return null;
  },

  isActive: (): boolean => {
    if (!isLocal()) return false;
    const session = mockAuth.getSession();
    if (session === null) return false;
    
    const expiresAt = session.expires_at as number;
    return expiresAt > Date.now();
  },
};

// モック認証が有効かどうかを確認
export const isMockAuthActive = (): boolean => {
  return isLocal() && mockAuth.isActive();
};