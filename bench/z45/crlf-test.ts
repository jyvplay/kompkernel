import fs from 'node:fs';
import { anagnorisisEncode, anagnorisisDecode } from '../../src/lib/omega/anagnorisis';
const t = fs.readFileSync('bench/holdout/lic-mit.txt', 'utf8').replace(/\n/g, '\r\n');
const r = anagnorisisEncode(t, 'o200k_base');
console.log('applied', r.canonApplied, 'refs', r.canonRefs, 'M', r.messageTokens, 'raw', r.inTokens, 'exact', r.exact, 'decode', anagnorisisDecode(r.wire) === t);
console.log(JSON.stringify(r.decoderPrompt));
// adversarial: payload already containing a reference, and a slot containing ' | '
const t2 = 'see 【MIT】 above\n' + fs.readFileSync('bench/holdout/lic-mit.txt', 'utf8');
const r2 = anagnorisisEncode(t2, 'o200k_base');
console.log('adversarial brackets -> applied', r2.canonApplied, 'exact', anagnorisisDecode(r2.wire) === t2, r2.notes.slice(0, 80));
const t3 = fs.readFileSync('bench/z45/corpus/licenses/openai_openai-python.txt', 'utf8').replace('Copyright 2026 OpenAI', 'Copyright 2026 A | B');
const r3 = anagnorisisEncode(t3, 'o200k_base');
console.log('slot with " | " -> applied', r3.canonApplied, 'exact', anagnorisisDecode(r3.wire) === t3, r3.notes.slice(0, 90));
const t4 = fs.readFileSync('bench/z45/corpus/licenses/openai_openai-python.txt', 'utf8').replace('Copyright 2026 OpenAI', 'Copyright 2026 A】B');
const r4 = anagnorisisEncode(t4, 'o200k_base');
console.log('slot with bracket -> applied', r4.canonApplied, 'exact', anagnorisisDecode(r4.wire) === t4, r4.notes.slice(0, 90));
