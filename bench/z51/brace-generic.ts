// generic line trie: a line is split into segments at separator chars (kept at the end of each segment)
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
const SENT = 'Brace groups work as in bash: text before { joins each comma item, in order; groups nest. Print one line per item.';
function trie(lines: string[], seps: string): string[] {
  const isSep = (c: string) => seps.includes(c);
  const rec = (xs: string[]): string[] => {
    const out: string[] = [];
    let i = 0;
    while (i < xs.length) {
      // head = longest prefix up to and including the first separator, shared by the run
      const s = xs[i]; let k = -1;
      for (let p = 0; p < s.length; p++) if (isSep(s[p])) { k = p; break; }
      if (k < 0) { out.push(s); i++; continue; }
      const head = s.slice(0, k + 1);
      let j = i;
      while (j < xs.length && xs[j].startsWith(head)) j++;
      if (j - i < 2) { out.push(s); i++; continue; }
      out.push(head + '{' + rec(xs.slice(i, j).map(x => x.slice(head.length))).join(',') + '}');
      i = j;
    }
    return out;
  };
  return rec(lines);
}
for (const arg of process.argv.slice(2)) {
  const [f, seps] = arg.split('@');
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  const plain = lines.join('\n');
  const bt = trie(lines, seps).join('\n');
  const dp = daedalusEncode(plain, enc, {});
  const db = daedalusEncode(bt, enc, {});
  const sentT = countTokens(SENT, enc);
  console.log(JSON.stringify({ f, seps, n: lines.length, M_plain: dp.messageTokens, M_brace_body: db.messageTokens, net: db.messageTokens + sentT - dp.messageTokens, pct: +(100 * (db.messageTokens + sentT - dp.messageTokens) / dp.messageTokens).toFixed(2), exact: db.decoded === bt }));
}
