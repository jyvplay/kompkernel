import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tachysEncode } from '../src/lib/omega/tachys';
import { chironDecode } from '../src/lib/omega/chiron';
import { countTokens } from '../src/lib/omega/bpe';

const enc = 'o200k_base' as const;
let ok = 0, fail = 0;
function check(name: string, text: string) {
  const r = tachysEncode(text, enc);
  const d = r.decoded;
  // exactness
  assert.equal(d, text, `${name}: decoded != text`);
  // secondary decode via exported decoder
  const { tachysDecode } = require('../src/lib/omega/tachys');
  const d2 = tachysDecode(r.wire);
  assert.equal(d2, text, `${name}: tachysDecode != text`);
  // chironDecode should also handle TACHYS wires that are CHIRON wires
  if (r.wire.startsWith('§')) assert.equal(chironDecode(r.wire), text, `${name}: chironDecode != text`);
  // wire deterministic (second encode same wire)
  const r2 = tachysEncode(text, enc);
  assert.equal(r.wire, r2.wire, `${name}: non-deterministic wire`);
  // messageTokens accounting
  assert.equal(r.messageTokens, countTokens(r.decoderPrompt, enc), `${name}: messageTokens mismatch`);
  // identity gate: if mode fast, wire must be literal
  if (r.mode === 'tachys-fast') assert.equal(r.wire, text, `${name}: fast mode wire != text`);
  console.log(`${name} I=${r.inTokens} M=${r.messageTokens} ms=${r.encodeMs.toFixed(0)} mode=${r.mode}`);
  ok++;
}
try {
  check('empty', '');
  check('short', 'hello world');
  check('frames', 'A'.repeat(800)+'B'.repeat(600));
  check('unicode', 'Aufbewahrung 🧪 café — naïve façade\n'.repeat(20));
  for (const f of ['gh-api.json.txt','gh-prose.txt','json-pkg.txt','license.txt','code-ts.txt']) {
    const p = path.join('bench/holdout', f);
    if (fs.existsSync(p)) check(f, fs.readFileSync(p,'utf8'));
  }
  for (const f of ['pl-kb.txt','ru-kb.txt']) {
    const p = path.join('bench/holdout-lang', f);
    if (fs.existsSync(p)) check(f, fs.readFileSync(p,'utf8'));
  }
  console.log(`PASS ${ok}/${ok+fail} tachys exact, deterministic, identity-gated`);
} catch (e) {
  console.error('FAIL', e);
  process.exit(1);
}
