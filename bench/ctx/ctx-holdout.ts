// Held-out check of the coverage rule (tau = 0.5, fixed before this run) on the pairs NOT in the 81-pair sample,
// plus unrelated-control pairs. LAKONIKOS is run only where the rule selects it (coverage < tau).
import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { ctxEncode, ctxDecode, CTX_CONTRACT } from '../../src/lib/omega/ctxcopy';
import { lakonikosEncode } from '../../src/lib/omega/lakonikos';
const TAU = 0.5;
const enc = 'o200k_base';
const base = 'bench/tmp/ctx-pairs/';
const manifest: any[] = JSON.parse(fs.readFileSync('bench/ctx/pairs-manifest.json', 'utf8'));
const sorted = [...manifest].sort((x, y) => x.lineRatio - y.lineRatio);
const step = Math.max(1, Math.floor(sorted.length / 81));
const sampleSet = new Set(sorted.filter((_, i) => i % step === 0).slice(0, 81).map(m => `${m.pkg}__${m.file.replace(/\//g, '__')}`));
const mode = process.argv[2];
const out: any[] = [];
if (mode === 'holdout') {
  for (const m of manifest) {
    const name = `${m.pkg}__${m.file.replace(/\//g, '__')}`;
    if (sampleSet.has(name)) continue;
    const C = fs.readFileSync(base + name + '.old', 'utf8');
    const T = fs.readFileSync(base + name + '.new', 'utf8');
    const raw = countTokens(T, enc);
    const c = ctxEncode(T, C, { unique: true });
    const cov = c ? c.copiedChars / T.length : 0;
    const ctxMsg = c && c.copies > 0 ? countTokens(CTX_CONTRACT + '\n' + c.wire, enc) : null;
    const useCtx = ctxMsg !== null && cov >= TAU;
    let lakMsg: number | null = null;
    if (!useCtx) lakMsg = lakonikosEncode(T, enc).messageTokens;
    out.push({ key: name, control: false, lineRatio: m.lineRatio, raw, cov: +cov.toFixed(4), ctxMsg, ctxExact: c ? ctxDecode(c.wire, C) === T : null,
      lakMsg, chosen: useCtx ? 'ctx' : 'lakonikos', chosenMsg: useCtx ? ctxMsg : lakMsg });
    console.log(JSON.stringify(out[out.length - 1]));
  }
} else {
  // controls: earlier text from one package, new text from another
  const ps = sorted.filter((_, i) => i % 3 === 0);
  for (let i = 0; i < ps.length; i++) {
    const a = ps[i], b = ps[(i + 11) % ps.length];
    if (a.pkg === b.pkg) continue;
    const na = `${a.pkg}__${a.file.replace(/\//g, '__')}`, nb = `${b.pkg}__${b.file.replace(/\//g, '__')}`;
    const C = fs.readFileSync(base + nb + '.old', 'utf8');
    const T = fs.readFileSync(base + na + '.new', 'utf8');
    const raw = countTokens(T, enc);
    const c = ctxEncode(T, C, { unique: true });
    const cov = c ? c.copiedChars / T.length : 0;
    const ctxMsg = c && c.copies > 0 ? countTokens(CTX_CONTRACT + '\n' + c.wire, enc) : null;
    const useCtx = ctxMsg !== null && cov >= TAU;
    let lakMsg: number | null = null;
    if (!useCtx) lakMsg = lakonikosEncode(T, enc).messageTokens;
    const row = { key: `${na} <- ${nb}`, control: true, raw, cov: +cov.toFixed(4), ctxMsg, ctxExact: c ? ctxDecode(c.wire, C) === T : null,
      lakMsg, chosen: useCtx ? 'ctx' : 'lakonikos', chosenMsg: useCtx ? ctxMsg : lakMsg };
    out.push(row); console.log(JSON.stringify(row));
  }
}
