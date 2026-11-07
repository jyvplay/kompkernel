import * as fs from 'node:fs';
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const L = S.split('\n');
  const geo = L.map((l) => { const a: number[] = []; const re = / {2,}/g; let m: RegExpExecArray|null;
    while ((m = re.exec(l)) !== null) a.push(m.index + m[0].length); return a; });
  const k = Math.max(...geo.map((a) => a.length));
  const full = geo.map((a,i)=>a.length===k?i:-1).filter(i=>i>=0);
  const P: number[] = [];
  for (let j=0;j<k;j++){ const c=new Map<number,number>(); for(const i of full)c.set(geo[i][j],(c.get(geo[i][j])??0)+1);
    let b=0,v=0; for(const [x,n] of c) if(n>v){b=x;v=n;} P.push(b); }
  // content of each column for fully-aligned lines, measured in the ORIGINAL string
  const cells: string[][] = [];
  for (const i of full) {
    const l = L[i]; const c: string[] = []; let prev = 0;
    for (let j = 0; j < k; j++) { c.push(l.slice(prev, P[j])); prev = P[j]; }
    c.push(l.slice(prev)); cells.push(c);
  }
  const maxLen: number[] = [];
  for (let j = 0; j <= k; j++) maxLen[j] = Math.max(...cells.map((c) => c[j].replace(/\s+$/,'').length));
  // candidate rules
  const tryRule = (name: string, f: (j: number) => number) => {
    const w: number[] = []; for (let j = 0; j < k; j++) w[j] = f(j);
    const offs: number[] = []; let acc = 0; for (const x of w) { acc += x; offs.push(acc); }
    let ok = 0, tot = 0;
    for (const i of full) { const l = L[i]; tot++;
      const c: string[] = []; let prev = 0;
      for (let j = 0; j < k; j++) { c.push(l.slice(prev, P[j]).replace(/\s+$/,'')); prev = P[j]; }
      c.push(l.slice(prev));
      let out = ''; for (let j = 0; j <= k; j++) out += j < k ? c[j].padEnd(w[j], ' ') : c[j];
      if (out === l) ok++;
    }
    console.log(`   ${name.padEnd(24)} ${ok}/${tot} exact   widths=${w.join(' ')}`);
  };
  console.log(`${p.split('/').pop()} k=${k} P=${P.join(' ')} maxContent=${maxLen.join(' ')}`);
  tryRule('max+1', (j) => maxLen[j] + 1);
  tryRule('max+2', (j) => maxLen[j] + 2);
  tryRule('observed P (truth)', (j) => P[j] - (j === 0 ? 0 : P[j-1]));
}
