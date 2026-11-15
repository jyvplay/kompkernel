import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc='o200k_base' as const;const T=(s:string)=>countTokens(s,enc);
const files=['bench/holdout/code-ts.txt','bench/holdout/json-pkg.txt','bench/holdout-x41/node-help.txt','bench/holdout-work/llm-answer.md','bench/holdout-work/kb-article.txt','bench/holdout-work/email-thread.txt','bench/holdout-x41/apt-real.txt','bench/holdout-x41/ps-aux-real.txt'];
for(const p of files){const t=fs.readFileSync(p,'utf8');const ids=[...t.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)].map(m=>m[0]);
 const camel=ids.filter(w=>/^[a-z][a-z0-9]*[A-Z]/.test(w)&&!w.includes('_'));
 const snake=ids.filter(w=>/^[a-z][a-z0-9]*_[a-z0-9_]+$/.test(w));
 const upper=ids.filter(w=>/^[A-Z][A-Z0-9_]+$/.test(w)&&w.includes('_'));
 const pascal=ids.filter(w=>/^[A-Z][a-z0-9]+[A-Z]/.test(w)&&!w.includes('_'));
 const split=(w:string)=>w.replace(/([a-z0-9])([A-Z])/g,'$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g,'$1_$2').toLowerCase();
 const body=t.replace(/[A-Za-z_$][A-Za-z0-9_$]*/g,w=>camel.includes(w)?split(w):w);
 console.log(p.split('/').pop(), 'raw',T(t),'camel',camel.length,'snake',snake.length,'upper',upper.length,'pascal',pascal.length,'snakeBody',T(body),'delta',T(body)-T(t));
 console.log(' camel sample',camel.slice(0,12).join(' '));console.log(' snake sample',snake.slice(0,12).join(' '));
}
