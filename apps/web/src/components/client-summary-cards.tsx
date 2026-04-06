import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp, TrendingDown, DollarSign, Clock,
  Receipt, Calendar,
} from 'lucide-react';

interface ClientOverview {
  businessId: string;
  businessName: string;
  revenueMtd: number;
  expensesMtd: number;
  netIncomeMtd: number;
  uncategorisedCount: number;
  outstandingHst: number;
  lastTransactionDate: string | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
  }).format(amount);
}

interface SummaryCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  accentClass?: string;
  valueColor?: string;
}

function SummaryCard({
  label, value, sub, icon: Icon, iconColor, iconBg, accentClass, valueColor,
}: SummaryCardProps) {
  return (
    <Card className={accentClass}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </div>
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        </div>
        <div className={`text-2xl font-semibold mb-1 tracking-tight ${valueColor ?? 'text-foreground'}`}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

export function ClientSummaryCards({ overview }: { overview: ClientOverview }) {
  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      <SummaryCard
        label="Revenue (MTD)"
        value={formatCurrency(overview.revenueMtd)}
        sub={monthLabel}
        icon={TrendingUp}
        iconColor="text-primary"
        iconBg="bg-primary/10"
        accentClass="border-t-2 border-t-[#0F6E56]"
      />
      <SummaryCard
        label="Expenses (MTD)"
        value={formatCurrency(overview.expensesMtd)}
        sub={monthLabel}
        icon={TrendingDown}
        iconColor="text-destructive"
        iconBg="bg-destructive/10"
        accentClass="border-t-2 border-t-destructive"
      />
      <SummaryCard
        label="Net Income (MTD)"
        value={formatCurrency(overview.netIncomeMtd)}
        sub={overview.netIncomeMtd >= 0 ? 'Profitable' : 'Loss'}
        icon={DollarSign}
        iconColor={overview.netIncomeMtd >= 0 ? 'text-primary' : 'text-destructive'}
        iconBg={overview.netIncomeMtd >= 0 ? 'bg-primary/10' : 'bg-destructive/10'}
        accentClass="border-t-2 border-t-[#185fa5]"
        valueColor={overview.netIncomeMtd >= 0 ? 'text-primary' : 'text-destructive'}
      />
      <SummaryCard
        label="Uncategorised"
        value={overview.uncategorisedCount.toString()}
        sub={overview.uncategorisedCount > 0 ? 'Needs classification' : 'All clear'}
        icon={Clock}
        iconColor="text-amber-600"
        iconBg="bg-amber-50 dark:bg-amber-950"
        accentClass="border-t-2 border-t-amber-500"
        valueColor={overview.uncategorisedCount > 0 ? 'text-amber-600 dark:text-amber-400' : undefined}
      />
      <SummaryCard
        label="Outstanding HST"
        value={formatCurrency(overview.outstandingHst)}
        sub="Net HST payable"
        icon={Receipt}
        iconColor="text-blue-600"
        iconBg="bg-blue-50 dark:bg-blue-950"
        accentClass="border-t-2 border-t-blue-500"
      />
      <SummaryCard
        label="Last Transaction"
        value={
          overview.lastTransactionDate
            ? new Date(overview.lastTransactionDate).toLocaleDateString('en-CA', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'No data'
        }
        sub="Most recent activity"
        icon={Calendar}
        iconColor="text-muted-foreground"
        iconBg="bg-muted"
        accentClass="border-t-2 border-t-border"
      />
    </div>
  );
}
