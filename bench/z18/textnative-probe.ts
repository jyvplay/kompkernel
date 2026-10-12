// Text-native lane: codecs whose wire stays ASCII/plain text (no alias glyph substitution).
// Compares DITTO (raw), LAKONIKOS, DAEDALUS (budget non-binding), and DITTO->LAKONIKOS / DITTO->DAEDALUS.
// Every row is decode-checked. Identity counts shown for reference.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { dittoEncode, dittoDecode } from '@/lib/omega/ditto';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
import { daedalusEncode } from '@/lib/omega/daedalus';
const files = (process.argv[2] ?? 'find-listing.txt,ls-full-iso.txt,git-numstat.txt,npm-ls.txt,node-stacktraces.txt,openstack-loghub-26.log,git-log-fuller.txt').split(',');
const BUD = { budgetMs: 120000 };
for (const f of files) {
  const t = fs.readFileSync(`bench/holdout-ops/${f}`, 'utf8');
  const row: Record<string, unknown> = { f, identity: countTokens(t, 'o200k_base') };
  const d = dittoEncode(t, 'o200k_base');
  row.ditto = d.outTokens; row.ditto_exact = dittoDecode(d.wire) === t; row.ditto_mode = d.mode;
  const L = lakonikosEncode(t, 'o200k_base');
  row.lakonikos = countTokens(L.wire ?? t, 'o200k_base'); row.lakonikos_exact = (L.decoded ?? t) === t;
  const D = daedalusEncode(t, 'o200k_base', BUD as any);
  row.daedalus = countTokens(D.wire ?? t, 'o200k_base'); row.daedalus_exact = (D.decoded ?? t) === t;
  const LD = lakonikosEncode(d.wire, 'o200k_base');
  row.ditto_lakonikos = countTokens(LD.wire ?? d.wire, 'o200k_base'); row.ditto_lakonikos_exact = (LD.decoded ?? d.wire) === d.wire;
  const DD = daedalusEncode(d.wire, 'o200k_base', BUD as any);
  row.ditto_daedalus = countTokens(DD.wire ?? d.wire, 'o200k_base'); row.ditto_daedalus_exact = (DD.decoded ?? d.wire) === d.wire;
  console.log(JSON.stringify(row));
}
