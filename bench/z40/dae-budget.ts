// Z40: DAEDALUS on one file with an explicit budget (ms). Measures whether the frontier's identity fallback is a budget artifact.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
const [f, b] = process.argv.slice(2);
const t = fs.readFileSync(f, 'utf8');
const r = daedalusEncode(t, 'o200k_base', { budgetMs: Number(b) });
console.log(JSON.stringify({ f: f.split('/').slice(-2).join('/'), budgetMs: Number(b), in: r.inTokens, M: r.messageTokens, out: r.outTokens, contract: r.contractTokens, arm: r.winningArm, armsRun: r.armsRun, exact: r.exact, ms: r.ms, mode: r.mode }));
