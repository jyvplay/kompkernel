import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const C = (s: string) => countTokens(s, enc);
const cands: Record<string,string> = {
  A: `Before § k=v; cols tab-separated. ts: first 2026-10-24T00:00:00Z then +60s. iface: nvme0n0/1/2 cycling from row 1. in_mbps: 100.0+3.1k one decimal. out_mbps: 250.0+2.0k one decimal. loss_pct: 0.0,0.1,0.2,0.3,0.4,0.5,0.6 cycling from row 1. state: down,up,up,up,up cycling from row 1. Emit header ts,iface,in_mbps,out_mbps,loss_pct,state then 24 rows, LF after each. Print only the text.`,
  B: `§ 24 rows, sep TAB, header ts iface in_mbps out_mbps loss_pct state. ts starts 2026-10-24T00:00:00Z, step 60s. cols cycle/step from row 1: iface=nvme0n[0..2]; in=100.0+3.1k; out=250.0+2.0k,1dp; loss=[0.0..0.6] cycle 7; state=[down,up,up,up,up] cycle 5. LF-terminated. Print only.`,
};
for (const [k,v] of Object.entries(cands)) console.log(k, C(v), JSON.stringify(v));
// also: how much do the raw value columns cost in total?
const src = fs.readFileSync('bench/holdout-x40/metrics.tsv','utf8');
console.log('source tokens', C(src));
