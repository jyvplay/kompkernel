// Z40: print DAEDALUS notes/arms for one file (diagnoses early returns).
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
const text = fs.readFileSync(process.argv[2], 'utf8');
const r = daedalusEncode(text, 'o200k_base', { budgetMs: Number(process.argv[3] ?? 200000) });
console.log(JSON.stringify({ mode: r.mode, armsRun: r.armsRun, winningArm: r.winningArm, M: r.messageTokens, ms: r.ms, notes: r.notes, features: r.features }));
