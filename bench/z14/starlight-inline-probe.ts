import fs from 'node:fs';
import { starlightInlineEncode, starlightInlineDecode } from '@/lib/omega/starlight-inline';
const t = fs.readFileSync(process.argv[2], 'utf8');
const r = starlightInlineEncode(t, 'o200k_base');
console.log('mode', r.mode, 'in', r.inTokens, 'out', r.outTokens, 'exact', starlightInlineDecode(r.wire) === t);
console.log(r.wire.slice(0, 260));
