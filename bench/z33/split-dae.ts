// Z33: split DAEDALUS wire at its rule separator and count tokens of rule table vs body (measurement only).
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const r = daedalusEncode(t, 'o200k_base');
const at = r.wire.indexOf('¶');
const head = at >= 0 ? r.wire.slice(0, at) : '';
const body = at >= 0 ? r.wire.slice(at + 1) : r.wire;
const rules = (head.match(/[\u0400-\u04FF\u4E00-\u9FFF]/g) ?? []).length;
console.log(JSON.stringify({ file: f, in: r.inTokens, M: r.messageTokens, contract: r.contractTokens, wire: r.outTokens, headTok: countTokens(head, 'o200k_base'), bodyTok: countTokens(body, 'o200k_base'), headChars: head.length, bodyChars: body.length, sepFound: at >= 0, ruleGlyphsApprox: rules, arm: r.winningArm }));
