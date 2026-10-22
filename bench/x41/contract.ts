import * as fs from 'node:fs';
import { systoleApply, systoleChoose } from '@/lib/omega/systole';
const enc: any = 'o200k_base';
const t = fs.readFileSync(process.env.F!, 'utf8');
const ch = systoleChoose(t, enc);
fs.writeFileSync(process.env.O!, systoleApply(t, ch));
console.log('templates', ch.map((x) => x.digits + ':' + x.shape).join(' '));
