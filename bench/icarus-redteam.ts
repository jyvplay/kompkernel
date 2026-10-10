import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { icarusEncode } from '../src/lib/omega/icarus';
import { chironDecode } from '../src/lib/omega/chiron';
import { countTokens } from '../src/lib/omega/bpe';

const cases: Array<[string, string]> = [
  ['empty', ''], ['short', 'ordinary English prose'],
  ['frames', '𓂀§↵↦× repeated 𓂀§↵↦× repeated'],
  ['unicode', '😀 e\u0301 é العربية עברית 中文\r\n\u0000'],
];
for (const f of ['gh-api.json.txt', 'gh-prose.txt', 'json-pkg.txt', 'license.txt', 'code-ts.txt']) {
  const p = path.join('bench/holdout', f);
  if (fs.existsSync(p)) cases.push([f, fs.readFileSync(p, 'utf8')]);
}
let framed = 0; let totalMs = 0;
for (const [name, text] of cases) {
  const a = icarusEncode(text); const b = icarusEncode(text);
  assert.equal(a.decoded, text, `${name}: internal round trip`);
  assert.equal(chironDecode(a.wire), text, `${name}: shared reader`);
  assert.equal(a.wire, b.wire, `${name}: deterministic wire`);
  assert.equal(a.messageTokens, countTokens(a.decoderPrompt, 'o200k_base'), `${name}: accounting`);
  assert.ok(a.messageTokens <= a.inTokens || a.mode === 'forced-wrap', `${name}: identity gate`);
  if (a.mode === 'ariadne') framed++;
  totalMs += a.ms;
  console.log(`${name.padEnd(20)} I=${a.inTokens} M=${a.messageTokens} ms=${a.ms} route=${a.route} mode=${a.mode}`);
}
console.log(`PASS ${cases.length}/${cases.length} exact, deterministic, accounted, identity-gated; framed=${framed}; encoder-ms=${totalMs}`);
