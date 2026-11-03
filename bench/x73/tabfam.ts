/**
 * X73 probe 5 — the corner probe 3 could not see.
 *
 * tagstack's parents are {synkrisis, bifront, kanon, akolouthia2, apographe,
 * metron, hemera, diastema}. The TABLE family (hyle / brachys / austere) is NOT
 * one of them: it is reached only by the separate codecs. So probe 3's "the
 * frontier on the TAB normal form is worth -24/0/+28" says nothing about the
 * strongest family this repo has, which is the one that folds a delimited table.
 *
 * This probe puts the space-aligned listings into TAB form and asks the table
 * codecs. If the fold fires, the listing stops being prose.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { hyleEncode } from '../../src/lib/omega/hyle';
import { austereEncode } from '../../src/lib/omega/austere';
import { brachysEncode } from '../../src/lib/omega/brachys';
const enc: any = 'o200k_base';

function tabNormal(text: string): { normal: string; K: number; rows: number; literal: number } {
  const lines = text.split('\n');
  const counts = new Map<number, number>();
  for (const l of lines) if (l.trim()) { const n = l.trim().split(/ +/).length; counts.set(n, (counts.get(n) ?? 0) + 1); }
  const K = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  const out: string[] = [];
  let rows = 0, literal = 0;
  for (const l of lines) {
    const cs = l.trim() ? l.trim().split(/ +/) : [];
    if (cs.length === K) { out.push(cs.join('\t')); rows++; }
    else { out.push('\\' + l); literal++; }
  }
  return { normal: out.join('\n'), K, rows, literal };
}

for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const { normal, K, rows } = tabNormal(t);
  const base: any = tagstackEncode(t, enc);
  const res: string[] = [];
  for (const [name, fn] of [['hyle', hyleEncode], ['brachys', brachysEncode], ['austere', austereEncode]] as const) {
    try {
      const r: any = (fn as any)(normal, enc);
      const tok = r.messageTokens ?? countTokens(r.message ?? '', enc);
      const exact = r.decoded === normal;
      res.push(`${name}:${tok}${exact ? '' : '!'}`);
    } catch (e: any) { res.push(`${name}:ERR`); }
  }
  console.log(`${p.split('/').pop().padEnd(24)} K=${String(K).padStart(2)} rows=${String(rows).padStart(3)} frontier ${String(base.messageTokens).padStart(5)} | onTABnormal ${res.join(' ')} | normalRaw ${countTokens(normal, enc)}`);
}
