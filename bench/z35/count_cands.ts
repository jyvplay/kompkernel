// Z35: exact o200k token count of each candidate string (for the character-level selection model).
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const cands: { s: string; occ: number[] }[] = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = cands.map((c) => ({ s: c.s, occ: c.occ, t: countTokens(c.s, 'o200k_base') }));
fs.writeFileSync(process.argv[3], JSON.stringify(out));
console.log(JSON.stringify({ candidates: out.length }));
