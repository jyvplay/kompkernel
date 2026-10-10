import fs from 'node:fs'; import { countTokens } from '../src/lib/omega/bpe';
const T=(s:string)=>countTokens(s,'o200k_base');
const src=fs.readFileSync('bench/tmp/readable.src','utf8'), w=fs.readFileSync('bench/tmp/readable.wire','utf8');
const c='Above ⇒: symbol + pattern. Below: symbol + chars fill its # marks in order. Print restored text. A pattern with no symbol applies to every digit run of that many digits.';
console.log('source',T(src),'wire',T(w),'contract',T(c),'one-chat',T(w)+T(c));
