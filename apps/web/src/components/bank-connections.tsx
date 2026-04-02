'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePlaidLink } from 'react-plaid-link';
import {
  Building2, Plus, Trash2, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, CreditCard,
} from 'lucide-react';
import { PlaidItem, PlaidAccount } from '@/types';
import { createLinkToken, exchangeToken, disconnectBank } from '@/app/(app)/banks/actions';
import { AdminOnly } from '@/components/admin-only';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/utils';

interface BankConnectionsProps {
  initialBanks: PlaidItem[];
  accountsByItem: Record<string, PlaidAccount[]>;
}

function PlaidLinkButton({ onSuccess }: { onSuccess: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: async (publicToken, metadata) => {
      setExchanging(true);
      const institution = metadata.institution;
      const result = await exchangeToken(
        publicToken,
        institution?.name ?? 'Unknown Bank',
        institution?.institution_id ?? '',
      );
      setExchanging(false);
      if (result.success) {
        toastSuccess('Bank connected', institution?.name ?? 'Your bank account is now linked.');
        onSuccess();
      } else {
        toastError('Failed to connect bank', result.error ?? 'Please try again.');
      }
    },
    onExit: () => { setLinkToken(null); },
  });

  async function handleClick() {
    if (linkToken && ready) { open(); return; }
    setLoadingToken(true);
    const result = await createLinkToken();
    setLoadingToken(false);
    if (!result.success || !result.link_token) {
      toastError('Failed to initialize Plaid Link', result.error ?? 'Please try again.');
      return;
    }
    setLinkToken(result.link_token);
  }

  const stableOpen = useCallback(() => { if (ready && linkToken) open(); }, [ready, linkToken, open]);
  useState(() => { if (ready && linkToken) stableOpen(); });

  return (
    <Button onClick={handleClick} disabled={loadingToken || exchanging} className="flex items-center gap-2">
      {loadingToken || exchanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      {exchanging ? 'Connecting…' : loadingToken ? 'Initializing…' : 'Connect Bank'}
    </Button>
  );
}

export function BankConnections({ initialBanks, accountsByItem }: BankConnectionsProps) {
  const router = useRouter();
  const [banks, setBanks] = useState<PlaidItem[]>(initialBanks);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  function handleConnectSuccess() {
    router.refresh();
  }

  async function handleDisconnect(bank: PlaidItem) {
    setDisconnecting(bank.id);
    const result = await disconnectBank(bank.id);
    if (result.success) {
      setBanks((prev) => prev.filter((b) => b.id !== bank.id));
      toastSuccess('Bank disconnected', bank.institution_name);
    } else {
      toastError('Failed to disconnect bank', result.error ?? 'Please try again.');
    }
    setDisconnecting(null);
  }

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bank Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Connect your bank accounts to automatically import transactions</p>
        </div>
        <AdminOnly>
          <PlaidLinkButton onSuccess={handleConnectSuccess} />
        </AdminOnly>
      </div>

      {banks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Building2 className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">No banks connected yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">
              Connect your bank or credit card accounts to automatically import and classify transactions.
            </p>
            <AdminOnly fallback={<p className="text-sm text-gray-400">Contact your account owner to connect a bank.</p>}>
              <PlaidLinkButton onSuccess={handleConnectSuccess} />
            </AdminOnly>
          </CardContent>
        </Card>
      )}

      {banks.length > 0 && (
        <div className="flex flex-col gap-4">
          {banks.map((bank) => {
            const accounts = accountsByItem[bank.id] ?? [];
            const isDisconnecting = disconnecting === bank.id;
            return (
              <Card key={bank.id}>
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-[#0F6E56] text-xs font-bold flex-shrink-0">
                      {bank.institution_name.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base">{bank.institution_name}</CardTitle>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={bank.status === 'active' ? 'classified' : 'destructive'}>
                          {bank.status === 'active'
                            ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Connected</span>
                            : <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />Error</span>}
                        </Badge>
                        {bank.last_synced_at && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Synced {new Date(bank.last_synced_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <AdminOnly>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={isDisconnecting} className="text-gray-400 hover:text-red-500 hover:bg-red-50">
                          {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disconnect {bank.institution_name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will stop importing new transactions. Existing transactions and journal entries will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDisconnect(bank)} className="bg-red-500 hover:bg-red-600 text-white">
                            Disconnect
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </AdminOnly>
                </CardHeader>

                {accounts.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Accounts</p>
                      <div className="flex flex-col gap-2">
                        {accounts.map((account) => (
                          <div key={account.id} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2.5">
                              <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-gray-800">{account.name}</div>
                                <div className="text-xs text-gray-400 capitalize">
                                  {account.type}{account.subtype ? ` · ${account.subtype}` : ''} · {account.currency_code}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              {account.current_balance != null && <div className="text-sm font-medium text-gray-900">{formatCurrency(account.current_balance)}</div>}
                              {account.available_balance != null && <div className="text-xs text-gray-400">{formatCurrency(account.available_balance)} available</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-6">
        Bank connections are powered by Plaid. Ayende never stores your banking credentials.
      </p>
    </div>
  );
}
