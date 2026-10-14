// Z46 second-order adversary: inputs built to break ENTHYMEME's exactness or safety. Every case must round-trip.
import { enthymemeEncode, enthymemeDecode, frameSourceName, headingSlug, ENTHYMEME_RULES } from '../../src/lib/omega/enthymeme';
const frames = (n: number, mk: (i: number) => string) => Array.from({ length: n }, (_, i) => mk(i)).join('\n');
const cases: Record<string, string> = {
  'payload already uses the elided form': frames(30, i => `\tat com.acme.svc.Handler${i}.run(Handler${i}.java:${i})`) + '\n\tat com.acme.Weird.x(:12)\n',
  'kotlin + generated + unknown-source frames mixed': frames(30, i => `\tat com.acme.Thing${i}.call(Thing${i}.java:${i + 1})`) + '\n\tat kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:106)\n\tat com.acme.Foo$$EnhancerBySpringCGLIB$$1a2b.doIt(<generated>)\n\tat jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n\tat com.acme.Bar.baz(Unknown Source)\n\tat com.acme.Other.m(NotOther.java:3)\n',
  'module prefix + inner + lambda + <init>': frames(25, i => `\tat java.base/java.util.concurrent.ThreadPoolExecutor$Worker${i}.run(ThreadPoolExecutor.java:${600 + i})`) + '\n\tat com.acme.Outer$Inner$1.<init>(Outer.java:5)\n\tat com.acme.Outer.lambda$run$0(Outer.java:9)\n\tat acme@2.1/org.acme.Lib.test(Lib.java:80)\n',
  'CRLF trace': frames(30, i => `\tat com.acme.A${i}.b(A${i}.java:${i})`).replace(/\n/g, '\r\n') + '\r\n',
  'toc with duplicate headings (-1 suffix) and punctuation': ['# Guide', '', ...Array.from({ length: 30 }, (_, i) => `- [Step ${i}: Install & Run!](#step-${i}-install--run)`), '- [FAQ](#faq)', '- [FAQ](#faq-1)', '- [C++ / C#](#c--c)', '- [`code` *em*](#code-em)', '- [Ünïcödé Héading](#ünïcödé-héading)', '- [Emoji 🚀 Launch](#emoji--launch)', ''].join('\n'),
  'toc with the elided form present': ['- [A B](#a-b)', '- [Done](#)', ...Array.from({ length: 30 }, (_, i) => `- [Topic ${i}](#topic-${i})`), ''].join('\n'),
  'payload that starts with the rule mark': '∴ Stack frames: nothing here\n' + frames(30, i => `\tat com.acme.A${i}.b(A${i}.java:${i})`),
  'prose mentioning at com.x.Y.z(Y.java:1) inside a sentence': 'Look at com.acme.Parser.parse(Parser.java:42) and at com.acme.Lexer.next(Lexer.java:7); ' + frames(30, i => `\tat com.acme.P${i}.q(P${i}.java:${i})`),
};
let ok = 0, n = 0;
for (const [name, t] of Object.entries(cases)) {
  n++;
  const r = enthymemeEncode(t, 'o200k_base');
  const d = enthymemeDecode(r.wire);
  const pass = r.exact && d === t;
  if (pass) ok++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: applied=${r.applied} rules=${r.rules.join('+') || '-'} elided=${r.elided} M=${r.messageTokens} plainM=${r.plainMessageTokens} raw=${r.inTokens}`);
}
// rule-level: fold/unfold round trip regardless of the gate, and refusal when the elided form is present
for (const [name, t] of Object.entries(cases)) {
  for (const rule of ENTHYMEME_RULES) {
    const f = rule.fold(t, 'o200k_base');
    const back = f ? rule.unfold(f.text) : null;
    const expectRefusal = /elided form|rule mark/.test(name) && (rule.id === 'frames' ? /frames|form|mark/.test(name) : /toc/.test(name));
    console.log(`  rule ${rule.id} on "${name}": ${f ? `folded ${f.count} (distinct ${f.distinct}, est ${f.estimate}) round-trip=${back === t}` : 'declined'}${expectRefusal && f && name.includes('elided form') ? '  <-- SHOULD HAVE DECLINED' : ''}`);
  }
}
console.log(`slug checks: ${headingSlug('Step 3: Install & Run!')} | ${headingSlug('C++ / C#')} | ${headingSlug('`code` *em*')} | ${headingSlug('Emoji 🚀 Launch')}`);
console.log(`source checks: ${frameSourceName('java.base/java.util.concurrent.ThreadPoolExecutor$Worker')} ${frameSourceName('com.acme.Outer$Inner$1')} ${frameSourceName('acme@2.1/org.acme.Lib')}`);
console.log(`${ok}/${n} adversarial cases exact`);
