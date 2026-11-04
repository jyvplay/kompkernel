import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const tests: [string,string][] = [
  ['Quick brown fox jumps over the lazy dog','Quick_brown_fox_jumps_over_the_lazy_dog'],
  ['the retention policy is resolved at the moment','the_retention_policy_is_resolved_at_the_moment'],
  ['Every document inherits exactly one retention policy','Every_document_inherits_exactly_one_retention_policy'],
  ['a b c d e f g h','a_b_c_d_e_f_g_h'],
  ['| 1 | 00:00:02 | s0 | line 0 |','|_1_|_00:00:02_|_s0_|_line_0_|'],
];
for (const [a,b] of tests) console.log(`spaced ${String(T(a,enc)).padStart(3)}  underscored ${String(T(b,enc)).padStart(3)}  : ${a}`);
// name probe
for (const n of ['a','A','k','§','¤','𠀀','ə','ʌ','ẩ','ʉ','ȷ','ħ','ӷ','ꞵ','ᵱ','ᵴ','ᶊ','ɂ','ɀ','ʬ']) {
  console.log(`name ${JSON.stringify(n)} = ${T(n,enc)}`);
}
