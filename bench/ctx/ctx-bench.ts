// CTXCOPY (unique anchors) vs LAKONIKOS (no context) vs `diff -u` on real PyPI revision pairs.
// usage: ctx-bench.mjs <part> <parts> <mode: pairs|control>
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { countTokens } from '../../src/lib/omega/bpe';
import { ctxEncode, ctxDecode, CTX_CONTRACT } from '../../src/lib/omega/ctxcopy';
import { lakonikosEncode } from '../../src/lib/omega/lakonikos';

const manifest: any[] = JSON.parse(fs.readFileSync('bench/ctx/pairs-manifest.json', 'utf8'));
const sorted = [...manifest].sort((x, y) => x.lineRatio - y.lineRatio);
const step = Math.max(1, Math.floor(sorted.length / 81));
const sample = sorted.filter((_, i) => i % step === 0).slice(0, 81);
const [part, parts, mode] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4] ?? 'pairs'];
const base = 'bench/tmp/ctx-pairs/';
const enc = 'o200k_base';

function diffTokens(oldPath: string, newPath: string): number {
  let out = '';
  try { out = execFileSync('diff', ['-u', oldPath, newPath], { encoding: 'utf8', maxBuffer: 1 << 26 }); }
  catch (e: any) { out = e.stdout ?? ''; }
  return countTokens(out, enc);
}

const items: Array<{ key: string; C: string; T: string; Cpath: string; Tpath: string; ratio: number | null; control: boolean }> = [];
if (mode === 'pairs') {
  for (const m of sample) {
    const name = `${m.pkg}__${m.file.replace(/\//g, '__')}`;
    items.push({ key: name, C: fs.readFileSync(base + name + '.old', 'utf8'), T: fs.readFileSync(base + name + '.new', 'utf8'),
      Cpath: base + name + '.old', Tpath: base + name + '.new', ratio: m.lineRatio, control: false });
  }
} else {
  // control: new text from pair i, earlier text from a pair of a different package
  for (let i = 0; i < sample.length; i++) {
    const a = sample[i], b = sample[(i + 7) % sample.length];
    if (a.pkg === b.pkg) continue;
    const na = `${a.pkg}__${a.file.replace(/\//g, '__')}`, nb = `${b.pkg}__${b.file.replace(/\//g, '__')}`;
    items.push({ key: `${na} <- ${nb}`, C: fs.readFileSync(base + nb + '.old', 'utf8'), T: fs.readFileSync(base + na + '.new', 'utf8'),
      Cpath: base + nb + '.old', Tpath: base + na + '.new', ratio: null, control: true });
  }
}

for (let i = 0; i < items.length; i++) {
  if (i % parts !== part) continue;
  const it = items[i];
  const t0 = Date.now();
  const raw = countTokens(it.T, enc);
  const lak = lakonikosEncode(it.T, enc);
  const c = ctxEncode(it.T, it.C, { unique: true });
  const ctxMsg = c && c.copies > 0 ? countTokens(CTX_CONTRACT + '\n' + c.wire, enc) : null;
  const diffTok = diffTokens(it.Cpath, it.Tpath);
  const chosen = ctxMsg !== null && ctxMsg < lak.messageTokens ? 'ctx' : 'lakonikos';
  console.log(JSON.stringify({ key: it.key, control: it.control, lineRatio: it.ratio, raw,
    lakonikosMsg: lak.messageTokens, lakExact: lak.decoded === it.T, lakMode: lak.mode,
    ctxMsg, copies: c?.copies ?? 0, copiedFrac: c ? +(c.copiedChars / it.T.length).toFixed(4) : 0,
    ctxExact: c ? ctxDecode(c.wire, it.C) === it.T : null, diffUTok: diffTok,
    chosenMsg: chosen === 'ctx' ? ctxMsg : lak.messageTokens, chosen, ms: Date.now() - t0 }));
}
