import { createBrowserClient } from '@supabase/ssr';
import { config, isLocal } from '@/lib/config/environment';

// 環境変数の検証（ローカル開発時のみ警告）
if (typeof window !== 'undefined' && isLocal()) {
  if (!config.supabase.url || !config.supabase.anonKey) {
    console.warn('Supabase configuration warning: Missing environment variables');
  }
}

// Supabaseクライアントの作成（ブラウザ用）
// 環境変数が設定されていない場合はプレースホルダー値を使用
const supabaseUrl = config.supabase.url || 'https://placeholder.supabase.co';
const supabaseAnonKey = config.supabase.anonKey || 'placeholder-key';

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// 型安全なSupabaseクライアント（TypeScript用）
export type SupabaseClient = typeof supabase;