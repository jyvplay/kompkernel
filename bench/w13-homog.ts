import fs from 'node:fs';
import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

const samples = [
  'src/lib/omega/bpe.ts','https://vite.dev/guide/features.html','@types/node','react-dom',
  'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules',
  'node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/typescript.js',
  '2d32b18c556ffcaf4c23ba3f8aedbe64839f7975','550e8400-e29b-41d4-a716-446655440000',
  '2026-09-30T12:34:56.789Z','192.168.100.254','v1.2.3-beta.4+build.567',
  'ORD-2024-000123','user_12345','sha512-AbC0dEf/GhI+jKl=','packages/core/src/runtime/scheduler.spec.tsx',
];
console.log('sample'.padEnd(74),'raw'.padStart(4),'noPunct'.padStart(8),'sepLetter'.padStart(10),'digitsShift'.padStart(12),'both'.padStart(6));
const DIG = 'ghijklmnop';
function shiftDigits(s:string){ return s.replace(/[0-9]/g, d=>DIG[+d]); }
function sepToLetter(s:string){ return s.replace(/[^A-Za-z0-9]/g, '' ); }
let R=0,A=0,B=0,C=0,D=0;
for (const s of samples) {
  const raw=T(s), np=T(sepToLetter(s)), sl=T(s.replace(/[/\\.@:+\-_]/g,'q')), ds=T(shiftDigits(s)), both=T(shiftDigits(s.replace(/[/\\.@:+\-_]/g,'q')));
  R+=raw;A+=np;B+=sl;C+=ds;D+=both;
  console.log(s.slice(0,74).padEnd(74), String(raw).padStart(4), String(np).padStart(8), String(sl).padStart(10), String(ds).padStart(12), String(both).padStart(6));
}
console.log('TOTAL'.padEnd(74), String(R).padStart(4), String(A).padStart(8), String(B).padStart(10), String(C).padStart(12), String(D).padStart(6));

// corpus-wide potential
const corpus = ['bench/holdout','bench/train'].flatMap(d=>fs.readdirSync(d).map(f=>fs.readFileSync(path.join(d,f),'utf8'))).join('\n');
const comps = corpus.match(/[A-Za-z0-9]+(?:[-._/@:][A-Za-z0-9]+)+/g) ?? [];
let cr=0, cb=0, cl=0;
for (const c of comps) { cr+=T(c); cb+=T(shiftDigits(c.replace(/[/\\.@:+\-_]/g,'q'))); cl+=T(c.replace(/[/\\.@:+\-_]/g,'q')); }
console.log(`\ncorpus compounds: ${comps.length} occurrences`);
console.log(`raw=${cr}  sep->letter=${cl} (${((cr-cl)/cr*100).toFixed(1)}%)  sep->letter+digitshift=${cb} (${((cr-cb)/cr*100).toFixed(1)}%)`);

// how much of total corpus is this?
console.log(`corpus total tokens = ${T(corpus)}; compounds are ${(cr/T(corpus)*100).toFixed(1)}% of them`);

// separator-letter optimisation: which letter is cheapest as a separator?
console.log('\n=== best separator letter ===');
const sample2 = comps.slice(0, 1500);
const scores: Array<[string,number]> = [];
for (const ch of 'abcdefghijklmnopqrstuvwxyzQXZJVKW') {
  let t=0; for (const c of sample2) t += T(shiftDigits(c.replace(/[/\\.@:+\-_]/g, ch)));
  scores.push([ch,t]);
}
scores.sort((a,b)=>a[1]-b[1]);
const base = sample2.reduce((s,c)=>s+T(c),0);
console.log('baseline', base, 'best:', scores.slice(0,8).map(([c,t])=>`${c}:${t}`).join(' '));
