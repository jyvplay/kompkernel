import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { jsonEscapeFoldContract, jsonEscapeFoldPlan } from '../../src/lib/omega/json-escape-fold';

const sourcePath = 'bench/z45/canon/spdx/MIT.json';
const source = fs.readFileSync(sourcePath, 'utf8');
const plan = jsonEscapeFoldPlan(source);
if (!plan) throw new Error('MIT fixture did not produce a JSON-ESCAPE-FOLD plan');
const vector = {
  sourcePath,
  sourceSha256: crypto.createHash('sha256').update(source, 'utf8').digest('hex'),
  header: jsonEscapeFoldContract(plan.marker),
  transformed: plan.transformed,
  markerCodePoint: plan.marker.codePointAt(0),
  replacements: plan.replacements,
};
const output = 'bench/x66/receipts/python-twin-vector.json';
fs.mkdirSync('bench/x66/receipts', { recursive: true });
fs.writeFileSync(output, JSON.stringify(vector, null, 2) + '\n');
console.log(JSON.stringify({ output, sourcePath, sourceSha256: vector.sourceSha256, markerCodePoint: vector.markerCodePoint, replacements: vector.replacements }, null, 2));
