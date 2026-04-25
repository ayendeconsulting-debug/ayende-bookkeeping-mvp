import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Check } from 'lucide-react';
import { RevealOnScroll } from './reveal-on-scroll';

export const metadata: Metadata = {
  title: 'Features — Tempo Bookkeeping',
  description:
    'Tempo Bookkeeping in four moments — Monday morning bank sync, mid-month receipt attach, quarter-end HST remittance, year-end AI summary.',
};

interface SceneProps {
  tag: string;
  headline: string;
  lead: string;
  bullets: string[];
  pillar: string;
  imageOnRight: boolean;
  visual: React.ReactNode;
}

function Scene({ tag, headline, lead, bullets, pillar, imageOnRight, visual }: SceneProps) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
        {/* Visual */}
        <div className={`order-2 ${imageOnRight ? 'md:order-2' : 'md:order-1'}`}>
          <div className="md:sticky md:top-24">{visual}</div>
        </div>
        {/* Copy */}
        <div className={`order-1 ${imageOnRight ? 'md:order-1' : 'md:order-2'}`}>
          <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">{tag}</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
            {headline}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-6">{lead}</p>
          <ul className="space-y-2.5 mb-6">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
          <span className="inline-flex items-center gap-2 bg-[#EDF7F2] border border-[#C3E8D8] text-[#04342C] text-xs font-medium px-3 py-1 rounded-full">
            {pillar}
          </span>
        </div>
      </div>
    </section>
  );
}

export default function FeaturesPage() {
  return (
    <div>
      {/* Hero band */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-4">Features</p>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight">
          Tempo, <span className="text-[#0F6E56]">four times a year.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Every feature has a moment when it earns its place. Here are four of them — a Monday
          morning, a mid-month receipt, a quarter-end deadline, and a year-end review.
        </p>
      </section>

      {/* Scene 01 — Bank sync + AI */}
      <RevealOnScroll>
        <Scene
          tag="Scene 01 · Monday, 9:14 am"
          headline="Your weekend transactions, already on the right line."
          lead="You log in Monday morning. Sixty-three weekend transactions are already imported, classified, and split where HST applies. The four that need a second look are flagged at the top."
          bullets={[
            'Bank sync via Plaid pulls transactions in real time across 12,000+ Canadian and US institutions.',
            'AI classification matches each transaction against your chart of accounts using your past patterns as the training signal.',
            'HST and GST split automatically into the correct liability accounts on every taxable transaction.',
          ]}
          pillar="Bank sync · AI classification"
          imageOnRight
          visual={<TransactionsVisual />}
        />
      </RevealOnScroll>

      <div className="border-t border-border max-w-6xl mx-auto" />

      {/* Scene 02 — Receipt repository (LOCKED COPY: no OCR) */}
      <RevealOnScroll>
        <Scene
          tag="Scene 02 · April 14, 2 pm"
          headline="A photo, attached to its transaction. Six years of audit cover."
          lead="The $847.20 Home Depot transaction was already in your ledger. You attach a photo of the paper receipt — Tempo files it against that journal entry, and keeps it for the six years CRA can ask for it."
          bullets={[
            'Upload any format — photo of paper receipt, PDF invoice, or scanned image.',
            'Each receipt is linked to its specific journal entry, not a category — full traceability for audit.',
            'Six-year retention from upload date matches CRA\u2019s audit lookback window.',
          ]}
          pillar="Receipt repository · CRA-ready"
          imageOnRight={false}
          visual={<ReceiptsVisual />}
        />
      </RevealOnScroll>

      <div className="border-t border-border max-w-6xl mx-auto" />

      {/* Scene 03 — HST/GST */}
      <RevealOnScroll>
        <Scene
          tag="Scene 03 · June 28, 4 pm"
          headline="Q2 closes Friday. The remittance is already done."
          lead="Every transaction with a tax code split itself into net and HST as it posted. Your GST34 lines 101–113 are pre-calculated. You hit export, you file. No spreadsheet, no scramble."
          bullets={[
            'Net amount and tax portion split into separate journal lines automatically as you post.',
            'GST34 lines 101 (sales subject to HST), 105 (HST collected), 108 (input tax credits), 109 (net tax owing) computed live.',
            'Export to PDF or CSV ready for direct CRA submission. Locked fiscal year prevents retroactive edits.',
          ]}
          pillar="HST/GST · CRA remittance"
          imageOnRight
          visual={<HstVisual />}
        />
      </RevealOnScroll>

      <div className="border-t border-border max-w-6xl mx-auto" />

      {/* Scene 04 — AI year-end */}
      <RevealOnScroll>
        <Scene
          tag="Scene 04 · December 31, 11 pm"
          headline="A year reviewed in the time it takes to make tea."
          lead="Tempo&apos;s AI reads your full ledger and writes the year-end summary your accountant actually wants — observations, anomalies, suggested adjustments, and a checklist PDF. Ready before the kettle boils."
          bullets={[
            'Identifies unusual patterns, classification anomalies, and missing receipts across the full year.',
            'Drafts an Income Statement and Balance Sheet narrative in plain language for your accountant.',
            'Exports a single PDF with checklist, observations, and supporting numbers.',
          ]}
          pillar="AI year-end assistant"
          imageOnRight={false}
          visual={<AiVisual />}
        />
      </RevealOnScroll>

      {/* Closing band */}
      <section className="bg-card border-t border-border">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">
            Every feature, every plan
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
            Plus the rest of the spec sheet.
          </h2>
          <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-2xl mx-auto">
            {[
              'Double-entry accounting',
              'Bank connectivity via Plaid',
              'CSV & PDF import',
              'Owner draws & contributions',
              'Invoicing · AP/AR',
              'Recurring detection',
              'Fiscal year locking',
              'Multi-user access',
            ].map((label) => (
              <span
                key={label}
                className="text-xs font-medium text-foreground bg-background border border-border rounded-full px-3 py-1.5"
              >
                {label}
              </span>
            ))}
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 bg-[#0F6E56] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#085041] transition-colors"
          >
            See pricing <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

// ── Scene visuals ─────────────────────────────────────────────────────────

function TransactionsVisual() {
  const rows = [
    { date: 'Apr 6', desc: 'STRIPE PAYOUT', cat: 'Revenue', amt: '+$3,200', positive: true, pending: false },
    { date: 'Apr 5', desc: 'AMAZON WEB SERVICES', cat: 'Software', amt: '-$184', positive: false, pending: false },
    { date: 'Apr 5', desc: 'SHELL CANADA', cat: 'Vehicle', amt: '-$67', positive: false, pending: false },
    { date: 'Apr 4', desc: 'UNCLEAR · review', cat: 'Pending', amt: '-$240', positive: false, pending: true },
  ];
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-muted/30 border-b border-border px-4 py-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
        <p className="text-xs font-semibold text-foreground">Transactions · auto-imported</p>
      </div>
      <div>
        {rows.map((tx, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 text-xs"
          >
            <span className="w-12 flex-shrink-0 text-muted-foreground">{tx.date}</span>
            <span className="flex-1 truncate text-foreground">{tx.desc}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                tx.pending
                  ? 'bg-[#FAEEDA] text-[#854F0B]'
                  : 'bg-[#E1F5EE] text-[#04342C]'
              }`}
            >
              {tx.cat}
            </span>
            <span
              className={`w-16 text-right font-semibold flex-shrink-0 ${
                tx.positive ? 'text-[#0F6E56]' : 'text-foreground'
              }`}
            >
              {tx.amt}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReceiptsVisual() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-muted/30 border-b border-border px-4 py-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
        <p className="text-xs font-semibold text-foreground">Receipt repository · 247 stored</p>
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#E1F5EE] border border-[#9FE1CB]">
          <div className="w-9 h-9 rounded-md bg-[#9FE1CB] flex items-center justify-center text-xs font-semibold text-[#04342C] flex-shrink-0">
            PDF
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              Home Depot · lumber &amp; supplies
            </p>
            <p className="text-xs text-muted-foreground truncate">Apr 14 · linked to transaction · Materials</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-semibold text-foreground">$847.20</p>
            <p className="text-xs text-[#0F6E56] font-medium">Just attached</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-2.5 rounded-lg">
          <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
            JPG
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">Rogers · business phone</p>
            <p className="text-xs text-muted-foreground">Apr 1 · Phone</p>
          </div>
          <p className="text-xs font-medium text-foreground flex-shrink-0">$95.00</p>
        </div>
        <div className="flex items-center gap-3 p-2.5 rounded-lg">
          <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
            PDF
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">Amazon · office equipment</p>
            <p className="text-xs text-muted-foreground">Mar 28 · Equipment</p>
          </div>
          <p className="text-xs font-medium text-foreground flex-shrink-0">$312.50</p>
        </div>
      </div>
      <div className="border-t border-border px-4 py-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Retained 6 years from upload</span>
        <span className="text-[#0F6E56] font-medium">CRA-ready</span>
      </div>
    </div>
  );
}

function HstVisual() {
  const rows = [
    { line: 'Sales subject to HST · line 101', amount: '$48,320', accent: false },
    { line: 'HST collected · line 105', amount: '$6,281', accent: false },
    { line: 'Input tax credits · line 108', amount: '$2,140', accent: false },
    { line: 'Net tax owing · line 109', amount: '$4,141', accent: true },
  ];
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-muted/30 border-b border-border px-4 py-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
        <p className="text-xs font-semibold text-foreground">Q2 close · GST34 ready</p>
      </div>
      <div className="p-4 space-y-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <span className="w-5 h-5 rounded-full bg-[#0F6E56] flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </span>
            <span className="flex-1 text-foreground text-xs">{row.line}</span>
            <span
              className={`text-xs font-semibold flex-shrink-0 ${
                row.accent ? 'text-[#0F6E56]' : 'text-foreground'
              }`}
            >
              {row.amount}
            </span>
          </div>
        ))}
      </div>
      <div className="mx-4 mb-4 mt-1 bg-[#E1F5EE] border border-[#9FE1CB] rounded-lg px-3 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#04342C]">Export to CRA</span>
        <span className="text-xs text-[#0F6E56] font-medium">PDF · CSV</span>
      </div>
    </div>
  );
}

function AiVisual() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-muted/30 border-b border-border px-4 py-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
        <p className="text-xs font-semibold text-foreground">Year-end assistant · 2026</p>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-end">
          <div className="bg-[#0F6E56] text-white px-3 py-2 rounded-2xl rounded-tr-sm max-w-[80%] text-xs">
            Summarise my 2026 books for my accountant.
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-muted text-foreground px-3 py-2 rounded-2xl rounded-tl-sm max-w-[88%] text-xs leading-relaxed">
            Revenue $186,430 (+12% YoY). Net margin 28.4%. Three observations: software costs up 31% — driven by AWS scale-up in Q3. One unusual entry: $4,200 January charge classified as <span className="font-semibold">Travel</span> may belong in <span className="font-semibold">Equipment</span>. HST remitted $14,830 across four quarters — clean.
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-[#0F6E56] text-white px-3 py-2 rounded-2xl rounded-tr-sm max-w-[80%] text-xs">
            Generate the PDF.
          </div>
        </div>
        <div className="bg-[#E1F5EE] border border-[#9FE1CB] rounded-lg px-3 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0F6E56] rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-white">PDF</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#04342C] truncate">Year-end review · 2026.pdf</p>
            <p className="text-xs text-[#0F6E56]">Ready for accountant</p>
          </div>
        </div>
      </div>
    </div>
  );
}
