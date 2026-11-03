/**
 * X73 probe 7 — the contract's LANGUAGE is a free parameter nobody has touched.
 *
 * Every contract in this stack is English. But tau() is o200k: a CJK character
 * is one token and routinely carries a whole English word, while English pays a
 * space + a token per word. TIMEMA already showed that changing REGISTER (prose
 * -> notation) is worth more than paraphrasing within a register. Language is a
 * bigger register change than notation, and the reader (a frontier model) is
 * multilingual, so the message stays self-contained.
 *
 * This probe measures the same instruction in English and in Chinese, on the
 * exact sentences the shipped codecs use.
 */
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const pairs: Array<[string, string, string]> = [
  ['chiron rule sentence',
   'Every new foreign letter before the separator starts a rule whose text runs to the next new letter or to the separator. In the text after the separator expand every rule, repeatedly, and print only the result.',
   '分隔符前，每出现一个新的外文字母就开始一条规则；该规则的文本延续到下一个新字母或分隔符。分隔符之后的文本中反复展开所有规则，只打印结果。'],
  ['timema head',
   'Before ¶ k=v. expand repeatedly; print only.',
   '¶之前为 k=v，反复展开，只打印。'],
  ['column rule (X72 fold)',
   'X72 pad. Unfold: split each line at TAB. Write cell 1 to char 1, cell 2 to char 4, cell 3 to char 13, and the last cell as-is. Lines starting with a backslash are literal: drop it and keep the rest.',
   'X72 补齐。还原：每行在 TAB 处切分。第1格写到第1列，第2格写到第4列，第3格写到第13列，最后一格照写。以反斜杠开头的行是原文，去掉反斜杠后照写。'],
  ['table band marker',
   'A-B are 0-based body lines',
   'A-B 为正文行号，从0起'],
];
for (const [name, en, zh] of pairs) {
  const a = countTokens(en, enc), b = countTokens(zh, enc);
  console.log(`${name.padEnd(24)} en ${String(a).padStart(3)}  zh ${String(b).padStart(3)}  ${(100 * (b - a) / a).toFixed(0)}%`);
}
