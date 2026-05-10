const fs = require('fs');
const p = 'apps/web/src/app/(app)/admin/admin-client.tsx';
let c = fs.readFileSync(p, 'utf8');

// Remove misplaced function from CopyButton helper
c = c.replace(
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
  return (
    <button onClick={doCopy}`,
  `  return (
    <button onClick={doCopy}`
);

// Insert state after clearResult state (which is inside main component)
c = c.replace(
  `  const [clearResult, setClearResult] = useState<{ deleted: number } | null>(null);`,
  `  const [clearResult, setClearResult] = useState<{ deleted: number } | null>(null);
  const [seedingAll, setSeedingAll] = useState(false);
  const [seedAllResult, setSeedAllResult] = useState<{ vendors: number; mccs: number } | null>(null);
  const [seedAllError, setSeedAllError] = useState('');`
);

// Insert handleSeedAll before handleSeed (inside main component)
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