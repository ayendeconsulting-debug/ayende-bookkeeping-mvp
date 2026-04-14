import { apiGet } from '@/lib/api';
import { VehicleManager } from '@/components/vehicle-manager';
import { FinancedVehicle } from '@/app/(app)/personal/vehicles/actions';

async function getVehicles(): Promise<FinancedVehicle[]> {
  try {
    return await apiGet<FinancedVehicle[]>('/vehicles');
  } catch {
    return [];
  }
}

export default async function FreelancerVehiclesPage() {
  const vehicles = await getVehicles();
  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Financed Vehicles</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Track loan payments, interest expense, and business-use allocation for your vehicle.
        </p>
      </div>
      <VehicleManager initialVehicles={vehicles} />
    </div>
  );
}
