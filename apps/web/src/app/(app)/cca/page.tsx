import { apiGet } from '@/lib/api';
import { CcaManager } from '@/components/cca-manager';

async function getCcaAssets() {
  try {
    return await apiGet('/cca/assets');
  } catch {
    return [];
  }
}

async function getCcaSchedule() {
  try {
    return await apiGet('/cca/schedule');
  } catch {
    return null;
  }
}

export default async function CcaPage() {
  const [assets, schedule] = await Promise.all([getCcaAssets(), getCcaSchedule()]);
  return <CcaManager initialAssets={assets} initialSchedule={schedule} />;
}
