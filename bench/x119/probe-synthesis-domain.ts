/** Cheap domain census: where can ΣΥΝΘΕΣΙΣ reach its inner encoder at all? */
import * as fs from 'node:fs';
import { enallageRewrite } from '../../src/lib/omega/enallage';
import { mekosRewrite } from '../../src/lib/omega/mekos';
const lanes=fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
const rows=[];
for(const p of lanes){const text=fs.readFileSync(p,'utf8');const mode=enallageRewrite(text);const measure=mode?mekosRewrite(mode.wire):null;rows.push({path:p,mode:!!mode,measure:!!measure,both:!!mode&&!!measure});}
fs.writeFileSync('bench/x119/receipts/synthesis-domain.json',JSON.stringify({rows,both:rows.filter(r=>r.both).map(r=>r.path)},null,2)+'\n');
console.log(rows.filter(r=>r.mode||r.measure).map(r=>`${r.path.split('/').pop()} mode=${r.mode} measure=${r.measure}`).join('\n'));
console.log('BOTH',rows.filter(r=>r.both).map(r=>r.path));
