import fs from 'node:fs';
import { crasisPlan, crasisEncode } from '../../src/lib/omega/crasis';
const t = fs.readFileSync(process.argv[2], 'utf8');
const p = crasisPlan(t, 'o200k_base', false);
console.log(p ? { rules: p.rules, gain: p.gain, sites: p.sites, fusedSites: p.fusedSites, headerTokens: p.headerTokens } : null);
const r = crasisEncode(t, 'o200k_base');
console.log(r.notes.slice(0, 300));
