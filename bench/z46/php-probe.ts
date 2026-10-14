import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
const enc = 'o200k_base';
// #12 /path/to/Vendor/Pkg/Class.php(123): Vendor\Pkg\Class->method(args)
const FRAME = /^(#\d+ )(\S+?\.php)\((\d+)\): ((?:\\?[A-Za-z_]\w*)+(?:\\[A-Za-z_]\w*)*)(->|::)(.*)$/;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  let frames = 0, derivable = 0, elidedTok = 0;
  const out = t.split('\n').map(l => {
    const m = FRAME.exec(l); if (!m) return l;
    frames++;
    const path = m[2]; const cls = m[4].replace(/^\\/, '');
    const segs = cls.split('\\');
    // longest suffix of path segments equal to a suffix of class segments (+ .php)
    const pseg = path.split('/');
    let k = 0;
    while (k < segs.length && k < pseg.length) {
      const ps = pseg[pseg.length - 1 - k], cs = segs[segs.length - 1 - k] + (k === 0 ? '.php' : '');
      if (ps === cs) k++; else break;
    }
    if (k >= 1) {
      derivable++;
      const kept = pseg.slice(0, pseg.length - k).join('/');
      const elided = pseg.slice(pseg.length - k).join('/');
      elidedTok += countTokens(elided, enc);
      return `${m[1]}${kept}/⟨${k}⟩(${m[3]}): ${m[4]}${m[5]}${m[6]}`;
    }
    return l;
  }).join('\n');
  const t0 = Date.now();
  const d0 = daedalusEncode(t, enc).messageTokens;
  const d1 = daedalusEncode(out, enc).messageTokens;
  console.log(`${f.split('/').pop()}: raw=${countTokens(t, enc)} frames=${frames} derivable=${derivable} elidedTok=${elidedTok} | D=${d0} D(folded)=${d1} Δ=${d1 - d0} (${((d1 - d0) / d0 * 100).toFixed(1)}%) ms=${Date.now() - t0}`);
}
