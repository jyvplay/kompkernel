/**
 * X47 screen 2 — WHY IS git-numstat ONLY 2.4x?
 *
 * The ops lanes compress between 2.4x and 6.2x: vix 3412->550 is 6.2x, openstack
 * 4028->894 is 4.5x, find-listing 3997->1218 is 3.3x, ls-full-iso 1175->364 is
 * 3.2x, and git-numstat 4632->1906 is 2.4x, the weakest in the suite by a wide
 * margin. It is also one of the largest, so the tokens left on the table there are
 * worth more than anywhere else, and the user's standing priority is general gains
 * on everyday prose and ops.
 *
 * This does not encode anything. It classifies the SOURCE by line role and prices
 * each class with the live tokenizer, so the 1,906 tokens can be attributed to a
 * structure before any mechanism is proposed. Guessing at a mechanism first is what
 * produced X42's APOCOPE, which priced 756 raw tokens on vix and delivered zero.
 */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const lines = t.split('\n');
  console.log(`\n=== ${nm}  (${t.length} chars, ${lines.length} lines, ${countTokens(t, enc)} raw tokens)`);

  const role = (l: string): string => {
    if (/^commit [0-9a-f]{40}$/.test(l)) return 'commit-hash';
    if (/^Author: /.test(l)) return 'author';
    if (/^Date:\s/.test(l)) return 'date';
    if (/^\s*$/.test(l)) return 'blank';
    if (/^ {4}\S/.test(l)) return 'indented-msg';
    if (/^\s*-\s/.test(l) || /^\s*\d+\.\s/.test(l)) return 'indented-list';
    if (/^-{3}\s/.test(l) || /^\d+\t\d+\t/.test(l)) return 'numstat-or-sep';
    return 'other';
  };

  const byRole = new Map<string, { n: number; chars: number; text: string }>();
  for (const l of lines) {
    const r = role(l);
    const e = byRole.get(r) ?? { n: 0, chars: 0, text: '' };
    e.n++; e.chars += l.length + 1; e.text += l + '\n';
    byRole.set(r, e);
  }
  console.log('  role'.padEnd(22) + 'lines'.padStart(7) + 'chars'.padStart(8) + 'tokens'.padStart(8) + 'c/tok'.padStart(7) + '% of tokens'.padStart(12));
  const total = countTokens(t, enc);
  let sum = 0;
  for (const [r, e] of [...byRole.entries()].sort((a, b) => countTokens(b[1].text, enc) - countTokens(a[1].text, enc))) {
    const tk = countTokens(e.text, enc); sum += tk;
    console.log('  ' + r.padEnd(20) + String(e.n).padStart(7) + String(e.chars).padStart(8) + String(tk).padStart(8) +
      (e.chars / Math.max(tk, 1)).toFixed(2).padStart(7) + (100 * tk / total).toFixed(1).padStart(11) + '%');
  }
  console.log('  ' + 'SUM of parts'.padEnd(20) + ''.padStart(7) + ''.padStart(8) + String(sum).padStart(8) + ''.padStart(7) + (100 * sum / total).toFixed(1).padStart(11) + '%  (>100% = newlines double-counted per role)');

  // the numstat rows specifically: how much redundancy is in the two counters?
  const rows = lines.filter((l) => /^\d+\t\d+\t/.test(l) || /^-\t-\t/.test(l));
  if (rows.length) {
    const adds = rows.map((l) => l.split('\t')[0]);
    const dels = rows.map((l) => l.split('\t')[1]);
    const paths = rows.map((l) => l.split('\t').slice(2).join('\t'));
    const uniqAdd = new Set(adds).size, uniqDel = new Set(dels).size, uniqPath = new Set(paths).size;
    console.log(`\n  numstat rows: ${rows.length} of ${lines.length} lines`);
    console.log(`    adds : ${uniqAdd} distinct of ${adds.length}   tokens ${countTokens(adds.join('\t'), enc)}   most common: ${[...adds.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([v, n]) => `${v}x${n}`).join(' ')}`);
    console.log(`    dels : ${uniqDel} distinct of ${dels.length}   tokens ${countTokens(dels.join('\t'), enc)}   most common: ${[...dels.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([v, n]) => `${v}x${n}`).join(' ')}`);
    console.log(`    paths: ${uniqPath} distinct of ${paths.length}  tokens ${countTokens(paths.join('\n'), enc)}`);
    // path directory structure
    const dirs = paths.map((q) => q.split('/').slice(0, -1).join('/'));
    const uniqDir = new Set(dirs).size;
    const dirCounts = dirs.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map<string, number>());
    console.log(`    dirs : ${uniqDir} distinct of ${dirs.length}  top: ${[...dirCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([v, n]) => `${JSON.stringify(v)}x${n}`).join(' ')}`);
    // the log-message portion
    const msgLines = lines.filter((l) => /^ {4}\S/.test(l));
    console.log(`    indented message lines: ${msgLines.length}, tokens ${countTokens(msgLines.join('\n'), enc)}`);
    const hashes = lines.filter((l) => /^commit [0-9a-f]{40}$/.test(l));
    console.log(`    commit hashes: ${hashes.length}, tokens ${countTokens(hashes.join('\n'), enc)} for ${hashes.length * 47} chars`);
  }
}
