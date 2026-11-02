import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const variants: Array<[string, string]> = [
['v1-current', 'PROBOLE-1. Undo the parent, then: `^O` lines (prefix `|`) are the document, with each `⟨n⟩` replaced by run n\'s records joined by SEP; `^Tn` lines (prefix `|`) are run n\'s record template, `~` being a slot; `^Vn <count>` lists run n\'s slots in order of appearance, each as <count> lines, where `*<k> <v>` means v repeated k times. Fill each slot with the next value of that slot, and print. SEP is one comma and a newline and the `^U` indent repeated `^D` times; when `^U` is empty SEP is just a comma.'],
['v2-s', 'PROBOLE-1. Expand the parent, then: `|` lines carry the document, `⟨n⟩` standing for run n\'s records joined by the `^S` string; a `^Tn` line starts run n\'s record template (`|` stripped, `~` = slot); `^Vn <k>` gives run n\'s slots in order, each k lines, `*<k> v` meaning v k times. Fill each slot with its next value, then print.'],
['v3-terse', 'PROBOLE-1: expand parent. `^O` then `|` lines = document, `⟨n⟩` -> run n records joined by `^S`. `^Tn` then `|` lines = run n record template, `~`=slot. `^Vn k` = run n slots, each k lines, `*k v`=v xk. Fill slots in order. Print.'],
['v4-terser', 'PROBOLE-1. Expand parent. Then `|` lines after `^O` are the document, `⟨n⟩` = run n records joined by the `^S` string; `^Tn` + `|` lines = run n record template (`~` slot); `^Vn k` = run n slots in order, k lines each, `*k v` = v xk. Fill slots in order; print.'],
];
for (const [n, s] of variants) console.log(countTokens(s, enc), n, s.length);
