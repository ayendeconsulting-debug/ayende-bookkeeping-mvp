'use client';

import { useState, useEffect } from 'react';

export function DashboardCarousel() {
  const SLIDES = [
    {
      label: 'Dashboard',
      content: (
        <div className="p-5 bg-[#f5f3ef] dark:bg-[#1a1714]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Revenue',  value: '$48,320', change: '+12.4%', color: 'border-[#0F6E56]' },
              { label: 'Total Expenses', value: '$31,840', change: '+8.1%',  color: 'border-[#185FA5]' },
              { label: 'Net Income',     value: '$16,480', change: '+18.2%', color: 'border-[#92620A]' },
              { label: 'Cash Balance',   value: '$24,150', change: '+5.3%',  color: 'border-[#0F6E56]' },
            ].map((kpi) => (
              <div key={kpi.label} className={`bg-card rounded-xl p-3 border-t-2 ${kpi.color}`}>
                <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-[#0F6E56]">{kpi.change}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 bg-card rounded-xl p-4">
              <p className="text-xs font-medium text-foreground mb-3">Revenue vs Expenses</p>
              <div className="flex items-end gap-1.5 h-20">
                {[65,45,72,58,80,62,75,55,85,68,90,78].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${h*0.75}%`, background: i % 2 === 0 ? '#0F6E56' : '#E5E1D8' }} />
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl p-4">
              <p className="text-xs font-medium text-foreground mb-3">Recent Transactions</p>
              <div className="space-y-2">
                {[
                  { name: 'Client Invoice #42', amt: '+$3,200', pos: true },
                  { name: 'AWS Services',       amt: '-$184',   pos: false },
                  { name: 'Office Supplies',    amt: '-$67',    pos: false },
                  { name: 'Client Invoice #43', amt: '+$1,850', pos: true },
                ].map((tx) => (
                  <div key={tx.name} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate max-w-[110px]">{tx.name}</span>
                    <span className={`text-xs font-medium ${tx.pos ? 'text-[#0F6E56]' : 'text-destructive'}`}>{tx.amt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Transactions',
      content: (
        <div className="p-5 bg-[#f5f3ef] dark:bg-[#1a1714]">
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Transactions</p>
              <div className="flex gap-2">
                <div className="bg-[#EDF7F2] text-[#0F6E56] text-xs px-2.5 py-1 rounded-full font-medium">All</div>
                <div className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full">Unclassified</div>
              </div>
            </div>
            <div className="divide-y divide-border">
              {[
                { date: 'Apr 3',  desc: 'STRIPE PAYOUT',       cat: 'Revenue',  amt: '+$3,200', tag: 'Auto'   },
                { date: 'Apr 2',  desc: 'AMAZON WEB SERVICES', cat: 'Software', amt: '-$184',   tag: 'Auto'   },
                { date: 'Apr 1',  desc: 'STAPLES #0042',       cat: 'Office',   amt: '-$67',    tag: 'Manual' },
                { date: 'Mar 31', desc: 'TD BANK TRANSFER',    cat: 'Transfer', amt: '-$2,000', tag: 'Auto'   },
                { date: 'Mar 30', desc: 'GOOGLE WORKSPACE',    cat: 'Software', amt: '-$18',    tag: 'Auto'   },
              ].map((tx) => (
                <div key={tx.desc} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-8 text-xs text-muted-foreground flex-shrink-0">{tx.date}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{tx.desc}</p>
                    <p className="text-xs text-muted-foreground">{tx.cat}</p>
                  </div>
                  <span className="text-xs bg-[#EDF7F2] dark:bg-primary/10 text-[#0F6E56] px-2 py-0.5 rounded-full">{tx.tag}</span>
                  <span className={`text-xs font-semibold w-16 text-right ${tx.amt.startsWith('+') ? 'text-[#0F6E56]' : 'text-foreground'}`}>{tx.amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Income Statement',
      content: (
        <div className="p-5 bg-[#f5f3ef] dark:bg-[#1a1714]">
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Income Statement — Q1 2026</p>
              <div className="flex gap-2">
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">PDF</span>
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">CSV</span>
              </div>
            </div>
            <div className="p-4 space-y-1">
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-xs font-semibold text-foreground">REVENUE</span>
                <span className="text-xs font-semibold text-foreground">$48,320</span>
              </div>
              {[['  Consulting Revenue','$38,000'],['  Product Sales','$7,200'],['  Other Income','$3,120']].map(([k,v]) => (
                <div key={k} className="flex justify-between py-1">
                  <span className="text-xs text-muted-foreground">{k}</span>
                  <span className="text-xs text-foreground">{v}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 border-t border-b border-border/50 mt-1">
                <span className="text-xs font-semibold text-foreground">EXPENSES</span>
                <span className="text-xs font-semibold text-destructive">($31,840)</span>
              </div>
              {[['  Salaries','($18,000)'],['  Software & Tools','($4,200)'],['  Office & Admin','($9,640)']].map(([k,v]) => (
                <div key={k} className="flex justify-between py-1">
                  <span className="text-xs text-muted-foreground">{k}</span>
                  <span className="text-xs text-foreground">{v}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t-2 border-[#0F6E56] mt-1">
                <span className="text-xs font-bold text-foreground">NET INCOME</span>
                <span className="text-xs font-bold text-[#0F6E56]">$16,480</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Banks',
      content: (
        <div className="p-5 bg-[#f5f3ef] dark:bg-[#1a1714]">
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Connected Bank Accounts</p>
            </div>
            <div className="p-4 space-y-3">
              {[
                { bank: 'TD Canada Trust', account: 'Business Chequing ••4821', balance: '$24,150', status: 'Synced' },
                { bank: 'RBC Royal Bank',  account: 'Business Savings ••3302',  balance: '$18,400', status: 'Synced' },
                { bank: 'Visa Business',   account: 'Credit Card ••7719',        balance: '-$3,280', status: 'Synced' },
              ].map((acc) => (
                <div key={acc.account} className="flex items-center gap-3 p-3 border border-border rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">
                    {acc.bank[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{acc.bank}</p>
                    <p className="text-xs text-muted-foreground">{acc.account}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-foreground">{acc.balance}</p>
                    <span className="text-xs text-[#0F6E56]">● {acc.status}</span>
                  </div>
                </div>
              ))}
              <button className="w-full border-2 border-dashed border-border rounded-xl py-3 text-xs text-muted-foreground hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors">
                + Connect another account via Plaid
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Invoices',
      content: (
        <div className="p-5 bg-[#f5f3ef] dark:bg-[#1a1714]">
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Invoices</p>
              <div className="bg-[#0F6E56] text-white text-xs px-3 py-1 rounded-lg font-medium">+ New Invoice</div>
            </div>
            <div className="divide-y divide-border">
              {[
                { inv: 'INV-0042', client: 'Acme Corp',      amount: '$3,200', due: 'Apr 15', status: 'Sent',    statusColor: 'bg-[#EEF4FC] text-[#185FA5]'     },
                { inv: 'INV-0041', client: 'Maple Digital',  amount: '$1,850', due: 'Apr 10', status: 'Paid',    statusColor: 'bg-[#EDF7F2] text-[#0F6E56]'     },
                { inv: 'INV-0040', client: 'Northern Labs',  amount: '$5,400', due: 'Mar 30', status: 'Overdue', statusColor: 'bg-[#FDF0EE] text-destructive'    },
                { inv: 'INV-0039', client: 'Peak Solutions', amount: '$2,100', due: 'Mar 25', status: 'Paid',    statusColor: 'bg-[#EDF7F2] text-[#0F6E56]'     },
              ].map((inv) => (
                <div key={inv.inv} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{inv.inv} — {inv.client}</p>
                    <p className="text-xs text-muted-foreground">Due {inv.due}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.statusColor}`}>{inv.status}</span>
                  <span className="text-xs font-semibold text-foreground w-14 text-right">{inv.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'AI Assistant',
      content: (
        <div className="p-5 bg-[#f5f3ef] dark:bg-[#1a1714]">
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#0F6E56] flex items-center justify-center">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><rect x="1" y="10" width="3" height="5" rx="0.5" fill="white" opacity="0.5"/><rect x="6.5" y="7" width="3" height="8" rx="0.5" fill="white" opacity="0.75"/><rect x="12" y="3" width="3" height="12" rx="0.5" fill="white"/></svg>
              </div>
              <p className="text-xs font-semibold text-foreground">AI Bookkeeping Assistant</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-end">
                <div className="bg-[#0F6E56] text-white text-xs px-3 py-2 rounded-xl rounded-tr-sm max-w-[80%]">
                  What was my net profit margin in Q1?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-muted text-foreground text-xs px-3 py-2 rounded-xl rounded-tl-sm max-w-[85%] leading-relaxed">
                  Your Q1 net profit margin was <strong>34.1%</strong> — net income of $16,480 on revenue of $48,320. Up from 29.8% in Q4, driven by lower software costs and higher consulting revenue.
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-[#0F6E56] text-white text-xs px-3 py-2 rounded-xl rounded-tr-sm max-w-[80%]">
                  Show me my top 3 expense categories
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-muted text-foreground text-xs px-3 py-2 rounded-xl rounded-tl-sm max-w-[85%] leading-relaxed">
                  Top expenses Q1: <strong>1.</strong> Salaries $18,000 (56.5%) <strong>2.</strong> Office & Admin $9,640 (30.3%) <strong>3.</strong> Software $4,200 (13.2%)
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-border shadow-2xl overflow-hidden bg-card">
      {/* Browser chrome */}
      <div className="bg-[#f0ede8] dark:bg-[#2a2720] border-b border-border px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground max-w-xs mx-auto text-center">
            gettempo.ca/{SLIDES[current].label.toLowerCase().replace(' ', '-')}
          </div>
        </div>
        {/* Slide tabs */}
        <div className="hidden md:flex items-center gap-1">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.label}
              onClick={() => setCurrent(i)}
              className={[
                'text-xs px-2 py-0.5 rounded-md transition-all',
                i === current
                  ? 'bg-[#0F6E56] text-white'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {slide.label}
            </button>
          ))}
        </div>
      </div>

      {/* Slide content */}
      <div className="min-h-[320px]">
        {SLIDES[current].content}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 py-3 border-t border-border bg-card">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={[
              'rounded-full transition-all',
              i === current ? 'w-4 h-1.5 bg-[#0F6E56]' : 'w-1.5 h-1.5 bg-border hover:bg-muted-foreground',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
