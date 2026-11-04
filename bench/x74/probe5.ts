import * as fs from 'node:fs';
function fill(par: string, W: number): string[] {
  const words = par.split(/\s+/).filter(Boolean);
  const out: string[] = []; let line = '';
  for (const w of words) {
    if (!line) line = w;
    else if (line.length + 1 + w.length <= W) line += ' ' + w;
    else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out;
}
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const body = t.endsWith('\n') ? t.slice(0,-1) : t;
  const paras = body.split(/\n{2,}/);
  console.log('==== ' + p);
  paras.forEach((par, i) => {
    const lens = par.split('\n').map(l => l.length);
    let ok: number[] = [];
    for (let W = 20; W <= 200; W++) if (fill(par, W).join('\n') === par) ok.push(W);
    if (ok.length === 0) {
      // nearest: the W minimising mismatched lines
      let best = {W:0,bad:1e9};
      for (let W = 20; W <= 200; W++) {
        const f = fill(par, W), s = par.split('\n');
        let bad = Math.abs(f.length - s.length);
        for (let k = 0; k < Math.min(f.length, s.length); k++) if (f[k] !== s[k]) bad++;
        if (bad < best.bad) best = { W, bad };
      }
      console.log(`  para ${i} lines ${lens.length} lens ${lens.join(',')} -> NONE, closest W=${best.W} badLines=${best.bad}`);
    } else {
      console.log(`  para ${i} lines ${lens.length} lens ${lens.join(',')} -> W in [${ok[0]}..${ok[ok.length-1]}] (${ok.length})`);
    }
  });
}
