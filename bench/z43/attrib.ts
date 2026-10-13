// Z43: token attribution of RAW text (o200k, cl100k) by character class over the 151-file sample.
// Purpose: find where tokens are spent before choosing a mechanism. Not a codec.
import fs from 'node:fs';
import { encode as o200k, decode as d200 } from 'gpt-tokenizer/encoding/o200k_base';
import { encode as cl100k, decode as dcl } from 'gpt-tokenizer/encoding/cl100k_base';
const rows = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
type Cls = 'ws' | 'url' | 'fence-code' | 'cjk' | 'cyr' | 'b64-like' | 'markup' | 'digits' | 'latin' | 'punct-other' | 'other';
const agg: Record<string, Record<Cls, { tok: number; chars: number }>> = {};
function classify(text: string, fenced: boolean[], urls: boolean[], i: number): Cls {
  const ch = text[i];
  if (urls[i]) return 'url';
  if (fenced[i]) return 'fence-code';
  if (/\s/.test(ch)) return 'ws';
  if (/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(ch)) return 'cjk';
  if (/[\u0400-\u04ff]/.test(ch)) return 'cyr';
  if (/[0-9]/.test(ch)) return 'digits';
  if (/[A-Za-z]/.test(ch)) return 'latin';
  if (/[|#*\-_>\[\]\(\)`]/.test(ch)) return 'markup';
  return 'punct-other';
}
for (const r of rows) {
  let text: string;
  try { text = fs.readFileSync(r.file, 'utf8'); } catch { continue; }
  const grp = r.group;
  const fenced: boolean[] = new Array(text.length).fill(false);
  const urls: boolean[] = new Array(text.length).fill(false);
  let inF = false;
  let pos = 0;
  for (const line of text.split('\n')) {
    if (line.trimStart().startsWith('```')) inF = !inF;
    if (inF) for (let k = 0; k < line.length + 1 && pos + k < text.length; k++) fenced[pos + k] = true;
    pos += line.length + 1;
  }
  for (const m of text.matchAll(/https?:\/\/[^\s)\]>"']+/g)) for (let k = m.index!; k < m.index! + m[0].length; k++) urls[k] = true;
  for (const [name, enc, dec] of [['o200k', o200k, d200], ['cl100k', cl100k, dcl]] as const) {
    const ids = enc(text);
    const agg2 = (agg[name] ??= {} as any);
    // map tokens to char offsets via prefix decode of token strings
    let off = 0;
    for (const id of ids) {
      const s = dec([id]);
      const L = Math.max(1, s.length);
      const lead = s.length - s.trimStart().length;
      const c = s.trim().length === 0 ? (s.length ? 'ws' : 'other') : classify(text, fenced, urls, Math.min(off + lead, text.length - 1));
      const key = c as Cls;
      if (!agg2[grp]) agg2[grp] = {} as any;
      agg2[grp][key] ??= { tok: 0, chars: 0 };
      agg2[grp][key].tok += 1;
      agg2[grp][key].chars += s.length;
      off += L;
    }
  }
}
for (const name of Object.keys(agg)) {
  console.log('== ' + name);
  const tot: Record<string, { tok: number; chars: number }> = {};
  for (const g of Object.keys(agg[name])) for (const c of Object.keys(agg[name][g])) { tot[c] ??= { tok: 0, chars: 0 }; tot[c].tok += agg[name][g][c as Cls].tok; tot[c].chars += agg[name][g][c as Cls].chars; }
  const T = Object.values(tot).reduce((a, b) => a + b.tok, 0);
  for (const [c, v] of Object.entries(tot).sort((a, b) => b[1].tok - a[1].tok)) console.log(c.padEnd(12), String(v.tok).padStart(8), (100 * v.tok / T).toFixed(1).padStart(6) + '% tok', (v.chars / Math.max(1, v.tok)).toFixed(2) + ' chars/tok');
  console.log('total tokens', T);
}
