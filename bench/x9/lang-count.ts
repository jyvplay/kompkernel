// X9 probe: token cost of the DAEDALUS rule contract (same semantics) written in different languages, o200k.
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
const V: Record<string, string> = {
  EN_shipped: 'Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.',
  EN_short: 'Each new Cyrillic letter before ¶ starts a rule: its text runs to the next new letter or ¶. Expand all rules in the text after ¶, repeatedly, and print only the result.',
  ZH_modern: '¶之前每个新的西里尔字母开始一条规则，其文本延伸到下一个新字母或¶。对¶之后的文本反复展开所有规则，只输出结果。',
  ZH_compact: '¶前每个新西里尔字母立一规则，其文至下一新字母或¶止。反复展开¶后文本中的规则，只输出结果。',
  ZH_classic: '¶前每見新西里字母，即立一則，其文至次一新字母或¶止。於¶後之文，反覆展開諸則，唯出其果。',
  JA: '¶の前にある新しいキリル文字ごとに規則が始まり、その本文は次の新しい文字または¶まで続く。¶の後の本文で全ての規則を繰り返し展開し、結果だけを出力せよ。',
  KO: '¶ 앞에 나오는 새 키릴 문자마다 규칙이 시작되며, 그 텍스트는 다음 새 문자 또는 ¶까지다. ¶ 뒤의 텍스트에서 모든 규칙을 반복해서 펼치고 결과만 출력하라.',
  DE: 'Jeder neue kyrillische Buchstabe vor ¶ beginnt eine Regel, deren Text bis zum nächsten neuen Buchstaben oder ¶ reicht. Im Text nach ¶ jede Regel wiederholt auflösen und nur das Ergebnis ausgeben.',
  RU: 'Каждая новая кириллическая буква перед ¶ начинает правило, текст которого идёт до следующей новой буквы или ¶. В тексте после ¶ раскрывать все правила повторно и выводить только результат.',
  SYM_mixed: '¶前：每个新西里尔字母→一规则，文本至下一新字母或¶。¶后：反复展开规则，只输出结果。',
};
for (const [k, v] of Object.entries(V)) console.log(JSON.stringify({ lang: k, tokens: countTokens(v, enc), chars: [...v].length }));
