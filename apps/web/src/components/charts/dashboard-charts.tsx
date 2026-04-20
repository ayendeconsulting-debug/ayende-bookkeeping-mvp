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
    return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function DashboardCharts({ revenueData, expensesData, netData }: DashboardChartsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Dark Executive palette
  const axisColor  = '#888780';
  const gridColor  = isDark ? '#2E2E2B' : '#E8E6E1';
  const bgColor    = isDark ? '#1E1E1C' : '#FFFFFF';
  const labelColor = isDark ? '#F1EFE8' : '#2C2C2A';
  const revColor   = isDark ? '#5DCAA5' : '#1D9E75';
  const expColor   = isDark ? '#F0997B' : '#D85A30';
  const netColor   = isDark ? '#AFA9EC' : '#534AB7';

  const barData = revenueData.map((r, i) => ({
    date:     formatShortDate(r.date),
    Revenue:  r.value,
    Expenses: expensesData[i]?.value ?? 0,
  }));

  const lineData = netData.map((n) => ({
    date:        formatShortDate(n.date),
    'Net Income': n.value,
  }));

  const showBar  = barData.length >= 2;
  const showLine = lineData.length >= 2;

  if (!showBar && !showLine) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

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
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                    contentStyle={{ backgroundColor: bgColor, border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 11, color: labelColor }}
                    labelStyle={{ color: labelColor, fontWeight: 600 }}
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
                  <Bar dataKey="Revenue"  fill={revColor} radius={[3, 3, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="Expenses" fill={expColor} radius={[3, 3, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Net Income']}
                    contentStyle={{ backgroundColor: bgColor, border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 11, color: labelColor }}
                    labelStyle={{ color: labelColor, fontWeight: 600 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Net Income"
                    stroke={netColor}
                    strokeWidth={2}
                    dot={{ fill: netColor, r: 3 }}
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
