// X17b: split each saved LAKONIKOS-D wire at its first pilcrow (¶) into rule-table part and body part, o200k tokens.
const fs = require('fs');
const path = require('path');
const { encode } = require('gpt-tokenizer/encoding/o200k_base');
const root = path.join(__dirname, '..', '..', '..');
const items = JSON.parse(fs.readFileSync(path.join(root, 'bench/x17/contract/_items.json'), 'utf8'));
const rows = [];
for (const it of items) {
  const w = it.wire;
  const i = w.indexOf('¶');
  const rules = i < 0 ? w : w.slice(0, i);
  const body = i < 0 ? '' : w.slice(i + 1);
  const nlStarts = (rules.match(/[\u0370-\u03FF\u0400-\u04FF\u0590-\u05FF\u0530-\u058F\u10A0-\u10FF\u0E00-\u0E7F\u0900-\u097F\u0600-\u06FF\u4E00-\u9FFF]/gu) || []).length;
  rows.push({ lane: it.lane, wire: encode(w).length, rules: encode(rules).length, body: encode(body).length, ruleChars: rules.length, bodyChars: body.length, glyphCount: nlStarts });
}
const sum = k => rows.reduce((a, r) => a + r[k], 0);
console.log(JSON.stringify({ lanes: rows.length, wire: sum('wire'), rules: sum('rules'), body: sum('body') }));
for (const r of rows) console.log(r.lane.padEnd(28), 'wire', String(r.wire).padStart(4), 'rules', String(r.rules).padStart(4), 'body', String(r.body).padStart(4), 'rule%', Math.round(100 * r.rules / r.wire));
