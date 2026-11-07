import * as fs from 'node:fs';
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const L = S.split('\n');
  // For each line: positions where runs of >=2 spaces start, and the resulting next-field offset
  const rows: number[][] = [];   // per line: list of next-field start offsets
  for (const l of L) {
    const a: number[] = []; const re = / {2,}/g; let m: RegExpExecArray | null;
    while ((m = re.exec(l)) !== null) a.push(m.index + m[0].length);
    rows.push(a);
  }
  const k = Math.max(...rows.map((a) => a.length));
  const qual = rows.filter((a) => a.length === k);
  console.log(`${p.split('/').pop()!.padEnd(22)} lines ${String(L.length).padStart(4)} seps ${k} uniform ${String(qual.length).padStart(4)}`);
  if (k < 1) continue;
  for (let j = 0; j < k; j++) {
    const cnt = new Map<number, number>();
    for (const a of qual) cnt.set(a[j], (cnt.get(a[j]) ?? 0) + 1);
    const top = [...cnt.entries()].sort((x, y) => y[1] - x[1]);
    const allSame = top.length === 1;
    console.log(`   sep${j} nextFieldStart: ${top.slice(0, 3).map(([o, n]) => `${o}×${n}`).join(' ')}${allSame ? '  <== ALIGNED' : ''}`);
  }
}
