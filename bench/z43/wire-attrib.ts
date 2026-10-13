// Z43: token attribution of the DAEDALUS-D wire (one-chat minus contract is approximated by wire tokens) by char class.
// Uses daedalusEncode(dualTokenizer:true) output .wire; classes are computed on the wire text.
import fs from 'node:fs';
import { encode as o200k, decode as d200 } from 'gpt-tokenizer/encoding/o200k_base';
import { daedalusEncode } from '@/lib/omega/daedalus';
const rows = fs.readFileSync(''+(process.env.INDEX??'bench/z34/receipts/vxr-eval-151.jsonl')+'', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const OUT = process.env.OUT ?? '/home/user/z43/wire-attrib.jsonl';
async function main() {
  for (const r of rows) {
    let text: string;
    try { text = fs.readFileSync(r.file, 'utf8'); } catch { continue; }
    const enc = 'o200k_base' as const;
    const res = daedalusEncode(text, enc, { dualTokenizer: true });
    const wire = res.wire;
    const classes: Record<string, number> = {};
    const ids = o200k(wire);
    for (const id of ids) {
      const s = d200([id]);
      const c = s.trim().length === 0 ? 'ws' : /[\u0400-\u04ff]/.test(s) ? 'glyph-cyr' : /https?:|www\./.test(s) ? 'url-ish' : /[A-Za-z]/.test(s) ? 'latin' : /[0-9]/.test(s) ? 'digits' : 'markup-punct';
      classes[c] = (classes[c] ?? 0) + 1;
    }
    fs.appendFileSync(OUT, JSON.stringify({ group: r.group, file: r.file, mode: res.mode, wireTokens: ids.length, messageTokens: res.messageTokens, classes }) + '\n');
  }
  console.error('done');
}
main();
