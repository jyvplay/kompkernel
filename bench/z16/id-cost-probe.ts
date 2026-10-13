// Token cost of real identifiers under lossless spellings (o200k_base via the repo's own countTokens).
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { countTokens } from '@/lib/omega/bpe';
const files = execSync("grep -rlE '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' bench/holdout bench/holdout-ops bench/z11 2>/dev/null || true").toString().trim().split('\n').filter(Boolean);
const UU = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;
const uuids = new Set<string>();
for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(UU)) uuids.add(m[0]);
const list = [...uuids];
const forms: Record<string, (u: string) => string> = {
  as_is: u => u,
  no_dashes: u => u.replace(/-/g, ''),
  no_dashes_upper: u => u.replace(/-/g, '').toUpperCase(),
  dashes_upper: u => u.toUpperCase(),
  spaces_for_dashes: u => u.replace(/-/g, ' '),
  no_dashes_grouped4: u => u.replace(/-/g, '').replace(/(.{4})(?=.)/g, '$1 '),
};
const out: Record<string, number> = {};
for (const [k, f] of Object.entries(forms)) out[k] = list.reduce((s, u) => s + countTokens(f(u), 'o200k_base'), 0);
console.log(JSON.stringify({ files: files.length, distinctUUIDs: list.length, totalTokens: out, perUUID: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, +(v / list.length).toFixed(2)])) }, null, 1));
