// X14 debug: first matches of the HEMERA literal scan on openstack (not a deliverable).
import fs from 'node:fs';
import { daysFromCivil, validDate } from '@/lib/omega/hemera';
const text = fs.readFileSync('bench/holdout-ops/openstack-loghub-26.log', 'utf8');
const TIME = '(?:([ T])(\\d{2}):(\\d{2}):(\\d{2})(\\.\\d{3}(?!\\d))?)?';
const SCAN = new RegExp(`(?<!\\d)(\\d{4})-(\\d{2})-(\\d{2})${TIME}(?!\\d)`, 'g');
let n = 0;
for (const m of text.matchAll(SCAN)) {
  if (n++ >= 4) break;
  const [whole, y, mo, d, sep, hh, mi, ss, frac] = m;
  console.log(JSON.stringify({ whole, y, mo, d, sep, hh, mi, ss, frac, valid: validDate(+y, +mo, +d), z: daysFromCivil(+y, +mo, +d) }));
}
console.log(JSON.stringify({ totalMatches: [...text.matchAll(SCAN)].length }));
