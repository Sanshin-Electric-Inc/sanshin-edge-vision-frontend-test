// src/lib/config/environment.ts
export type Environment = 'local' | 'dev' | 'staging' | 'production';

/**
 * 現在の実行環境を取得
 * ローカル開発時: NODE_ENV から判定
 * AWS Lambda上: ENVIRONMENT 環境変数から判定
 */
export const getEnvironment = (): Environment => {
  // ローカル開発環境の場合
  if (process.env.NODE_ENV === 'development') {
    return 'local';
  }
  
  // AWS Lambda上での環境判定
  const awsEnvironment = process.env.ENVIRONMENT as Environment;
  return awsEnvironment || 'dev';
};

/**
 * 開発環境かどうかを判定（ログインスキップ対象）
 * - local: ローカル開発環境
 * - dev: AWS開発環境
 * - staging: AWSステージング環境
 */
export const isDevelopment = (): boolean => {
  const env = getEnvironment();
  return env === 'local' || env === 'dev' || env === 'staging';
};

/**
 * 本番環境かどうかを判定
 */
export const isProduction = (): boolean => {
  return getEnvironment() === 'production';
};

/**
 * ローカル環境かどうかを判定
 */
export const isLocal = (): boolean => {
  return getEnvironment() === 'local';
};

/**
 * AWS環境かどうかを判定（Lambda上で動作）
 */
export const isAWS = (): boolean => {
  return !isLocal();
};

/**
 * 環境表示用の日本語名を取得
 */
export const getEnvironmentDisplayName = (env?: Environment): string => {
  const currentEnv = env || getEnvironment();
  
  const displayNames: Record<Environment, string> = {
    local: 'ローカル開発',
    dev: '開発環境',
    staging: 'ステージング環境',
    production: '本番環境'
  };
  
  return displayNames[currentEnv];
};

/**
 * 環境設定の検証（ローカル開発時のみ厳格チェック）
 */
export const validateConfig = (): void => {
  // ローカル開発環境でのみ厳格な検証
  if (!isLocal()) {
    return; // 本番環境では検証をスキップ
  }
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredEnvVars.filter(
    envVar => !process.env[envVar]
  );
  
  if (missing.length > 0) {
    console.warn(
      `Missing environment variables in local development: ${missing.join(', ')}`
    );
  }
};

/**
 * デバッグログ出力関数
 * 開発環境でのみログを出力
 */
export const debugLog = (message: string, ...args: unknown[]): void => {
  if (config.debug.enabled) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};

// 環境別設定
export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Sanshin Edge Vision',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: getEnvironment(),
    displayName: getEnvironmentDisplayName(),
  },
  
  // Supabase設定
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  
  // API設定
  api: {
    baseUrl: isLocal() 
      ? 'http://localhost:3000' 
      : `https://api-${getEnvironment()}.example.com`,
    sensorApiUrl: process.env.NEXT_PUBLIC_SENSOR_API_URL || '',
    sensorApiKey: process.env.NEXT_PUBLIC_SENSOR_API_KEY || '',
    // Alert API用のURL（テンプレートAPI用。閾値APIはSensor APIを使用）
    alertApiUrl: process.env.NEXT_PUBLIC_ALERT_API_URL || process.env.NEXT_PUBLIC_SENSOR_API_URL || '',
  },
  
  // 認証設定
  auth: {
    skipLogin: isDevelopment(), // 開発環境ではログインスキップ
  },
  
  // デバッグ設定
  debug: {
    enabled: !isProduction(),
    logLevel: isLocal() ? 'verbose' : isProduction() ? 'error' : 'info',
  },
  
  // 地図設定
  map: {
    // デフォルトの地図中心（東京駅）
    defaultCenter: [35.6812, 139.7671] as [number, number],
    
    // デフォルトのズームレベル
    defaultZoom: 10,
    
    // デフォルトの地図タイプ
    defaultMapType: 'std' as const,
    
    // 最大ズームレベル
    maxZoom: 18,
    
    // 最小ズームレベル
    minZoom: 6,
    
    // 自動更新のデフォルト設定
    autoRefresh: false,
    
    // 自動更新の間隔（ミリ秒）
    refreshInterval: 30000, // 30秒
    
    // マーカークラスター設定
    clusterEnabled: true,
    clusterMaxZoom: 15,
    clusterRadius: 80,
    
    // タイルレイヤー設定
    tileLayer: {
      // 国土地理院タイルのベースURL
      gsiBaseUrl: 'https://cyberjapandata.gsi.go.jp/xyz',
      
      // フォールバックタイル（OpenStreetMap）
      fallbackUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      
      // タイル読み込みタイムアウト（ミリ秒）
      timeout: 5000,
      
      // リトライ回数
      retryAttempts: 3,
    },
    
    // マーカー設定
    marker: {
      // デフォルトのマーカーサイズ
      defaultSize: 'medium' as const,
      
      // パルスアニメーション有効
      enablePulse: false,
      
      // カスタムアイコンのベースパス
      customIconBasePath: '/images/markers',
    },
    
    // データ設定
    data: {
      // 最新データとみなす時間（ミリ秒）
      recentDataThreshold: 60 * 60 * 1000, // 1時間
      
      // オフラインとみなす時間（ミリ秒）
      offlineThreshold: 24 * 60 * 60 * 1000, // 24時間
      
      // 取得するデータの最大件数
      maxDataPoints: 1000,
    },
    
    // パフォーマンス設定
    performance: {
      // レンダリング最適化
      enableVirtualization: true,
      
      // マーカーの描画バッチサイズ
      markerBatchSize: 100,
      
      // 地図移動時のデバウンス時間（ミリ秒）
      moveDebounceTime: 300,
    },
    
    // UI設定
    ui: {
      // コントロールパネルを表示
      showControls: true,
      
      // 統計情報を表示
      showStats: true,
      
      // フルスクリーンボタンを表示
      showFullscreenButton: true,
      
      // 凡例を表示
      showLegend: true,
    },
  },
};