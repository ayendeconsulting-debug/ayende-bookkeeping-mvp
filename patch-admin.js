const fs = require('fs');
const p = 'apps/web/src/app/(app)/admin/admin-client.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace('max-w-4xl mx-auto', 'max-w-4xl');

c = c.replace(
  'const [clearing, setClearing] = useState(false);',
  `const [clearing, setClearing] = useState(false);
  const [seedingAll, setSeedingAll] = useState(false);
  const [seedAllResult, setSeedAllResult] = useState(null);
  const [seedAllError, setSeedAllError] = useState('');`
);

c = c.replace(
  '  return (',
  `  async function handleSeedAll() {
    setSeedingAll(true); setSeedAllError(''); setSeedAllResult(null);
    try {
      const res = await fetch('/api/proxy/admin/seed-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Seed failed');
      setSeedAllResult(data);
    } catch (e) { setSeedAllError(e.message); }
    finally { setSeedingAll(false); }
  }

  return (`
);

const anchor = 'The trash button clears only pending synthetic transactions. Posted transactions are not affected.\n            </p>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n}';
const replacement = `The trash button clears only pending synthetic transactions. Posted transactions are not affected.
            </p>
          </div>

          {/* Phase 34: Seed Vendor Library + MCC Map */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Smart Match Seeds</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Seeds the vendor library (783 Canadian vendors) and MCC map (206 codes) for Smart Match Layer 1. Safe to re-run.
            </p>
            {seedAllError && <p className="text-sm text-destructive">{seedAllError}</p>}
            {seedAllResult && (
              <div className="rounded-xl bg-primary-light dark:bg-primary/10 border border-primary/20 px-4 py-3">
                <p className="text-sm font-semibold text-primary">{seedAllResult.vendors} vendors + {seedAllResult.mccs} MCCs seeded</p>
              </div>
            )}
            <Button onClick={handleSeedAll} disabled={seedingAll} className="w-full">
              {seedingAll ? 'Seeding...' : 'Seed Vendor Library + MCC Map'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}`;

const normalized = c.replace(/\r\n/g, '\n');
if (!normalized.includes(anchor.replace(/\r\n/g,'\n'))) {
  console.error('ANCHOR NOT FOUND'); process.exit(1);
}
const patched = normalized.replace(anchor.replace(/\r\n/g,'\n'), replacement);
fs.writeFileSync(p, patched, 'utf8');
console.log('Done. Lines:', patched.split('\n').length);