// dialect-path in-context test: sample2 (2-space JSON), json2 dialect FORCED, npm+rest FORCED. Original NOT printed.
import fs from 'node:fs';
import { gnomonReduce, gnomonCompose, gnomonRestore } from '@/lib/omega/gnomon';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
import { GRAMMA_DIALECTS } from '@/lib/omega/gramma';
const text = fs.readFileSync('bench/z54/incontext/sample2.json', 'utf8');
const rules: ('npm' | 'rest')[] = ['npm', 'rest'];
const { reduced, fields } = gnomonReduce(text, rules);
const dd = GRAMMA_DIALECTS.find(d => d.id === 'json2')!;
const cheap = dd.canon(reduced);
const r = daedalusEncode(cheap, 'o200k_base');
const msg = gnomonCompose(dd.clause + '\n' + r.decoderPrompt, rules);
fs.writeFileSync('bench/z54/incontext/message2.txt', msg);
console.log(JSON.stringify({ fields, expandOk: dd.expand(cheap) === reduced, wireOk: daedalusDecode(r.wire) === cheap, msgChars: msg.length, clause: dd.clause }));
