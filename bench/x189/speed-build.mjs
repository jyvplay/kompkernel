import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/bpe-fast.ts','utf8');
const old=`  re.lastIndex = 0;
  const ms = text.match(re);
  if (ms === null) return null;
  let covered = 0;
  for (let i = 0; i < ms.length; i++) covered += ms[i].length;
  if (covered !== text.length) return null;
  let n = 0;
  for (let i = 0; i < ms.length; i++) n += fastChunkCount(ms[i]);
  return n;`;
const replacement=`  // Reuse the first match and stream the rest; no match-array materialization.
  let match = one, covered = 0, n = 0;
  while (match !== null) {
    if (match.index !== covered || match[0].length === 0) return null;
    covered += match[0].length;
    n += fastChunkCount(match[0]);
    match = re.exec(text);
  }
  return covered === text.length ? n : null;`;
if(original.split(old).length!==2)throw Error('anchor');
for(const arm of ['A','B'])for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts'],['vector','bench/x164/speed-unit.ts'],['merge','bench/x182/merge-attack.ts'],['threshold','bench/x185/threshold-attack.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x189/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'stream-regex',setup(b){b.onLoad({filter:/[\\/]bpe-fast\.ts$/},()=>({contents:original.replace(old,replacement),loader:'ts'}));}}]});
fs.writeFileSync('bench/x189/receipts/speed-patch.json',JSON.stringify({production:false,old,replacement,hypothesis:'Avoid repeated first regex match and whole match array on multi-chunk strings. Exact regex, vocabulary, and merge semantics unchanged.'},null,2));
