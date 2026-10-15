// src/app/dashboard/sensors/definitions/import/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRef, useState } from 'react';
import { config } from '@/lib/config/environment';

interface BulkImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[] | null;
}

export default function SensorCodeDefinitionImportPage() {
  const { currentTenantId } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !currentTenantId) return;

    try {
      setSubmitting(true);
      setError(null);
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const apiUrl = `${config.api.sensorApiUrl}/api/sensor/v1/tenants/${currentTenantId}/sensor-code-definitions/bulk-import`;

      // Content-Typeはブラウザがboundary付きで自動設定するため指定しない
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': config.api.sensorApiKey,
        },
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || `インポートに失敗しました (HTTP ${response.status})`);
      }

      setResult(data as BulkImportResult);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error importing sensor code definitions:', err);
      setError(err instanceof Error ? err.message : 'インポートに失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">センサー定義 一括インポート</h1>
          <p className="text-gray-600 mt-1">CSVファイルからセンサーコード定義をまとめて登録</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-2">CSVフォーマット</h2>
        <p className="text-sm text-gray-600 mb-2">1行目はヘッダー行として読み飛ばされます。列の順序は以下の通りです（unit・description・is_activeは省略可）。</p>
        <code className="block bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800">
          area, spot, sensor_code, name, data_type, unit, description, is_active
        </code>
        <p className="text-sm text-gray-600 mt-3 mb-2">記入例</p>
        <pre className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 overflow-x-auto">
{`area,spot,sensor_code,name,data_type,unit,description,is_active
1,1,water_level,水位,float,cm,水位計の測定値,true
1,1,temperature,水温,float,℃,,
1,2,door_open,扉開閉,boolean,,,false`}
        </pre>
        <ul className="text-xs text-gray-500 mt-2 space-y-1 list-disc list-inside">
          <li>data_type は string / int / float / boolean のいずれか</li>
          <li>is_active は true / false / 1 / 0 のいずれか（空欄の場合は true）</li>
          <li>カンマの後にスペースを入れないでください。文字コードは UTF-8 で保存してください</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CSVファイル</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <button
          type="submit"
          disabled={!file || !currentTenantId || submitting}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'インポート中...' : 'インポート実行'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">インポート結果</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 p-3 text-center">
              <div className="text-xs text-gray-500">合計</div>
              <div className="text-2xl font-bold text-gray-900">{result.total}</div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
              <div className="text-xs text-green-700">成功</div>
              <div className="text-2xl font-bold text-green-700">{result.success}</div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
              <div className="text-xs text-red-700">失敗</div>
              <div className="text-2xl font-bold text-red-700">{result.failed}</div>
            </div>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">エラー詳細</h3>
              <ul className="max-h-80 overflow-y-auto divide-y divide-red-100 border border-red-200 rounded-md bg-red-50">
                {result.errors.map((msg, i) => (
                  <li key={i} className="px-3 py-2 text-sm text-red-700 break-words">{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
