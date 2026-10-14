// emit ANAGNORISIS wires for a file list -> JSON (for the independent Python reader)
import fs from 'node:fs';
import { anagnorisisEncode } from '../../src/lib/omega/anagnorisis';
const files = process.argv.slice(2);
const wires: string[] = [], texts: string[] = [], meta: any[] = [];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const r = anagnorisisEncode(t, 'o200k_base');
  wires.push(r.wire); texts.push(t); meta.push({ file: f, applied: r.canonApplied, refs: r.canonRefs, M: r.messageTokens, raw: r.inTokens });
}
fs.writeFileSync(process.env.OUT!, JSON.stringify(wires));
fs.writeFileSync(process.env.OUT!.replace(/\.json$/, '.texts.json'), JSON.stringify(texts));
fs.writeFileSync(process.env.OUT!.replace(/\.json$/, '.meta.json'), JSON.stringify(meta, null, 1));
console.log(`${files.length} wires written; applied=${meta.filter(m => m.applied).length}`);
