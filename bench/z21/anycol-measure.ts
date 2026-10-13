// Would a column-free window (value anywhere in the last 16 lines) reach much further than same-column recall?
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const files = ['bench/holdout-ops/openstack-loghub-26.log','bench/holdout-ops/package-lock-head.json','bench/holdout-ops/npm-ls.txt','bench/holdout-ops/find-listing.txt','bench/holdout/gh-api.json.txt','bench/holdout/code-ts.txt','bench/holdout/license.txt'];
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const hist: string[][] = []; let same = 0, any = 0, anyTok = 0, sameTok = 0;
  for (const line of lines) {
    const toks = line.split(/\s+/).filter(x => x !== '');
    toks.forEach((v, j) => {
      if (v.length < 4) return;
      const lo = Math.max(0, hist.length - 16);
      let s = false, a = false;
      for (let k = hist.length - 1; k >= lo; k--) { if (hist[k][j] === v) s = true; if (hist[k].includes(v)) a = true; }
      if (s) { same++; sameTok += countTokens(v, 'o200k_base'); }
      if (a && !s) { any++; anyTok += countTokens(v, 'o200k_base'); }
    });
    hist.push(toks);
  }
  console.log(`${f.replace('bench/','')}: same-column=${same} (${sameTok} tok) extra-any-column=${any} (${anyTok} tok)`);
}
