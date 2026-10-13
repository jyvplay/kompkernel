// Gate statistic (text-only, no trial encoding): fraction of characters elided at minKeep=14.
import fs from 'node:fs';
import { elideEncode } from './prefix-elide';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const e = elideEncode(t, 14);
  const lines = t.split('\n');
  const elided = e.split('\n').filter(l => /^⇡[1-9]/.test(l)).length;
  // saved characters = original length - encoded length (marker counted)
  const saved = (t.length - e.length) / Math.max(1, t.length);
  console.log(JSON.stringify({ file: f, lines: lines.length, elidedLines: elided, elidedLineFrac: +(elided / lines.length).toFixed(3), charSavedFrac: +saved.toFixed(4) }));
}
