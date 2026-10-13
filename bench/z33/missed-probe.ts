// Z33 probe: starting from VERITAS-C's final state on a file, try adding each DAEDALUS rule text as one more entry.
// A text whose exact addition lowers the wire token count is a candidate the search generator does not produce.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
import { aliasPool, escBody } from '@/lib/omega/veritas-a';
import { wireC } from '@/lib/omega/veritas-c';
import { runSearch } from './search-diag';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const base = runSearch(t);
const entries = (base as any).ents as { key: string; phrase: string }[] | undefined;
// rebuild the body from the entries exactly as the search did
const pool = aliasPool('o200k_base').filter((c) => !t.includes(c)).slice(0, 240);
let body = escBody(t);
for (let i = 0; i < (entries?.length ?? 0); i++) body = body.split(escBody(entries![i].phrase)).join(pool[i]);
const ents = entries ?? [];
const baseTok = countTokens(wireC(ents, body), 'o200k_base');
const r = daedalusEncode(t, 'o200k_base');
const at = r.wire.indexOf('¶');
const head = r.wire.slice(0, at);
const parts = head.split(/([\u0400-\u04FF])/).filter((x) => x.length);
const texts = new Set<string>();
for (let i = 0; i < parts.length; i++) if (/^[\u0400-\u04FF]$/.test(parts[i]) && parts[i + 1]) texts.add(parts[i + 1]);
let improving = 0, tried = 0; const hits: string[] = [];
const key0 = pool[ents.length];
for (const s of texts) {
  if (!s || s.length < 2) continue;
  const occ = body.split(escBody(s)).length - 1;
  if (occ < 2) continue;
  tried++;
  const nb = body.split(escBody(s)).join(key0);
  const tok = countTokens(wireC([...ents, { key: key0, phrase: s }], nb), 'o200k_base');
  if (tok < baseTok) { improving++; hits.push(`${tok - baseTok} occ=${occ} ${JSON.stringify(s.slice(0, 50))}`); }
}
console.log(JSON.stringify({ file: f, baseTok, entries: ents.length, daeRuleTextsTried: tried, improving }));
console.log(hits.slice(0, 25).join('\n'));
