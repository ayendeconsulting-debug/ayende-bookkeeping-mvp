const fs = require('fs');
const p = 'apps/web/src/app/(app)/admin/admin-client.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Remove misplaced state declarations (added after the function)
c = c.replace(
  `\n  const [seedAllResult, setSeedAllResult] = useState(null);\n  const [seedAllError, setSeedAllError] = useState('');`,
  ''
);

// 2. Fix the function: add correct state declarations inside, replace bad error cast
c = c.replace(
  `  async function handleSeedAll() {
    setSeedingAll(true); setSeedAllError(''); setSeedAllResult(null);`,
  `  const [seedingAll, setSeedingAll] = React.useState(false);
  const [seedAllResult, setSeedAllResult] = React.useState<{ vendors: number; mccs: number } | null>(null);
  const [seedAllError, setSeedAllError] = React.useState('');

  async function handleSeedAll() {
    setSeedingAll(true); setSeedAllError(''); setSeedAllResult(null);`
);

// 3. Fix error cast
c = c.replace(
  "} catch (e) { setSeedAllError(e.message); }",
  "} catch (e: any) { setSeedAllError(e.message); }"
);

fs.writeFileSync(p, c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);