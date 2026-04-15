import { apiGet } from '@/lib/api';
import { UpcomingRemindersResult } from '@/types';
import { UpcomingRemindersWidget } from '@/components/upcoming-reminders-widget';

async function getUpcomingReminders(): Promise<UpcomingRemindersResult | null> {
  try { return await apiGet<UpcomingRemindersResult>('/personal/upcoming-reminders'); } catch { return null; }
}

export default async function RemindersPage() {
  const data = await getUpcomingReminders();
  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Upcoming Payments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Payments due in the next 30 days based on your confirmed recurring subscriptions and bills.
        </p>
      </div>
      <UpcomingRemindersWidget data={data} compact={false} />
    </div>
  );
}
