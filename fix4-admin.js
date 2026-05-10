const fs = require('fs');
const p = 'apps/web/src/app/(app)/admin/admin-client.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Remove ALL instances of handleSeedAll function wherever they landed
const fnBlock = `  async function handleSeedAll() {
    setSeedingAll(true); setSeedAllError(''); setSeedAllResult(null);
    try {
      const res = await fetch('/api/proxy/admin/seed-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Seed failed');
      setSeedAllResult(data);
    } catch (e: any) { setSeedAllError(e.message); }
    finally { setSeedingAll(false); }
  }

`;
while (c.includes(fnBlock)) c = c.replace(fnBlock, '');

// Also remove without trailing newline
const fnBlock2 = `  async function handleSeedAll() {
    setSeedingAll(true); setSeedAllError(''); setSeedAllResult(null);
    try {
      const res = await fetch('/api/proxy/admin/seed-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Seed failed');
      setSeedAllResult(data);
    } catch (e: any) { setSeedAllError(e.message); }
    finally { setSeedingAll(false); }
  }`;
while (c.includes(fnBlock2)) c = c.replace(fnBlock2, '');

// 2. Remove ALL duplicate state declarations (keep only one set)
const stateBlock = `  const [seedingAll, setSeedingAll] = useState(false);
  const [seedAllResult, setSeedAllResult] = useState<{ vendors: number; mccs: number } | null>(null);
  const [seedAllError, setSeedAllError] = useState('');`;
while (c.includes(stateBlock)) c = c.replace(stateBlock, '');

// 3. Now insert state after clearResult — single insertion
c = c.replace(
  `  const [clearResult, setClearResult] = useState<{ deleted: number } | null>(null);`,
  `  const [clearResult, setClearResult] = useState<{ deleted: number } | null>(null);
  const [seedingAll, setSeedingAll] = useState(false);
  const [seedAllResult, setSeedAllResult] = useState<{ vendors: number; mccs: number } | null>(null);
  const [seedAllError, setSeedAllError] = useState('');`
);

// 4. Insert handleSeedAll before handleSeed — single insertion
c = c.replace(
  `  async function handleSeed() {`,
  `  async function handleSeedAll() {
    setSeedingAll(true); setSeedAllError(''); setSeedAllResult(null);
    try {
      const res = await fetch('/api/proxy/admin/seed-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Seed failed');
      setSeedAllResult(data);
    } catch (e: any) { setSeedAllError(e.message); }
    finally { setSeedingAll(false); }
  }

  async function handleSeed() {`
);

fs.writeFileSync(p, c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);

// Verify placement
const lines = c.split('\n');
lines.forEach((l, i) => {
  if (l.includes('handleSeedAll') || l.includes('setSeedingAll')) {
    console.log(`  L${i+1}: ${l.trim()}`);
  }
});