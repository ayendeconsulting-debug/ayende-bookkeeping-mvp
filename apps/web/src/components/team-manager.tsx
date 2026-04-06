'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inviteStaff, removeStaff, StaffMember } from '@/app/(accountant)/accountant/team/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { UserPlus, Trash2, Loader2, Users } from 'lucide-react';

interface TeamManagerProps {
  staff: StaffMember[];
}

export function TeamManager({ staff }: TeamManagerProps) {
  const router = useRouter();
  const [email, setEmail]           = useState('');
  const [firstName, setFirstName]   = useState('');
  const [inviting, setInviting]     = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [removing, setRemoving]     = useState<string | null>(null);

  async function handleInvite() {
    if (!email.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    const result = await inviteStaff({ email: email.trim(), firstName: firstName.trim() || undefined });
    setInviting(false);
    if (!result.success) {
      setInviteError(result.error ?? 'Failed to send invite.');
      return;
    }
    setEmail('');
    setFirstName('');
    setInviteSuccess(true);
    router.refresh();
    setTimeout(() => setInviteSuccess(false), 3000);
  }

  async function handleRemove(staffRowId: string) {
    setRemoving(staffRowId);
    await removeStaff(staffRowId);
    setRemoving(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Staff list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff Members ({staff.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-6">
              <Users className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No staff members yet. Invite your first team member below.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="text-sm font-medium">
                      {member.invited_email ?? member.clerk_user_id}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          member.role === 'firm_owner'
                            ? 'text-primary border-primary/30 bg-primary/5 text-xs'
                            : 'text-muted-foreground text-xs'
                        }
                      >
                        {member.role === 'firm_owner' ? 'Owner' : 'Staff'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.accepted_at ? (
                        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800 text-xs">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.invited_at).toLocaleDateString('en-CA', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.role !== 'firm_owner' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              disabled={removing === member.id}
                            >
                              {removing === member.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove staff member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {member.invited_email ?? member.clerk_user_id} will lose access to the firm portal immediately.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemove(member.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Invite Staff Member
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteFirst">First Name <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="inviteFirst"
                placeholder="e.g. Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
          </div>

          {inviteError && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 px-3 py-2 rounded-md">
              Invite sent successfully.
            </p>
          )}

          <Button onClick={handleInvite} disabled={inviting || !email.trim()}>
            {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Send Invite
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
