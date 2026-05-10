const fs = require('fs');
const p = 'apps/web/src/app/(app)/admin/admin-client.tsx';
let c = fs.readFileSync(p, 'utf8');

const stateBlock = `  const [seedingAll, setSeedingAll] = useState(false);
  const [seedAllResult, setSeedAllResult] = useState<{ vendors: number; mccs: number } | null>(null);
  const [seedAllError, setSeedAllError] = useState('');`;

const count = (c.match(new RegExp(stateBlock.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
console.log('State block count:', count);

// Remove all, then add back once
while (c.includes(stateBlock)) c = c.replace(stateBlock, '##SEEDALL_STATE##');
// Replace first occurrence, remove rest
c = c.replace('##SEEDALL_STATE##', stateBlock);
while (c.includes('##SEEDALL_STATE##')) c = c.replace('##SEEDALL_STATE##', '');

fs.writeFileSync(p, c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);