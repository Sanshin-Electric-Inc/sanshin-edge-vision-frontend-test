// src/app/dashboard/analytics/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { alertHistoryApi } from '@/lib/api/alerts';
import type {
  AlertHistory,
  DailyAlertCount,
  PlaceAlertCount,
  SensorAlertCount,
  AnalyticsSummary,
} from '@/types/alerts';

// 期間選択のオプション
const PERIOD_OPTIONS = [
  { value: 7, label: '過去7日' },
  { value: 14, label: '過去14日' },
  { value: 30, label: '過去30日' },
  { value: 90, label: '過去90日' },
];

// グラフの色定義
const COLORS = {
  warning: '#f59e0b',
  critical: '#ef4444',
  info: '#3b82f6',
  primary: '#6366f1',
  secondary: '#8b5cf6',
};

const PIE_COLORS = ['#f59e0b', '#ef4444', '#3b82f6'];
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export default function AnalyticsPage() {
  const { userProfile } = useAuth();
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);

  // 日付範囲を計算
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };
  }, [period]);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.tenant_id) return;

      setLoading(true);
      setError(null);

      try {
        const response = await alertHistoryApi.list(userProfile.tenant_id, {
          start_date: dateRange.start,
          end_date: dateRange.end,
          limit: 1000,
        });
        setAlertHistory(response.data || []);
      } catch (err) {
        console.error('Failed to fetch alert history:', err);
        setError('アラート履歴の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile?.tenant_id, dateRange]);

  // サマリー計算
  const summary: AnalyticsSummary = useMemo(() => {
    return {
      totalAlerts: alertHistory.length,
      warningCount: alertHistory.filter((a) => a.alert_level === 'WARNING').length,
      criticalCount: alertHistory.filter((a) => a.alert_level === 'CRITICAL').length,
      emailSentCount: alertHistory.filter((a) => a.email_sent).length,
      emailFailedCount: alertHistory.filter((a) => !a.email_sent).length,
    };
  }, [alertHistory]);

  // 日別データ計算
  const dailyData: DailyAlertCount[] = useMemo(() => {
    const countMap = new Map<string, { count: number; warning: number; critical: number }>();

    // 期間内の全日付を初期化
    const current = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      countMap.set(dateStr, { count: 0, warning: 0, critical: 0 });
      current.setDate(current.getDate() + 1);
    }

    // アラートをカウント
    alertHistory.forEach((alert) => {
      const dateStr = alert.created_at.split('T')[0];
      const existing = countMap.get(dateStr);
      if (existing) {
        existing.count += 1;
        if (alert.alert_level === 'WARNING') existing.warning += 1;
        if (alert.alert_level === 'CRITICAL') existing.critical += 1;
      }
    });

    return Array.from(countMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [alertHistory, dateRange]);

  // 場所別データ計算
  const placeData: PlaceAlertCount[] = useMemo(() => {
    const countMap = new Map<string, PlaceAlertCount>();

    alertHistory.forEach((alert) => {
      const key = `${alert.area}-${alert.spot}`;
      const existing = countMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        countMap.set(key, {
          place_name: alert.place_name || `Area ${alert.area} - Spot ${alert.spot}`,
          area: alert.area,
          spot: alert.spot,
          count: 1,
        });
      }
    });

    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 上位10件
  }, [alertHistory]);

  // センサー別データ計算
  const sensorData: SensorAlertCount[] = useMemo(() => {
    const countMap = new Map<string, SensorAlertCount>();

    alertHistory.forEach((alert) => {
      const key = alert.sensor_code || 'unknown';
      const existing = countMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        countMap.set(key, {
          sensor_code: alert.sensor_code || 'unknown',
          sensor_code_name: alert.sensor_code_name || '不明',
          count: 1,
        });
      }
    });

    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 上位10件
  }, [alertHistory]);

  // アラートレベル別データ
  const levelData = useMemo(() => {
    return [
      { name: 'WARNING', value: summary.warningCount, color: COLORS.warning },
      { name: 'CRITICAL', value: summary.criticalCount, color: COLORS.critical },
    ].filter((d) => d.value > 0);
  }, [summary]);

  // 閾値タイプ別データ
  const thresholdTypeData = useMemo(() => {
    const upper = alertHistory.filter((a) => a.threshold_type === 'UPPER').length;
    const lower = alertHistory.filter((a) => a.threshold_type === 'LOWER').length;
    return [
      { name: '上限超過', value: upper },
      { name: '下限未満', value: lower },
    ].filter((d) => d.value > 0);
  }, [alertHistory]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">分析・レポート</h1>
          <p className="text-gray-600 mt-1">アラート履歴の分析ダッシュボード</p>
        </div>

        {/* 期間選択 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">期間:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">総アラート数</div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalAlerts}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">WARNING</div>
          <div className="text-2xl font-bold text-amber-500">{summary.warningCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">CRITICAL</div>
          <div className="text-2xl font-bold text-red-500">{summary.criticalCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">メール送信成功</div>
          <div className="text-2xl font-bold text-green-500">{summary.emailSentCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">メール送信失敗</div>
          <div className="text-2xl font-bold text-gray-500">{summary.emailFailedCount}</div>
        </div>
      </div>

      {/* 時系列グラフ */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">日別アラート件数</h2>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('ja-JP');
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="warning"
                name="WARNING"
                stroke={COLORS.warning}
                strokeWidth={2}
                dot={{ fill: COLORS.warning, strokeWidth: 2, r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="critical"
                name="CRITICAL"
                stroke={COLORS.critical}
                strokeWidth={2}
                dot={{ fill: COLORS.critical, strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-500 py-12">データがありません</div>
        )}
      </div>

      {/* 2段目: アラートレベル別 & 閾値タイプ別 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* アラートレベル別円グラフ */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">アラートレベル別分布</h2>
          {levelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={levelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={({ name, percent }: any) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {levelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-12">データがありません</div>
          )}
        </div>

        {/* 閾値タイプ別円グラフ */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">閾値タイプ別分布</h2>
          {thresholdTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={thresholdTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {thresholdTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-12">データがありません</div>
          )}
        </div>
      </div>

      {/* 3段目: 場所別 & センサー別 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 場所別アラート件数 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">場所別アラート件数（上位10件）</h2>
          {placeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={placeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="place_name"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip />
                <Bar dataKey="count" name="件数" fill={COLORS.primary}>
                  {placeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-12">データがありません</div>
          )}
        </div>

        {/* センサー別アラート件数 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">センサー別アラート件数（上位10件）</h2>
          {sensorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sensorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="sensor_code_name"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip />
                <Bar dataKey="count" name="件数" fill={COLORS.secondary}>
                  {sensorData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-12">データがありません</div>
          )}
        </div>
      </div>

      {/* データ件数の注記 */}
      <div className="text-sm text-gray-500 text-right">
        表示期間: {new Date(dateRange.start).toLocaleDateString('ja-JP')} 〜{' '}
        {new Date(dateRange.end).toLocaleDateString('ja-JP')} / 取得件数: {alertHistory.length}件
      </div>
    </div>
  );
}
