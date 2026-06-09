// src/lib/api/auth.ts

import { config } from '@/lib/config/environment';
import type { User } from '@/types/admin';

const AUTH_API_BASE = `${config.api.sensorApiUrl}/api/auth/v1`;

// ヘッダー生成ヘルパー
const getHeaders = () => ({
  'x-api-key': config.api.sensorApiKey,
  'Content-Type': 'application/json',
});

// エラーハンドリングヘルパー
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  return response.json();
};

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class TransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransientError';
  }
}

export const authApi = {
  /**
   * メールアドレスでユーザーを検索（全テナント横断）
   * GET /api/auth/v1/users/by-email?email={email}
   */
  getUserByEmail: async (email: string): Promise<User | null> => {
    const url = `${AUTH_API_BASE}/users/by-email?email=${encodeURIComponent(email)}`;

    console.log('Fetching user by email:', { url, email });

    try {
      const response = await fetch(url, {
        headers: getHeaders(),
      });

      // 404の場合はユーザーが存在しない
      if (response.status === 404) {
        console.log('User not found:', email);
        return null;
      }

      // 429の場合はレート制限エラー（signOutしてはいけない）
      if (response.status === 429) {
        throw new RateLimitError('API rate limit exceeded');
      }

      // 5xxの場合はサーバー側の一時的エラー
      if (response.status >= 500) {
        throw new TransientError(`Server error: ${response.status}`);
      }

      const user = await handleResponse<User>(response);
      console.log('User found:', user);
      return user;
    } catch (error) {
      console.error('Failed to fetch user by email:', error);
      throw error;
    }
  },
};