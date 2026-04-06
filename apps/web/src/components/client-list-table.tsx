'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { archiveClient, ClientListItem } from '@/app/(accountant)/clients/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BookOpen, UserPlus, Archive, ExternalLink } from 'lucide-react';

interface ClientListTableProps {
  clients: ClientListItem[];
}

export function ClientListTable({ clients }: ClientListTableProps) {
  const router = useRouter();
  const [archiving, setArchiving] = useState<string | null>(null);

  async function handleArchive(firmClientId: string) {
    setArchiving(firmClientId);
    await archiveClient(firmClientId);
    setArchiving(null);
    router.refresh();
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg bg-muted/20">
        <BookOpen className="w-10 h-10 text-muted-foreground mb-4" />
        <h3 className="text-base font-semibold text-foreground mb-1">No clients yet</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Add your first client to get started with the firm portal.
        </p>
        <Button asChild>
          <Link href="/accountant/clients/new">
            <UserPlus className="w-4 h-4 mr-2" />
            Add your first client
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business Name</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Province</TableHead>
            <TableHead>HST Status</TableHead>
            <TableHead>Added</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.firmClientId} className="group">
              {/* Business name */}
              <TableCell className="font-medium text-foreground">
                {client.businessName}
              </TableCell>

              {/* Country */}
              <TableCell className="text-muted-foreground text-sm">
                {client.country === 'CA' ? '🇨🇦 Canada' : '🇺🇸 United States'}
              </TableCell>

              {/* Province */}
              <TableCell className="text-muted-foreground text-sm">
                {client.province_code ?? '—'}
              </TableCell>

              {/* HST status — CA only */}
              <TableCell>
                {client.country === 'CA' ? (
                  client.hst_registration_number ? (
                    <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800 text-xs">
                      Registered
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800 text-xs">
                      No HST #
                    </Badge>
                  )
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>

              {/* Added date */}
              <TableCell className="text-muted-foreground text-sm">
                {new Date(client.added_at).toLocaleDateString('en-CA', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </TableCell>

              {/* Status badge */}
              <TableCell>
                {client.status === 'active' ? (
                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800 text-xs">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-xs">
                    Archived
                  </Badge>
                )}
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {client.status === 'active' && (
                    <>
                      <Button asChild size="sm" variant="default">
                        <Link href={`/accountant/clients/${client.businessId}/dashboard`}>
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                          Open Books
                        </Link>
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={archiving === client.firmClientId}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive {client.businessName}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the client from your active list. Their data will be retained and can be restored by contacting support.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleArchive(client.firmClientId)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Archive
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
