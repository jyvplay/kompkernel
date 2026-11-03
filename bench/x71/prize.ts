/**
 * Prize measurement: what would the table folds give on an ALIGNED listing if
 * the interior-space restriction were lifted? We render the columns as a
 * delimited table (same cells, same order), let HYLE price it, and add a
 * plausible alignment contract. Nothing is claimed here; this is a ceiling.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { hyleEncode } from '../../src/lib/omega/hyle';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const SEP = '¦';
const ALIGN_CONTRACT = 'Rows below are cells join by SEP; restore each row by placing every cell at its column start and padding with spaces.';

function delimit(text: string) {
  const lines = text.split('\n');
  const cells = lines.map((l) => (l.trim() ? l.trim().split(/ +/) : ['']));
  // widen columns so multi-word cells stay together: rebuild by known widths
  return lines;
}

/** Split an aligned block into columns using the character columns where a space
 *  run of width >= 2 begins, computed over the whole block. This is what a
 *  human sees as "columns". */
function cols(lines: string[]) {
  const starts: number[] = [];
  for (const l of lines) {
    for (let i = 0; i < l.length; i++) {
      if (l[i] === ' ' && (i === 0 || l[i - 1] !== ' ') && (l[i + 1] === ' ')) {
        // candidate boundary: first space of a run
        if (!starts.length || i > starts[starts.length - 1] + 1) starts.push(i);
        else starts[starts.length - 1] = Math.min(starts[starts.length - 1], i);
      }
    }
  }
  return starts;
}

for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = countTokens(text, enc);
  const t0 = Date.now();
  const f: any = tagstackEncode(text, enc);
  const fms = Date.now() - t0;
  // build a delimited rendering of the whole file, rows = lines, cells = runs of 2+ spaces
  const lines = text.split('\n');
  const dl = lines.map((l) => l.trim().replace(/ {2,}/g, SEP)).join('\n');
  const h: any = hyleEncode(dl, enc, { fast: false, budgetMs: 60000 });
  const total = h.messageTokens + countTokens(ALIGN_CONTRACT, enc);
  console.error(`${p}\n  raw ${raw} | frontier ${f.messageTokens} (${fms}ms) | delimited HYLE ${h.messageTokens} (${h.winner}/${h.arm}) + align ${countTokens(ALIGN_CONTRACT, enc)} = ${total} => ${total < f.messageTokens ? 'WIN ' + (f.messageTokens - total) : 'lose ' + (total - f.messageTokens)}`);
}
