const fs = require('fs');
const p = 'apps/web/src/app/(app)/admin/admin-client.tsx';
let c = fs.readFileSync(p, 'utf8');

// Remove misplaced block outside component (lines ~80-90)
c = c.replace(
  `  const [seedingAll, setSeedingAll] = React.useState(false);
  const [seedAllResult, setSeedAllResult] = React.useState<{ vendors: number; mccs: number } | null>(null);
  const [seedAllError, setSeedAllError] = React.useState('');

  async function handleSeedAll() {
    setSeedingAll(true); setSeedAllError(''); setSeedAllResult(null);
    try {
      const res = await fetch('/api/proxy/admin/seed-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Seed failed');
      setSeedAllResult(data);
    } catch (e: any) { setSeedAllError(e.message); }
    finally { setSeedingAll(false); }
  }

  return (`,
  `  return (`
);

// Now insert state + function in the right place, after clearing state inside component
c = c.replace(
  `  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{ deleted: number } | null>(null);`,
  `  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{ deleted: number } | null>(null);
  const [seedingAll, setSeedingAll] = useState(false);
  const [seedAllResult, setSeedAllResult] = useState<{ vendors: number; mccs: number } | null>(null);
  const [seedAllError, setSeedAllError] = useState('');`
);

// Insert handleSeedAll before return (
c = c.replace(
  `  return (`,
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

  return (`
);

fs.writeFileSync(p, c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);