'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useTheme } from '@/components/theme-provider';
import { formatCurrency } from '@/lib/utils';

interface IncomeStatementChartProps {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export function IncomeStatementChart({
  totalRevenue,
  totalExpenses,
  netIncome,
}: IncomeStatementChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const data = [
    { name: 'Revenue',    value: Math.abs(totalRevenue),  color: '#0F6E56' },
    { name: 'Expenses',   value: Math.abs(totalExpenses), color: '#EF4444' },
    { name: 'Net Income', value: Math.abs(netIncome),     color: netIncome >= 0 ? '#0F6E56' : '#EF4444' },
  ];

  const axisColor  = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor  = isDark ? '#374151' : '#E5E7EB';
  const bgColor    = isDark ? '#1F2937' : '#ffffff';
  const labelColor = isDark ? '#F9FAFB' : '#111827';

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: axisColor, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: axisColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
            }
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), '']}
            contentStyle={{
              backgroundColor: bgColor,
              border: `1px solid ${gridColor}`,
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: labelColor, fontWeight: 600 }}
            cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={80}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.color}
                fillOpacity={isDark ? 0.85 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
