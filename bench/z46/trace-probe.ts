// Z46 probe: Java stack frames — is the (File.java:N) name entailed by the class, and what does DAEDALUS pay for it?
import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
const enc = 'o200k_base';
const FRAME = /^(\s*at\s+)([\w$.<>\/\[\]\-]+)\.([\w$<>]+)\((\w[\w$\-]*)\.(java|kt|scala|groovy):(\d+)\)\s*$/;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const lines = t.split('\n');
  let frames = 0, derivable = 0, fileTok = 0;
  const out = lines.map(l => {
    const m = FRAME.exec(l);
    if (!m) return l;
    frames++;
    const cls = m[2].split('.').pop()!.split('/').pop()!;           // simple (possibly Inner$Outer) class name
    const outer = cls.split('$')[0];
    if (m[4] === outer) {
      derivable++;
      fileTok += countTokens(m[4] + '.' + m[5], enc);
      return `${m[1]}${m[2]}.${m[3]}(:${m[6]})`;
    }
    return l;
  }).join('\n');
  const t0 = Date.now();
  const d0 = daedalusEncode(t, enc).messageTokens;
  const d1 = daedalusEncode(out, enc).messageTokens;
  console.log(`${f.split('/').pop()}: raw=${countTokens(t, enc)} frames=${frames} derivable=${derivable} fileNameTok=${fileTok} | D=${d0} D(folded)=${d1} Δ=${d1 - d0} (${((d1 - d0) / d0 * 100).toFixed(1)}%) ms=${Date.now() - t0}`);
}
