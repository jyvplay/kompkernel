// Z37: compare the VXR wire and the DAEDALUS wire on one file: header vs body token split, and per-entry overhead.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasREncode } from '@/lib/omega/veritas-r';
import { daedalusEncode } from '@/lib/omega/daedalus';
const f = process.argv[2];
const text = fs.readFileSync(f, 'utf8');
const v = veritasREncode(text);
const d = daedalusEncode(text);
console.log('VXR total', v.outTokens, 'DAE messageTokens', d.messageTokens, 'DAE contract', d.contractTokens, 'DAE wire tokens', countTokens(d.wire, 'o200k_base'));
console.log('--- VXR wire head ---'); console.log(JSON.stringify(v.wire.slice(0, 700)));
console.log('--- DAE wire head ---'); console.log(JSON.stringify(d.wire.slice(0, 700)));
