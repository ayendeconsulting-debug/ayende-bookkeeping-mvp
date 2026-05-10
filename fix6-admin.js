const fs = require('fs');
const p = 'apps/web/src/app/(app)/admin/admin-client.tsx';
let c = fs.readFileSync(p, 'utf8');

// Remove the stray first seedingAll line that landed before clearResult
c = c.replace(
  `  const [seedingAll, setSeedingAll] = useState(false);
  const [clearResult, setClearResult] = useState<{ deleted: number } | null>(null);`,
  `  const [clearResult, setClearResult] = useState<{ deleted: number } | null>(null);`
);

fs.writeFileSync(p, c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);