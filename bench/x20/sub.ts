/**
 * X20: print the *intermediate* text the reader must build before the arithmetic arms
 * run — i.e. the DAEDALUS decode of the shipped message's wire, with the marker left
 * in place. Used as a transcription aid for the hand read-backs: it shows what a model
 * gets after rule expansion but before the progression/clock rules, and it is NOT the
 * answer (the answer still needs the marker arithmetic).
 *
 * usage: bench/x20/run.sh bench/x20/sub.ts <lane>
 */
import { readFileSync } from 'fs';
import { daedalusDecode } from '@/lib/omega/daedalus';

const lane = process.argv[2];
const msg = readFileSync(`bench/x20/llm/${lane}.msg.txt`, 'utf8');
const start = msg.indexOf('§');
const wire = msg.slice(start, msg.lastIndexOf('\n'));
const sub = daedalusDecode(wire);
console.log(`substituted bytes ${Buffer.byteLength(sub)} / orig ${readFileSync(`bench/x20/llm/${lane}.orig.txt`).length}`);
console.log('---8<---');
console.log(sub);
console.log('---8<---');
