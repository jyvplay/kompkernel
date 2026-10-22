import fs from 'node:fs';
const ID_RE=/(?<![0-9a-zA-Z])([0-9a-f]{2,}(?:[-_][0-9a-f]{2,})+)(?![0-9a-zA-Z])/g;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const byPat=new Map<string,string[]>();
  ID_RE.lastIndex=0; let m:RegExpExecArray|null;
  while((m=ID_RE.exec(t))){
    const segs=m[1].split(/[-_]/); const p=segs.map(s=>s.length).join('-');
    if(!byPat.has(p))byPat.set(p,[]); (byPat.get(p) as string[]).push(m[1]);
  }
  console.log('===',f.split('/').pop());
  for(const [p,arr] of [...byPat.entries()].sort((a,b)=>b[1].length-a[1].length).slice(0,4)){
    const hexish=arr.filter(x=>/[a-f]/.test(x)).length;
    console.log(`  ${p.padEnd(12)} n=${String(arr.length).padStart(3)} hexish=${String(hexish).padStart(3)}`,
      'ex:',arr.slice(0,3).map(x=>JSON.stringify(x)).join(' '));
  }
}
