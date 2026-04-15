'use client';

import { useState, useTransition } from 'react';
import { MileageLog, MileageLogResult } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createMileageLog, deleteMileageLog } from '@/app/(app)/freelancer/mileage/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Plus, Trash2, Car } from 'lucide-react';

interface MileageLogManagerProps {
  initialData: MileageLogResult;
}

const EMPTY_FORM = {
  trip_date: new Date().toISOString().split('T')[0],
  start_location: '', end_location: '', purpose: '', distance_km: '',
};

export function MileageLogManager({ initialData }: MileageLogManagerProps) {
  const [logs, setLogs] = useState<MileageLog[]>(initialData.data);
  const [totals, setTotals] = useState({ total_distance: initialData.total_distance, total_deduction: initialData.total_deduction });
  const [unit] = useState(initialData.unit);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  function handleFormChange(field: string, value: string) { setForm((prev) => ({ ...prev, [field]: value })); }

  function handleAdd() {
    if (!form.trip_date || !form.start_location || !form.end_location || !form.purpose || !form.distance_km) {
      toastError('Please fill in all fields.'); return;
    }
    const distance = parseFloat(form.distance_km);
    if (isNaN(distance) || distance <= 0) { toastError('Distance must be a positive number.'); return; }

    startTransition(async () => {
      const result = await createMileageLog({
        trip_date: form.trip_date, start_location: form.start_location,
        end_location: form.end_location, purpose: form.purpose, distance_km: distance,
      });
      if (result.success && result.data) {
        setLogs((prev) => [result.data as MileageLog, ...prev]);
        const newLog = result.data as MileageLog;
        setTotals((prev) => ({
          total_distance: prev.total_distance + Number(newLog.distance_km),
          total_deduction: prev.total_deduction + Number(newLog.deduction_value),
        }));
        setForm(EMPTY_FORM); setShowForm(false);
        toastSuccess('Trip logged successfully.');
      } else {
        toastError(result.error ?? 'Failed to log trip.');
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteMileageLog(id);
      if (result.success) {
        const removed = logs.find((l) => l.id === id);
        setLogs((prev) => prev.filter((l) => l.id !== id));
        if (removed) {
          setTotals((prev) => ({
            total_distance: Math.max(0, prev.total_distance - Number(removed.distance_km)),
            total_deduction: Math.max(0, prev.total_deduction - Number(removed.deduction_value)),
          }));
        }
        toastSuccess('Trip deleted.');
      } else {
        toastError(result.error ?? 'Failed to delete trip.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* YTD summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">YTD Distance</div>
            <div className="text-2xl font-semibold text-foreground">{totals.total_distance.toFixed(1)} {unit}</div>
            <div className="text-xs text-muted-foreground mt-1">{new Date().getFullYear()} total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Deduction</div>
            <div className="text-2xl font-semibold text-primary">{formatCurrency(totals.total_deduction)}</div>
            <div className="text-xs text-muted-foreground mt-1">Estimated tax deduction</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Trips Logged</div>
            <div className="text-2xl font-semibold text-foreground">{logs.length}</div>
            <div className="text-xs text-muted-foreground mt-1">{unit === 'km' ? 'CRA 2025 rate applied' : 'IRS 2025 rate applied'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add trip form */}
      {showForm ? (
        <Card>
          <CardHeader className="pb-3"><CardTitle>Log a Trip</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Trip Date</Label>
                <Input type="date" value={form.trip_date} onChange={(e) => handleFormChange('trip_date', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Distance ({unit})</Label>
                <Input type="number" min="0.1" step="0.1" placeholder="e.g. 45.5"
                  value={form.distance_km} onChange={(e) => handleFormChange('distance_km', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Start Location</Label>
                <Input placeholder="e.g. Home" value={form.start_location}
                  onChange={(e) => handleFormChange('start_location', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>End Location</Label>
                <Input placeholder="e.g. Client Office" value={form.end_location}
                  onChange={(e) => handleFormChange('end_location', e.target.value)} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Business Purpose</Label>
                <Input placeholder="e.g. Client meeting – Acme Corp" value={form.purpose}
                  onChange={(e) => handleFormChange('purpose', e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd} disabled={isPending}>{isPending ? 'Saving…' : 'Save Trip'}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />Log Trip
          </Button>
        </div>
      )}

      {/* Log table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Car className="w-4 h-4 text-muted-foreground" />
            Trip Log — {new Date().getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No trips logged yet. Click "Log Trip" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Deduction</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(log.trip_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">
                        {log.start_location}
                        <span className="text-muted-foreground mx-1">→</span>
                        {log.end_location}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="text-sm text-muted-foreground truncate block">{log.purpose}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm">{Number(log.distance_km).toFixed(1)} {unit}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">${Number(log.rate_per_km).toFixed(2)}/{unit}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-primary">{formatCurrency(Number(log.deduction_value))}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the trip from your mileage log and reduce your YTD deduction. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(log.id)}
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
