// X53 (X52 task 1b): 100-row SYLLOGISMOS endurance blind sample.
// Source: bench/z48/corpus/airport-codes-300.csv (real data). We take the
// header + rows 101..200 (fresh to this turn) and plan with SYLLOGISMOS.
import * as fs from 'node:fs';
import { syllogismosPlan } from '../../src/lib/omega/syllogismos';
const ENC = 'o200k_base' as const;
fs.mkdirSync('bench/x53/blind3/visible', { recursive: true });
fs.mkdirSync('bench/x53/blind3/hidden', { recursive: true });
fs.mkdirSync('bench/x53/blind3/decode', { recursive: true });
const full = fs.readFileSync('bench/z48/corpus/airport-codes-300.csv', 'utf8');
const lines = full.split('\n');
if (lines[lines.length - 1] === '') lines.pop();
const slice = [lines[0]!, ...lines.slice(101, 201)].join('\n') + '\n';
const p: any = syllogismosPlan(slice, ENC);
if (!p) { console.log('NO PLAN'); process.exit(1); }
fs.writeFileSync('bench/x53/blind3/visible/S1.message', p.contract + '\n' + p.reducedText);
fs.writeFileSync('bench/x53/blind3/hidden/S1.orig', slice);
console.log('S1 ready rows=' + (slice.split('\n').length - 2));
