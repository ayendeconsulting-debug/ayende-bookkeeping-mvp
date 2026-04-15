'use client';

import { useState, useTransition, useEffect } from 'react';
import { Car, Plus, ChevronRight, X, CheckCircle2, Loader2, TrendingDown, Percent, Calendar, CreditCard, BarChart3 } from 'lucide-react';
import {
  FinancedVehicle, VehiclePayment, AmortizationRow,
  createVehicle, updateVehicle, recordPayment, allocateUsage,
  getVehicle, getAmortizationSchedule,
} from '@/app/(app)/personal/vehicles/actions';
import { toastSuccess, toastError } from '@/lib/toast';

function fmt(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
}

function AddVehicleModal({ onClose, onCreated }: { onClose: () => void; onCreated: (v: FinancedVehicle) => void }) {
  const [isPending, start] = useTransition();
  const [form, setForm] = useState({
    name: '',
    purchase_price: '',
    down_payment: '0',
    interest_rate: '',
    monthly_payment: '',
    loan_start_date: new Date().toISOString().split('T')[0],
    business_use_pct: '50',
  });
  const [error, setError] = useState<string | null>(null);

  const loanAmount = Math.max(0, Number(form.purchase_price) - Number(form.down_payment));

  function handleSubmit() {
    setError(null);
    if (!form.name.trim())            { setError('Vehicle name is required.'); return; }
    if (!Number(form.purchase_price)) { setError('Purchase price is required.'); return; }
    if (!Number(form.monthly_payment)){ setError('Monthly payment is required.'); return; }
    if (!form.loan_start_date)        { setError('Loan start date is required.'); return; }

    start(async () => {
      const result = await createVehicle({
        name:             form.name.trim(),
        purchase_price:   Number(form.purchase_price),
        down_payment:     Number(form.down_payment),
        interest_rate:    Number(form.interest_rate) / 100,
        monthly_payment:  Number(form.monthly_payment),
        loan_start_date:  form.loan_start_date,
        business_use_pct: Number(form.business_use_pct),
      });
      if (result.error) { setError(result.error); toastError('Failed to create vehicle', result.error); return; }
      toastSuccess('Vehicle added', `${form.name} has been set up with opening journal entries.`);
      onCreated(result.data!);
    });
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const inputClass = 'w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Add Financed Vehicle</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Vehicle Details</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Vehicle Name *</label>
                <input value={form.name} onChange={f('name')} placeholder="e.g. 2022 Honda CR-V" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Purchase Price *</label>
                  <input type="number" value={form.purchase_price} onChange={f('purchase_price')} placeholder="35000" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Down Payment</label>
                  <input type="number" value={form.down_payment} onChange={f('down_payment')} placeholder="0" className={inputClass} />
                </div>
              </div>
              {loanAmount > 0 && (
                <div className="rounded-lg bg-primary-light dark:bg-primary/10 px-3 py-2 text-sm text-primary font-medium">
                  Loan amount: {fmt(loanAmount)}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Loan Details</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Interest Rate (% annual)</label>
                  <input type="number" step="0.01" value={form.interest_rate} onChange={f('interest_rate')} placeholder="6.99" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Monthly Payment *</label>
                  <input type="number" value={form.monthly_payment} onChange={f('monthly_payment')} placeholder="650" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Loan Start Date *</label>
                <input type="date" value={form.loan_start_date} onChange={f('loan_start_date')} className={inputClass} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Business Use</p>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-foreground">Business use percentage</label>
                <span className="text-sm font-bold text-primary">{form.business_use_pct}%</span>
              </div>
              <input type="range" min="0" max="100" value={form.business_use_pct}
                onChange={f('business_use_pct')}
                className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0% (personal only)</span>
                <span>100% (business only)</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-primary-light dark:bg-primary/10 px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Business</p>
                  <p className="text-sm font-semibold text-primary">{form.business_use_pct}%</p>
                </div>
                <div className="rounded-lg bg-muted px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Personal</p>
                  <p className="text-sm font-semibold text-foreground">{100 - Number(form.business_use_pct)}%</p>
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} disabled={isPending}
            className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50">
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Add Vehicle
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordPaymentModal({
  vehicle, onClose, onRecorded,
}: {
  vehicle: FinancedVehicle;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const monthlyRate   = vehicle.interest_rate / 12;
  const autoInterest  = parseFloat((vehicle.remaining_balance * monthlyRate).toFixed(2));
  const autoPrincipal = parseFloat((vehicle.monthly_payment - autoInterest).toFixed(2));

  const [form, setForm] = useState({
    payment_date:     today,
    total_payment:    vehicle.monthly_payment.toString(),
    principal_amount: Math.max(0, autoPrincipal).toString(),
    interest_amount:  autoInterest.toString(),
  });

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const inputClass = 'w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary';

  function handleSubmit() {
    setError(null);
    const total     = Number(form.total_payment);
    const principal = Number(form.principal_amount);
    const interest  = Number(form.interest_amount);
    if (Math.abs(total - (principal + interest)) > 0.02) {
      setError(`Principal (${fmt(principal)}) + Interest (${fmt(interest)}) must equal Total (${fmt(total)})`);
      return;
    }
    start(async () => {
      const result = await recordPayment(vehicle.id, {
        payment_date:     form.payment_date,
        total_payment:    total,
        principal_amount: principal,
        interest_amount:  interest,
      });
      if (result.error) { setError(result.error); toastError('Payment failed', result.error); return; }
      toastSuccess('Payment recorded', `Remaining balance: ${fmt(result.data!.balance_after)}`);
      onRecorded();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Record Payment</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-lg bg-muted px-4 py-3 text-sm">
            <p className="text-muted-foreground">Vehicle</p>
            <p className="font-medium text-foreground">{vehicle.name}</p>
            <p className="text-xs text-muted-foreground mt-1">Remaining balance: <span className="font-semibold text-foreground">{fmt(vehicle.remaining_balance)}</span></p>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Payment Date</label>
            <input type="date" value={form.payment_date} onChange={f('payment_date')} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Total Payment</label>
            <input type="number" value={form.total_payment} onChange={f('total_payment')} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Principal</label>
              <input type="number" value={form.principal_amount} onChange={f('principal_amount')} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Interest</label>
              <input type="number" value={form.interest_amount} onChange={f('interest_amount')} className={inputClass} />
            </div>
          </div>
          <div className="rounded-lg bg-primary-light dark:bg-primary/10 px-3 py-2 text-xs text-primary">
            Posts as: DR Loan Payable + DR Interest Expense · CR Owner Contribution
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50">
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}

function AllocateModal({
  vehicle, onClose, onAllocated,
}: {
  vehicle: FinancedVehicle;
  onClose: () => void;
  onAllocated: () => void;
}) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const today = new Date();
  const [form, setForm] = useState({
    period_start: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
    period_end:   today.toISOString().split('T')[0],
  });

  const inputClass = 'w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary';

  function handleSubmit() {
    setError(null);
    start(async () => {
      const res = await allocateUsage(vehicle.id, form);
      if (res.error) { setError(res.error); toastError('Allocation failed', res.error); return; }
      setResult(res.data);
      toastSuccess('Allocation posted', `Business: ${fmt(res.data.business_amount)} · Personal: ${fmt(res.data.personal_amount)}`);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Allocate Business Use</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-6 space-y-4">
          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium text-sm">Allocation posted successfully</span>
              </div>
              <div className="rounded-xl border border-border divide-y divide-border text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Total interest in period</span>
                  <span className="font-medium text-foreground">{fmt(result.total_interest)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Business ({result.business_pct}%) → Vehicle Expense</span>
                  <span className="font-semibold text-primary">{fmt(result.business_amount)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Personal ({100 - result.business_pct}%) → Owner Draw</span>
                  <span className="font-semibold text-foreground">{fmt(result.personal_amount)}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                <p className="text-muted-foreground">Vehicle</p>
                <p className="font-medium text-foreground">{vehicle.name}</p>
                <p className="text-xs text-muted-foreground mt-1">Business use: <span className="font-semibold text-primary">{vehicle.business_use_pct}%</span></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Period Start</label>
                  <input type="date" value={form.period_start}
                    onChange={(e) => setForm((p) => ({ ...p, period_start: e.target.value }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Period End</label>
                  <input type="date" value={form.period_end}
                    onChange={(e) => setForm((p) => ({ ...p, period_end: e.target.value }))}
                    className={inputClass} />
                </div>
              </div>
              <div className="rounded-lg bg-primary-light dark:bg-primary/10 px-3 py-2 text-xs text-primary">
                Posts as: DR Vehicle Expense + DR Owner Draw · CR Interest Expense (clearing)
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button onClick={handleSubmit} disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50">
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Post Allocation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function VehicleDetail({
  vehicle: initialVehicle, onBack,
}: {
  vehicle: FinancedVehicle;
  onBack: () => void;
}) {
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [schedule, setSchedule] = useState<AmortizationRow[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  const progressPct = Math.min(100, Math.round(
    ((vehicle.loan_amount - vehicle.remaining_balance) / vehicle.loan_amount) * 100,
  ));
  const paidOff = vehicle.status === 'paid_off';

  useEffect(() => {
    getAmortizationSchedule(vehicle.id).then((res) => {
      if (res.data) setSchedule(res.data);
      setLoadingSchedule(false);
    });
  }, [vehicle.id]);

  async function refresh() {
    const res = await getVehicle(vehicle.id);
    if (res.data) setVehicle(res.data);
    setShowPayment(false);
    setShowAllocate(false);
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to vehicles
      </button>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-light dark:bg-primary/10 flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{vehicle.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paidOff ? 'bg-muted text-muted-foreground' : 'bg-primary-light dark:bg-primary/10 text-primary'}`}>
                {paidOff ? 'Paid Off' : 'Active'}
              </span>
            </div>
          </div>
          {!paidOff && (
            <div className="flex gap-2">
              <button onClick={() => setShowAllocate(true)}
                className="text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary transition-colors flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5" />Allocate
              </button>
              <button onClick={() => setShowPayment(true)}
                className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />Record Payment
              </button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Loan paid off</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Remaining Balance', value: fmt(vehicle.remaining_balance), icon: TrendingDown },
            { label: 'Monthly Payment',   value: fmt(vehicle.monthly_payment),   icon: Calendar },
            { label: 'Business Use',      value: `${vehicle.business_use_pct}%`, icon: Percent },
            { label: 'Original Loan',     value: fmt(vehicle.loan_amount),       icon: CreditCard },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-sm font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {vehicle.payments && vehicle.payments.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
          </div>
          <div className="divide-y divide-border">
            {vehicle.payments.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{new Date(p.payment_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  <p className="text-xs text-muted-foreground">Principal {fmt(p.principal_amount)} · Interest {fmt(p.interest_amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{fmt(p.total_payment)}</p>
                  <p className="text-xs text-muted-foreground">Balance: {fmt(p.balance_after)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Amortization Schedule</h3>
        </div>
        {loadingSchedule ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading schedule…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">#</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Payment</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Principal</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Interest</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schedule.slice(0, 60).map((row) => (
                  <tr key={row.period} className="hover:bg-muted/30">
                    <td className="px-4 py-2 text-muted-foreground">{row.period}</td>
                    <td className="px-4 py-2 text-right text-foreground">{fmt(row.payment)}</td>
                    <td className="px-4 py-2 text-right text-primary">{fmt(row.principal)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{fmt(row.interest)}</td>
                    <td className="px-4 py-2 text-right text-foreground">{fmt(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {schedule.length > 60 && (
              <p className="text-xs text-muted-foreground text-center py-3">Showing first 60 of {schedule.length} periods</p>
            )}
          </div>
        )}
      </div>

      {showPayment && <RecordPaymentModal vehicle={vehicle} onClose={() => setShowPayment(false)} onRecorded={refresh} />}
      {showAllocate && <AllocateModal vehicle={vehicle} onClose={() => setShowAllocate(false)} onAllocated={refresh} />}
    </div>
  );
}

export function VehicleManager({ initialVehicles }: { initialVehicles: FinancedVehicle[] }) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<FinancedVehicle | null>(null);

  if (selected) {
    return <VehicleDetail vehicle={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {vehicles.length === 0
            ? 'No vehicles set up yet.'
            : `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''}`}
        </p>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {vehicles.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <Car className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No financed vehicles</p>
          <p className="text-xs text-muted-foreground mb-4">
            Add a financed vehicle to track loan payments, interest, and business-use allocation.
          </p>
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
            Add your first vehicle
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vehicles.map((v) => {
          const progressPct = Math.min(100, Math.round(
            ((v.loan_amount - v.remaining_balance) / v.loan_amount) * 100,
          ));
          return (
            <button key={v.id} onClick={() => setSelected(v)}
              className="text-left bg-card border border-border rounded-2xl p-5 hover:border-primary hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary-light dark:bg-primary/10 flex items-center justify-center">
                  <Car className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{v.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.status === 'paid_off' ? 'bg-muted text-muted-foreground' : 'bg-primary-light dark:bg-primary/10 text-primary'}`}>
                    {v.status === 'paid_off' ? 'Paid Off' : 'Active'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-semibold text-foreground">{fmt(v.remaining_balance)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Monthly</span>
                  <span className="text-foreground">{fmt(v.monthly_payment)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Business use</span>
                  <span className="text-primary font-medium">{v.business_use_pct}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{progressPct}% paid off</p>
            </button>
          );
        })}
      </div>

      {showAdd && (
        <AddVehicleModal
          onClose={() => setShowAdd(false)}
          onCreated={(v) => {
            setVehicles((prev) => [v, ...prev]);
            setShowAdd(false);
            setSelected(v);
          }}
        />
      )}
    </div>
  );
}
