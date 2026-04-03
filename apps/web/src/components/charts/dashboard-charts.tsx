'use client';

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/components/theme-provider';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SparklinePoint {
  date:  string;
  value: number;
}

interface DashboardChartsProps {
  revenueData:  SparklinePoint[];
  expensesData: SparklinePoint[];
  netData:      SparklinePoint[];
}

function formatShortDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function DashboardCharts({
  revenueData,
  expensesData,
  netData,
}: DashboardChartsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const axisColor  = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor  = isDark ? '#374151' : '#E5E7EB';
  const bgColor    = isDark ? '#1F2937' : '#ffffff';
  const labelColor = isDark ? '#F9FAFB' : '#111827';

  // Merge revenue + expenses by index for grouped bar chart
  const barData = revenueData.map((r, i) => ({
    date:     formatShortDate(r.date),
    Revenue:  r.value,
    Expenses: expensesData[i]?.value ?? 0,
  }));

  // Net income trend for line chart
  const lineData = netData.map((n) => ({
    date:        formatShortDate(n.date),
    'Net Income': n.value,
  }));

  const showBar  = barData.length >= 2;
  const showLine = lineData.length >= 2;

  if (!showBar && !showLine) return null;

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">

      {/* Revenue vs Expenses — grouped bar */}
      {showBar && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: axisColor, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                    }
                  />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                    contentStyle={{
                      backgroundColor: bgColor,
                      border: `1px solid ${gridColor}`,
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    labelStyle={{ color: labelColor, fontWeight: 600 }}
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="Revenue"
                    fill="#0F6E56"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                    fillOpacity={isDark ? 0.85 : 1}
                  />
                  <Bar
                    dataKey="Expenses"
                    fill="#EF4444"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                    fillOpacity={isDark ? 0.85 : 1}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Net Income Trend — line chart */}
      {showLine && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Income Trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: axisColor, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                    }
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Net Income']}
                    contentStyle={{
                      backgroundColor: bgColor,
                      border: `1px solid ${gridColor}`,
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    labelStyle={{ color: labelColor, fontWeight: 600 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Net Income"
                    stroke="#0F6E56"
                    strokeWidth={2}
                    dot={{ fill: '#0F6E56', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
