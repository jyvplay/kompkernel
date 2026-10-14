// Z45: measure raw-token gain of punctuation/space fusion transforms (pre-dictionary), per file.
import fs from 'node:fs';
import { countTokens, encodeIds, type EncodingName } from '@/lib/omega/bpe';
const enc: EncodingName = (process.env.ENC as EncodingName) || 'o200k_base';
const files = process.argv.slice(2);

type T = { name: string; apply: (s: string) => string; exceptions: (s: string) => number };
const transforms: T[] = [
  { name: 'T1 .!?␠Upper', apply: s => s.replace(/([.!?]) (?=\p{Lu})/gu, '$1'), exceptions: s => (s.match(/[.!?]\p{Lu}/gu) ?? []).length },
  { name: 'T1b .!?␠Letter', apply: s => s.replace(/([.!?]) (?=\p{L})/gu, '$1'), exceptions: s => (s.match(/[.!?]\p{L}/gu) ?? []).length },
  { name: 'T2 ,␠letter', apply: s => s.replace(/, (?=\p{L})/gu, ','), exceptions: s => (s.match(/,\p{L}/gu) ?? []).length },
  { name: 'T3 ␠(letter', apply: s => s.replace(/(?<=\S) \((?=\p{L})/gu, '('), exceptions: s => (s.match(/\S\(\p{L}/gu) ?? []).length },
  { name: 'T4 ␠"Letter', apply: s => s.replace(/(?<=\S) "(?=\p{L})/gu, '"'), exceptions: s => (s.match(/\S"\p{L}/gu) ?? []).length },
  { name: 'T5 ␠“Letter', apply: s => s.replace(/(?<=\S) “(?=\p{L})/gu, '“'), exceptions: s => (s.match(/\S“\p{L}/gu) ?? []).length },
  { name: 'T6 ␠—␠', apply: s => s.replace(/ — /g, '—'), exceptions: s => (s.match(/\S—\S/g) ?? []).length },
  { name: 'T7 ;␠letter', apply: s => s.replace(/; (?=\p{L})/gu, ';'), exceptions: s => (s.match(/;\p{L}/gu) ?? []).length },
  { name: 'T8 :␠letter', apply: s => s.replace(/: (?=\p{L})/gu, ':'), exceptions: s => (s.match(/:\p{L}/gu) ?? []).length },
  { name: 'T9 ␠[letter', apply: s => s.replace(/(?<=\S) \[(?=\p{L})/gu, '['), exceptions: s => (s.match(/\S\[\p{L}/gu) ?? []).length },
];
let agg: Record<string, { gain: number; exc: number; sites: number }> = {};
let totalIn = 0;
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const base = countTokens(text, enc);
  totalIn += base;
  const parts: string[] = [];
  for (const t of transforms) {
    const out = t.apply(text);
    const n = countTokens(out, enc);
    const sites = (text.length - out.length);
    const exc = t.exceptions(text);
    const gain = base - n;
    agg[t.name] = agg[t.name] || { gain: 0, exc: 0, sites: 0 };
    agg[t.name].gain += gain; agg[t.name].exc += exc; agg[t.name].sites += sites;
    parts.push(`${t.name.split(' ')[0]}:${gain}/${sites}s/${exc}x`);
  }
  console.log(`${f.split('/').slice(-1)[0].padEnd(26)} in=${String(base).padEnd(6)} ${parts.join(' ')}`);
}
console.log('\nAGGREGATE over', files.length, 'files, in=', totalIn);
for (const [k, v] of Object.entries(agg)) console.log(`${k.padEnd(18)} gain=${v.gain} (${(100 * v.gain / totalIn).toFixed(2)}%) sites=${v.sites} exceptions=${v.exc}`);
