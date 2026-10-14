/**
 * Z44 literal-dialect probe: how much is left in *literal notation*?
 *
 * For each class of machine literal (ISO datetime, date, time, uuid, hex run,
 * thousands-separated integer, URL scheme, dotted-quad IP) compute
 *   net = tokens(original) - [ tokens(marker) + tokens(compacted payload) ]
 * per occurrence, aggregate per file.  Upside only: no contract cost, no
 * ambiguity cost, no verification.  This is the *ceiling* for a marker-based
 * literal layer, which is exactly what must be beaten by the decoder contract.
 *
 * Run: ./bench/z44/build.sh bench/z44/lit.ts [--dae] <file>...
 */
import fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';

const enc: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const args = process.argv.slice(2);
const useDae = args[0] === '--dae';
const files = useDae ? args.slice(1) : args;

interface Klass {
  name: string;
  re: RegExp;
  marker: string;
  compact: (m: string) => string;
}

const K: Klass[] = [
  {
    name: 'isoDateTime',
    re: /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g,
    marker: '⏱',
    compact: (m) => m.replace(/[-:]/g, '').replace(/^(\d{8})T?/, '$1'),
  },
  { name: 'date', re: /\d{4}-\d{2}-\d{2}/g, marker: '☰', compact: (m) => m.replace(/-/g, '') },
  { name: 'time', re: /\d{1,2}:\d{2}:\d{2}(?:\.\d+)?/g, marker: '☷', compact: (m) => m.replace(/:/g, '') },
  { name: 'uuid', re: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, marker: '⚿', compact: (m) => m.replace(/-/g, '') },
  { name: 'hexRun', re: /\b[0-9a-f]{16,}\b/gi, marker: '⚿', compact: (m) => m },
  { name: 'thousands', re: /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g, marker: '', compact: (m) => m.replace(/,/g, '') },
  { name: 'urlScheme', re: /https?:\/\//g, marker: '¤', compact: () => '' },
  { name: 'dottedQuad', re: /\b\d{1,3}(?:\.\d{1,3}){3}\b/g, marker: '⬚', compact: (m) => m.replace(/\./g, ' ') },
];

for (const f of files) {
  let text = fs.readFileSync(f, 'utf8');
  let tag = 'raw';
  if (useDae) {
    text = daedalusEncode(text, enc, { maxArms: 2 }).wire;
    tag = 'dae';
  }
  const base = T(text);
  const rows: string[] = [];
  let totalNet = 0;
  let totalHits = 0;
  for (const k of K) {
    const ms = text.match(k.re) ?? [];
    if (!ms.length) continue;
    let orig = 0;
    let neu = 0;
    for (const m of ms) {
      orig += T(m);
      neu += T(k.marker + k.compact(m));
    }
    const net = orig - neu;
    const mk = T(k.marker);
    rows.push(`  ${k.name.padEnd(12)} n=${String(ms.length).padStart(5)} orig=${String(orig).padStart(6)} new=${String(neu).padStart(6)} net=${String(net).padStart(6)} (${((100 * net) / base).toFixed(2)}% of ${tag}) marker=${mk}tok`);
    if (net > 0) {
      totalNet += net;
      totalHits += ms.length;
    }
  }
  console.log(`\n=== ${f.split('/').slice(-2).join('/')} ${tag} tokens=${base} uppercaseHit=${totalHits}`);
  for (const r of rows) console.log(r);
  console.log(`  UPSIDE total = ${totalNet} (${((100 * totalNet) / base).toFixed(2)}% of ${tag})`);
}
