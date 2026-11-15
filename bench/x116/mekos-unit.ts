/** X116 ΜΗΚΟΣ unit probes: measure entailment, ambiguity guard, independent
 * decoder, Unicode byte length, composition with ENALLAGE. No frontier calls. */
import assert from 'node:assert/strict';
import { countTokens } from '../../src/lib/omega/bpe';
import { mekosRewrite, mekosExpand, MEKOS_KEY, MEKOS_MARK } from '../../src/lib/omega/mekos';
import { enallageRewrite, enallageExpand } from '../../src/lib/omega/enallage';
import { tagstackDecode } from '../../src/lib/omega/tagstack';

const enc = 'o200k_base' as const;
let passed = 0;
function ok(name: string, fn: () => void) { fn(); passed++; console.log(`PASS ${name}`); }

function independentExpand(s: string): string {
  return s.split('\n').map(line => {
    const a = line.indexOf(' -> ');
    if (a < 0) return line;
    const target = line.slice(a + 4);
    const prefix = line.slice(0, a);
    const at = prefix.indexOf('λ');
    if (at < 0) return line;
    return prefix.slice(0, at) + Buffer.byteLength(target, 'utf8') + prefix.slice(at + 1) + line.slice(a);
  }).join('\n');
}

ok('ASCII symlink size is target byte length', () => {
  const text = 'lrwxrwxrwx 1 root root 6 Jan 1 00:00 link -> target\n';
  const rw = mekosRewrite(text)!;
  assert.equal(rw.hits, 1);
  assert.equal(rw.wire, 'lrwxrwxrwx 1 root root λ Jan 1 00:00 link -> target\n');
  assert.equal(mekosExpand(rw.wire), text);
  assert.equal(independentExpand(rw.wire), text);
});

ok('UTF-8 byte length, not code-point length', () => {
  const target = 'café/日本語';
  const n = Buffer.byteLength(target, 'utf8');
  const text = `lrwxrwxrwx 1 root root ${n} Jan 1 00:00 link -> ${target}\n`;
  const rw = mekosRewrite(text)!;
  assert.equal(rw.hits, 1);
  assert.equal(mekosExpand(rw.wire), text);
  assert.equal(independentExpand(rw.wire), text);
});

ok('wrong size is not rewritten', () => {
  const text = 'lrwxrwxrwx 1 root root 7 Jan 1 00:00 link -> target\n';
  assert.equal(mekosRewrite(text), null);
});

ok('non-symlink lines untouched', () => {
  const text = '-rw-r--r-- 1 root root 5 Jan 1 00:00 file -> target\n';
  assert.equal(mekosRewrite(text), null);
});

ok('ambiguity guard refuses pre-existing mark', () => {
  const text = 'lrwxrwxrwx 1 root root 6 Jan 1 00:00 λ -> target\n';
  assert.equal(mekosRewrite(text), null);
});

ok('no final newline preserved', () => {
  const text = 'lrwxrwxrwx 1 root root 6 Jan 1 00:00 link -> target';
  const rw = mekosRewrite(text)!;
  assert.equal(mekosExpand(rw.wire), text);
});

ok('composes with ENALLAGE octal modes', () => {
  const text = 'lrwxrwxrwx 1 root root 6 Jan 1 00:00 link -> target\n-rw-r--r-- 1 root root 0 Jan 1 00:00 f\n';
  const oct = enallageRewrite(text)!;
  const len = mekosRewrite(oct.wire)!;
  assert.equal(len.hits, 1);
  assert.equal(mekosExpand(len.wire), oct.wire);
  assert.equal(enallageExpand(mekosExpand(len.wire)), text);
});

ok('contract token ladder', () => {
  const keys = [MEKOS_KEY, 'λ=bytes after ->.', 'λ=len(target).', 'λ=UTF8 bytes after ->.'];
  for (const k of keys) console.log(`  key ${countTokens(k, enc)} tok: ${k}`);
  assert.ok(countTokens(MEKOS_KEY, enc) <= 8);
});

ok('tagstackDecode dispatches ΜΗΚΟΣ key after parent', () => {
  const body = 'lrwxrwxrwx 1 root root λ Jan 1 00:00 link -> target\n';
  const source = 'lrwxrwxrwx 1 root root 6 Jan 1 00:00 link -> target\n';
  const msg = MEKOS_KEY + '\n' + body;
  assert.equal(tagstackDecode(msg), source);
  assert.equal(tagstackDecode(msg, (x) => x), source);
});

ok('tagstackDecode peels nested ΜΗΚΟΣ/ΕΝΑΛΛΑΓΗ in either order', () => {
  const source = 'lrwxrwxrwx 1 root root 6 Jan 1 00:00 link -> target\n';
  const lambdaBody = 'lrwxrwxrwx 1 root root λ Jan 1 00:00 link -> target\n';
  const octBody = 'l0777 1 root root 6 Jan 1 00:00 link -> target\n';
  const bothBody = 'l0777 1 root root λ Jan 1 00:00 link -> target\n';
  const enallageKey = 'Body first. ^Tnnnn␠→T+chmod.';
  const mekosOuter = MEKOS_KEY + '\n' + enallageKey + '\n' + bothBody;
  const enallageOuter = enallageKey + '\n' + MEKOS_KEY + '\n' + bothBody;
  assert.equal(tagstackDecode(mekosOuter), source);
  assert.equal(tagstackDecode(enallageOuter), source);
  assert.equal(tagstackDecode(mekosOuter, (x) => x), source);
  assert.equal(tagstackDecode(enallageOuter, (x) => x), source);
  void lambdaBody; void octBody;
});

console.log(`${passed} passed`);
