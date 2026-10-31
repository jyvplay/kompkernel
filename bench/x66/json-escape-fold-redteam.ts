import assert from 'node:assert/strict';
import { jsonEscapeFoldContract, jsonEscapeFoldDecode, jsonEscapeFoldDecodeEnvelope,
  jsonEscapeFoldParseEnvelope, jsonEscapeFoldPlan } from '../../src/lib/omega/json-escape-fold';

const escapeChosen = (value: unknown): string => JSON.stringify(value)
  .replace(/[<>=&']/g, (c) => `\\u00${c.charCodeAt(0).toString(16).padStart(2, '0')}`);
const sourceCases = [
  escapeChosen({ a: '<> = & \' all five' }),
  escapeChosen({ a: "literal <>&=' remains", b: '< > &', nested: [{ x: '=' }] }),
  escapeChosen({ quote: '"', slash: '\\', newline: '\n', unicode: 'é', less: '<' }).replace('é', '\\u00e9'),
  escapeChosen({ nested: [{ x: '=' }], outside: 1 }),
  escapeChosen({ private: `${String.fromCharCode(0xe000)} <` }),
];
const upperSource = JSON.stringify({ x: '<' }).replace('<', '\\u003C');
let passed = 0;
for (const source of sourceCases) {
  const plan = jsonEscapeFoldPlan(source);
  assert.ok(plan, 'eligible input produces a plan');
  assert.equal(plan!.exact, true);
  const restored = jsonEscapeFoldDecode(plan!.transformed, plan!.marker);
  assert.equal(restored, source);
  assert.equal(Buffer.compare(Buffer.from(restored, 'utf8'), Buffer.from(source, 'utf8')), 0, 'restored UTF-8 bytes match');
  const message = `${jsonEscapeFoldContract(plan!.marker)}\nPARENT`;
  const parsed = jsonEscapeFoldParseEnvelope(message);
  assert.ok(parsed);
  assert.equal(parsed!.parentMessage, 'PARENT');
  assert.equal(jsonEscapeFoldDecodeEnvelope(message, plan!.transformed), source);
  assert.equal(plan!.transformed.includes(plan!.marker), true);
  passed++;
}
assert.equal(jsonEscapeFoldPlan(upperSource), null, 'uppercase hex escapes are not rewritten');
const everyBmpPua = Array.from({ length: 0xf8ff - 0xe000 + 1 }, (_, i) => String.fromCharCode(0xe000 + i)).join('');
const puaSource = JSON.stringify(`${everyBmpPua}<`).replace('<', '\\u003c');
const supplementaryMarkerPlan = jsonEscapeFoldPlan(puaSource);
assert.ok(supplementaryMarkerPlan, 'supplementary marker is selected if every BMP private-use scalar occurs');
assert.ok(supplementaryMarkerPlan!.marker.codePointAt(0)! > 0xffff);
const supplementaryEnvelope = `${jsonEscapeFoldContract(supplementaryMarkerPlan!.marker)}\nPARENT`;
assert.equal(jsonEscapeFoldDecodeEnvelope(supplementaryEnvelope, supplementaryMarkerPlan!.transformed), puaSource);
assert.equal(jsonEscapeFoldParseEnvelope(supplementaryEnvelope)?.marker, supplementaryMarkerPlan!.marker);
assert.equal(jsonEscapeFoldPlan('{not-json}'), null, 'invalid JSON is refused');
assert.equal(jsonEscapeFoldPlan('{"x":"no eligible escapes"}'), null, 'identity plans are refused');
const marker = String.fromCharCode(0xe000);
const malformed = `${jsonEscapeFoldContract(marker)}\nPARENT`;
assert.equal(jsonEscapeFoldParseEnvelope(malformed.replace('marker=E000 (', 'marker=F900 (')), null, 'header must be exact');
assert.throws(() => jsonEscapeFoldDecode(`x${marker}z`, marker), 'unknown marker target refuses');

console.log(JSON.stringify({ checks: passed + 6, passed: true, description: 'JSON string scan, safe-subset preservation, in-band serialized-envelope inverse, marker collision, invalid/identity refusal, malformed target refusal' }, null, 2));
