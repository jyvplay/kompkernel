// X14 debug: HEMERA ms arm on openstack, stage by stage (not a deliverable).
import fs from 'node:fs';
import { hemeraSubstitute, hemeraExpand, HEMERA_CONTRACT_MS } from '@/lib/omega/hemera';
import { horaSubstitute, HORA_CONTRACT } from '@/lib/omega/hora';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const text = fs.readFileSync('bench/holdout-ops/openstack-loghub-26.log', 'utf8');
const h = horaSubstitute(text);
const m = hemeraSubstitute(text, { day: false, ms: true });
console.log(JSON.stringify({ horaMarks: h.marks, hemeraMs: m.ms, hemeraDays: m.days, sameText: h.out === m.out, contractEq: HEMERA_CONTRACT_MS === HORA_CONTRACT }));
console.log(JSON.stringify({ expandOk: hemeraExpand(m.out) === text }));
const d = daedalusEncode(m.out, 'o200k_base');
console.log(JSON.stringify({ exact: d.exact, rt: daedalusDecode(d.wire) === m.out, script: d.script }));
const M = countTokens(HEMERA_CONTRACT_MS + '\n' + d.decoderPrompt, 'o200k_base');
console.log(JSON.stringify({ M }));
