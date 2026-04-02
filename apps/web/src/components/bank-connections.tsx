'use client';

import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import {
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
} from 'lucide-react';
import { PlaidItem, PlaidAccount } from '@/types';
import { createLinkToken, exchangeToken, disconnectBank } from '@/app/(app)/banks/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/utils';

interface BankConnectionsProps {
  initialBanks: PlaidItem[];
  accountsByItem: Record<string, PlaidAccount[]>;
}

/* ── Plaid Link wrapper ──────────────────────────────────────────────────── */

function PlaidLinkButton({ onSuccess }: { onSuccess: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
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
        onSuccess();
      } else {
        setTokenError(result.error ?? 'Failed to connect bank.');
      }
    },
    onExit: () => {
      // User closed Plaid Link — reset token so next click fetches a fresh one
      setLinkToken(null);
    },
  });

  async function handleClick() {
    if (linkToken && ready) {
      open();
      return;
    }

    setLoadingToken(true);
    setTokenError(null);

    const result = await createLinkToken();
    setLoadingToken(false);

    if (!result.success || !result.link_token) {
      setTokenError(result.error ?? 'Failed to initialize Plaid Link.');
      return;
    }

    setLinkToken(result.link_token);
    // usePlaidLink will become ready shortly after token is set — open on next render
  }

  // Auto-open once ready after token is set
  const stableOpen = useCallback(() => {
    if (ready && linkToken) open();
  }, [ready, linkToken, open]);

  // Trigger open when ready flips to true
  useState(() => {
    if (ready && linkToken) stableOpen();
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleClick}
        disabled={loadingToken || exchanging}
        className="flex items-center gap-2"
      >
        {loadingToken || exchanging ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        {exchanging ? 'Connecting…' : loadingToken ? 'Initializing…' : 'Connect Bank'}
      </Button>
      {tokenError && (
        <p className="text-xs text-red-500">{tokenError}</p>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function BankConnections({ initialBanks, accountsByItem }: BankConnectionsProps) {
  const [banks, setBanks] = useState<PlaidItem[]>(initialBanks);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  function handleConnectSuccess() {
    // Refresh the page to show the new bank
    window.location.reload();
  }

  async function handleDisconnect(itemId: string) {
    setDisconnecting(itemId);
    setDisconnectError(null);

    const result = await disconnectBank(itemId);

    if (result.success) {
      setBanks((prev) => prev.filter((b) => b.id !== itemId));
    } else {
      setDisconnectError(result.error ?? 'Failed to disconnect bank.');
    }

    setDisconnecting(null);
  }

  return (
    <div className="p-6 max-w-screen-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bank Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Connect your bank accounts to automatically import transactions
          </p>
        </div>
        <PlaidLinkButton onSuccess={handleConnectSuccess} />
      </div>

      {/* Error banner */}
      {disconnectError && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {disconnectError}
        </div>
      )}

      {/* Empty state */}
      {banks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Building2 className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">
              No banks connected yet
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">
              Connect your bank or credit card accounts to automatically import
              and classify transactions.
            </p>
            <PlaidLinkButton onSuccess={handleConnectSuccess} />
          </CardContent>
        </Card>
      )}

      {/* Bank list */}
      {banks.length > 0 && (
        <div className="flex flex-col gap-4">
          {banks.map((bank) => {
            const accounts = accountsByItem[bank.id] ?? [];
            const isDisconnecting = disconnecting === bank.id;

            return (
              <Card key={bank.id}>
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    {/* Bank logo placeholder */}
                    <div className="w-10 h-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-[#0F6E56] text-xs font-bold flex-shrink-0">
                      {bank.institution_name.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {bank.institution_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant={bank.status === 'active' ? 'classified' : 'destructive'}
                        >
                          {bank.status === 'active' ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Connected
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Error
                            </span>
                          )}
                        </Badge>
                        {bank.last_synced_at && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Synced{' '}
                            {new Date(bank.last_synced_at).toLocaleDateString('en-CA', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Disconnect button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDisconnecting}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                      >
                        {isDisconnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect {bank.institution_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will stop importing new transactions from this bank.
                          Existing transactions and journal entries will not be affected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDisconnect(bank.id)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardHeader>

                {/* Accounts list */}
                {accounts.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                        Accounts
                      </p>
                      <div className="flex flex-col gap-2">
                        {accounts.map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center justify-between py-1.5"
                          >
                            <div className="flex items-center gap-2.5">
                              <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-gray-800">
                                  {account.name}
                                </div>
                                <div className="text-xs text-gray-400 capitalize">
                                  {account.type}
                                  {account.subtype ? ` · ${account.subtype}` : ''}
                                  {' · '}
                                  {account.currency_code}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              {account.current_balance != null && (
                                <div className="text-sm font-medium text-gray-900">
                                  {formatCurrency(account.current_balance)}
                                </div>
                              )}
                              {account.available_balance != null && (
                                <div className="text-xs text-gray-400">
                                  {formatCurrency(account.available_balance)} available
                                </div>
                              )}
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

      {/* Plaid disclaimer */}
      <p className="text-xs text-gray-400 text-center mt-6">
        Bank connections are powered by Plaid. Ayende never stores your banking credentials.
      </p>
    </div>
  );
}
