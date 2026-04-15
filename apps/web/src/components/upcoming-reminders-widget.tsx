'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { UpcomingRemindersResult, UpcomingReminder } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { snoozeReminder, dismissReminder } from '@/app/(app)/personal/reminders/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import {
  AlertTriangle, Bell, BellOff, Calendar, X,
  Clock, RefreshCw,
} from 'lucide-react';

interface UpcomingRemindersWidgetProps {
  data: UpcomingRemindersResult | null;
  compact?: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  subscription: '📱',
  housing: '🏠',
  utilities: '⚡',
  insurance: '🛡️',
  fitness: '💪',
  recurring: '🔄',
};

export function UpcomingRemindersWidget({ data, compact = false }: UpcomingRemindersWidgetProps) {
  const [reminders, setReminders] = useState<UpcomingReminder[]>(data?.reminders ?? []);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );
  const [snoozeOpenKey, setSnoozeOpenKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const next7  = reminders.filter((r) => r.days_until <= 7);
  const next30 = reminders.filter((r) => r.days_until > 7);

  function removeReminder(key: string, due_date: string) {
    setReminders((prev) => prev.filter((r) => !(r.key === key && r.due_date === due_date)));
  }

  function handleSnooze(reminder: UpcomingReminder, days: number) {
    const snoozed_until = new Date();
    snoozed_until.setDate(snoozed_until.getDate() + days);
    const snoozedUntilStr = snoozed_until.toISOString().split('T')[0];

    startTransition(async () => {
      const result = await snoozeReminder(reminder.key, reminder.due_date, snoozedUntilStr);
      if (result.success) {
        removeReminder(reminder.key, reminder.due_date);
        setSnoozeOpenKey(null);
        toastSuccess(`"${reminder.merchant}" snoozed for ${days} days.`);
      } else {
        toastError(result.error ?? 'Failed to snooze.');
      }
    });
  }

  function handleDismiss(reminder: UpcomingReminder) {
    startTransition(async () => {
      const result = await dismissReminder(reminder.key, reminder.due_date);
      if (result.success) {
        removeReminder(reminder.key, reminder.due_date);
        toastSuccess(`"${reminder.merchant}" dismissed.`);
      } else {
        toastError(result.error ?? 'Failed to dismiss.');
      }
    });
  }

  async function handleEnableNotifications() {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
    if (permission === 'granted') {
      const dueSoon = reminders.filter((r) => r.days_until <= 3);
      for (const reminder of dueSoon) {
        new Notification(
          `Payment due in ${reminder.days_until === 0 ? 'today' : `${reminder.days_until} day${reminder.days_until > 1 ? 's' : ''}`}`,
          {
            body: `${reminder.merchant} — ${formatCurrency(reminder.amount)}`,
            tag: `${reminder.key}-${reminder.due_date}`,
          },
        );
      }
      toastSuccess('Notifications enabled. You\'ll be reminded of upcoming payments.');
    }
  }

  // Compact dashboard mode
  if (compact) {
    const upcomingCount = reminders.length;
    if (upcomingCount === 0) {
      return (
        <div className="py-4 text-center text-sm text-muted-foreground">
          <Link href="/personal/reminders" className="text-primary underline">
            Set up recurring payments to get reminders
          </Link>
        </div>
      );
    }
    return (
      <div>
        {data?.balance_warning && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              Balance may be insufficient for upcoming payments
            </p>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          {reminders.slice(0, 4).map((r) => (
            <div key={`${r.key}-${r.due_date}`} className="flex items-center justify-between text-xs">
              <span className={cn('truncate', r.is_due_soon ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
                {TYPE_ICONS[r.type] ?? '🔄'} {r.merchant}
              </span>
              <span className="ml-2 flex-shrink-0 text-muted-foreground">
                {r.days_until === 0 ? 'Today' : `${r.days_until}d`} · {formatCurrency(r.amount)}
              </span>
            </div>
          ))}
          {reminders.length > 4 && (
            <Link href="/personal/reminders" className="text-xs text-muted-foreground hover:text-primary mt-1">
              +{reminders.length - 4} more →
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Full page mode
  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No upcoming reminders. Confirm recurring payments on the{' '}
            <Link href="/personal/recurring" className="text-primary underline">Recurring Payments</Link>{' '}
            page first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary + notifications */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Due Next 7 Days</div>
            <div className={cn('text-2xl font-semibold', data.balance_warning ? 'text-red-500' : 'text-foreground')}>
              {formatCurrency(data.total_due_7_days)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{next7.length} payment{next7.length !== 1 ? 's' : ''}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Due Next 30 Days</div>
            <div className="text-2xl font-semibold text-foreground">{formatCurrency(data.total_due_30_days)}</div>
            <div className="text-xs text-muted-foreground mt-1">{reminders.length} payment{reminders.length !== 1 ? 's' : ''}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {notifStatus === 'granted' ? 'Notifications On' : 'Notifications'}
            </div>
            {notifStatus === 'unsupported' ? (
              <p className="text-xs text-muted-foreground">Not supported in this browser</p>
            ) : notifStatus === 'granted' ? (
              <div className="flex items-center gap-2 text-primary">
                <Bell className="w-5 h-5" />
                <span className="text-sm font-medium">Enabled</span>
              </div>
            ) : notifStatus === 'denied' ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <BellOff className="w-5 h-5" />
                <span className="text-xs">Blocked in browser settings</span>
              </div>
            ) : (
              <Button size="sm" onClick={handleEnableNotifications} className="mt-1 h-8 text-xs">
                <Bell className="w-3.5 h-3.5 mr-1.5" />
                Enable Reminders
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Balance warning */}
      {data.balance_warning && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Insufficient balance warning</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Your connected accounts have {formatCurrency(data.current_balance)}, but{' '}
              {formatCurrency(data.total_due_7_days)} is due in the next 7 days — a shortfall of{' '}
              {formatCurrency(data.balance_shortfall)}.
            </p>
          </div>
        </div>
      )}

      {reminders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No upcoming payments in the next 30 days</p>
            <p className="text-xs text-muted-foreground">All confirmed recurring payments have been accounted for.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {next7.length > 0 && (
            <ReminderSection
              title="Next 7 Days"
              reminders={next7}
              isPending={isPending}
              snoozeOpenKey={snoozeOpenKey}
              onSnoozeOpen={setSnoozeOpenKey}
              onSnooze={handleSnooze}
              onDismiss={handleDismiss}
              urgent
            />
          )}
          {next30.length > 0 && (
            <ReminderSection
              title="Next 8–30 Days"
              reminders={next30}
              isPending={isPending}
              snoozeOpenKey={snoozeOpenKey}
              onSnoozeOpen={setSnoozeOpenKey}
              onSnooze={handleSnooze}
              onDismiss={handleDismiss}
            />
          )}
        </>
      )}
    </div>
  );
}

function ReminderSection({
  title, reminders, isPending, snoozeOpenKey, onSnoozeOpen, onSnooze, onDismiss, urgent,
}: {
  title: string;
  reminders: UpcomingReminder[];
  isPending: boolean;
  snoozeOpenKey: string | null;
  onSnoozeOpen: (key: string | null) => void;
  onSnooze: (reminder: UpcomingReminder, days: number) => void;
  onDismiss: (reminder: UpcomingReminder) => void;
  urgent?: boolean;
}) {
  return (
    <div>
      <h2 className={cn('text-sm font-semibold mb-3', urgent ? 'text-amber-600' : 'text-foreground')}>
        {urgent && <Clock className="inline w-4 h-4 mr-1.5 text-amber-500" />}
        {title}
      </h2>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {reminders.map((r) => {
              const compositeKey = `${r.key}::${r.due_date}`;
              const isSnoozeOpen = snoozeOpenKey === compositeKey;
              const dueLabel = r.days_until === 0 ? 'Today'
                : r.days_until === 1 ? 'Tomorrow'
                : `In ${r.days_until} days`;

              return (
                <div key={compositeKey} className={cn('px-4 py-3 group', r.is_due_soon ? 'bg-amber-500/10' : '')}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-base flex-shrink-0">
                      {TYPE_ICONS[r.type] ?? '🔄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.merchant}</p>
                      <p className={cn('text-xs', r.is_due_soon ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
                        {dueLabel} · {new Date(r.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(r.amount)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{r.frequency}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <div className="relative">
                        <button
                          onClick={() => onSnoozeOpen(isSnoozeOpen ? null : compositeKey)}
                          disabled={isPending}
                          className="p-1.5 text-muted-foreground hover:text-amber-500 transition-colors rounded"
                          title="Snooze"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        {isSnoozeOpen && (
                          <div className="absolute right-0 top-8 z-10 bg-card border border-border rounded-lg shadow-lg p-1 min-w-[120px]">
                            <button
                              onClick={() => onSnooze(r, 3)}
                              className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted rounded"
                            >
                              Snooze 3 days
                            </button>
                            <button
                              onClick={() => onSnooze(r, 7)}
                              className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted rounded"
                            >
                              Snooze 1 week
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => onDismiss(r)}
                        disabled={isPending}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                        title="Dismiss this occurrence"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
