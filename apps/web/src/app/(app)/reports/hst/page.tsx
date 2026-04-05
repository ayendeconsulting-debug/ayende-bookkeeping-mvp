import { getHstPeriods } from './actions';
import { HstReportClient } from '@/components/hst-report-client';

export default async function HstReportPage() {
  const { data: periods = [], error } = await getHstPeriods();

  return <HstReportClient initialPeriods={periods} initialError={error} />;
}
