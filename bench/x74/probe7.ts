import * as fs from 'node:fs';
const p = process.argv[2];
const text = fs.readFileSync(p, 'utf8');
const lines = text.split('\n');
let maxLen = 0; for (const l of lines) if (l.length > maxLen) maxLen = l.length;
const need = Math.ceil(lines.length * 0.9);
const spaceCount = new Int32Array(maxLen + 1);
for (const l of lines) for (let q = 0; q < l.length; q++) if (l.charCodeAt(q) === 32) spaceCount[q]++;
const isBound: boolean[] = new Array(maxLen + 1).fill(false);
for (let q = 1; q < maxLen; q++) {
  const present = spaceCount[q] + (lines.length - lines.filter(l => l.length > q).length);
  if (present < need) continue;
  let left = false, right = false;
  for (const l of lines) { if (l.length > q - 1 && l.charCodeAt(q - 1) !== 32) left = true; if (l.length > q + 1 && l.charCodeAt(q + 1) !== 32) right = true; }
  if (left && right) isBound[q] = true;
}
const bounds: number[] = [0];
for (let q = 1; q < maxLen; q++) { if (!isBound[q]) continue; if (isBound[q - 1]) continue; bounds.push(q); }
bounds.push(maxLen);
console.log('lines', lines.length, 'maxLen', maxLen, 'spans', bounds.length - 1, bounds.slice(0, 30));
// stage 2: reproduce
