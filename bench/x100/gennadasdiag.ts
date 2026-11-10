/**
 * X100 — ΓΕΝΝΑΔΑΣ DIAGNOSTIC on the lane that motivated it.  Runs the shipped chain
 * with ΓΕΝΝΑΔΑΣ disabled, then asks ΓΕΝΝΑΔΑΣ to work on that exact incumbent and
 * reports why it does or does not fire.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { gennadasEncode } from '../../src/lib/omega/gennadas';
process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const text = fs.readFileSync('bench/holdout-x41/ls-l-real.txt', 'utf8');
process.env.OMEGA_NO_GENNADAS = '1';
const A: any = tagstackEncode(text, enc);
delete process.env.OMEGA_NO_GENNADAS;
console.log('chain arm A: tokens', A.messageTokens, 'exact', A.exact, 'parent', A.parentCodec);
console.log('  A.decoded === source ?', A.decoded === text);
console.log('  chironDecode(A.message) === source ?', (() => { try { return chironDecode(A.message.slice(A.message.indexOf(CHIRON_START))) === text; } catch { return 'threw'; } })());
console.log('  chironDecode(A.message) === A.decoded ?', (() => { try { return chironDecode(A.message.slice(A.message.indexOf(CHIRON_START))) === A.decoded; } catch { return 'threw'; } })());
console.log('  A.decoded bytes', Buffer.byteLength(A.decoded), ' source bytes', Buffer.byteLength(text));
console.log('  notes tail:', String(A.notes).slice(0, 400));
const G = gennadasEncode(text, enc, { message: A.message, messageTokens: A.messageTokens, decoded: A.decoded });
console.log('\nΓΕΝΝΑΔΑΣ on the real incumbent: applied', G.applied, 'tokens', G.messageTokens, '(delta', G.messageTokens - A.messageTokens, ')');
console.log('  refIsSource', G.refIsSource, 'pairs', G.pairs, 'enabled', G.enabled);
console.log('  notes:', G.notes);
// and what does ΓΕΝΝΑΔΑΣ do if we hand it the reference it wants?
const ref = chironDecode(A.message.slice(A.message.indexOf(CHIRON_START)));
const G2 = gennadasEncode(ref, enc, { message: A.message, messageTokens: A.messageTokens, decoded: ref });
console.log('\nΓΕΝΝΑΔΑΣ with ref as `text`: applied', G2.applied, 'delta', G2.messageTokens - A.messageTokens, 'notes', G2.notes);
