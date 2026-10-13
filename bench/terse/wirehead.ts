import fs from 'node:fs';
import { chironEncode } from '../../src/lib/omega/chiron';
const t = fs.readFileSync(process.argv[2], 'utf8');
const r = chironEncode(t, 'o200k_base', { workUnits: 4_000_000 });
console.log(JSON.stringify(r.wire).slice(0, 900));
console.log('mode', r.mode, 'decodedOK', r.decoded === t, 'msg', r.messageTokens);
