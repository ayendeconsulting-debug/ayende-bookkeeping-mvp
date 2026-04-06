import { getStaff } from './actions';
import { TeamManager } from '@/components/team-manager';

export default async function TeamPage() {
  const staff = await getStaff();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage staff members who can access your firm portal.
        </p>
      </div>
      <TeamManager staff={staff} />
    </div>
  );
}
