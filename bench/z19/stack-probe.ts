// z19 stack probe: fixed-order pipelines of the ASCII-clean stages, measured on the ops and prose holdouts.
// A pipeline is accepted only if the full inverse chain (run in reverse) reproduces the input exactly.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { uuidfoldEncode, uuidfoldDecode } from '@/lib/omega/uuidfold';
import { dirfoldEncode, dirfoldDecode } from '@/lib/omega/dirfold';
import { dittoEncode, dittoDecode } from '@/lib/omega/ditto';
import { veritasEncode, veritasDecode } from '@/lib/omega/veritas';
import { compressHolographic } from '@/lib/neuralese-holographic';
import { decodeHolographic } from '@/lib/neuralese-holographic';

type Stage = { name: string; enc: (s: string) => string; dec: (s: string) => string };
const STAGES: Record<string, Stage> = {
  U: { name: 'uuidfold', enc: s => uuidfoldEncode(s, 'o200k_base').wire, dec: uuidfoldDecode },
  D: { name: 'dirfold', enc: s => dirfoldEncode(s, 'o200k_base').wire, dec: dirfoldDecode },
  T: { name: 'ditto', enc: s => dittoEncode(s, 'o200k_base').wire, dec: dittoDecode },
  V: { name: 'veritas', enc: s => veritasEncode(s, 'o200k_base').wire, dec: veritasDecode },
  H: { name: 'holographic', enc: s => compressHolographic(s).output, dec: decodeHolographic },
};
const PIPES = ['V', 'H', 'T', 'U', 'UT', 'UV', 'UTV', 'UDTV', 'UDT', 'DV', 'TV', 'TH', 'UTH', 'UDTH', 'UDV'];
const files = [
  ...['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt'].map(f => `bench/holdout-ops/${f}`),
  ...fs.readdirSync('bench/holdout').map(f => `bench/holdout/${f}`),
];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const row: Record<string, unknown> = { f, bytes: text.length, identity: countTokens(text, 'o200k_base') };
  for (const p of PIPES) {
    let w = text;
    try {
      for (const ch of p) w = STAGES[ch].enc(w);
      let back = w;
      for (const ch of [...p].reverse()) back = STAGES[ch].dec(back);
      row[p] = { tok: countTokens(w, 'o200k_base'), exact: back === text, ascii: /^[\x00-\x7f]*$/.test(w) };
    } catch (e: any) {
      row[p] = { err: String(e?.message ?? e).slice(0, 80) };
    }
  }
  console.log(JSON.stringify(row));
}
