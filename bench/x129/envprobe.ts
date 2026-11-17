import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc:any='o200k_base';
const p=process.env.LANE!;
const text=fs.readFileSync(p,'utf8');
const a:any=tagstackFrontier(text,enc);
console.log(`  ${(process.env.CFG??'?').padEnd(4)} ${p.split('/').pop()!.padEnd(20)} M=${String(a.messageTokens).padStart(4)} exact=${a.decoded===text}`);
