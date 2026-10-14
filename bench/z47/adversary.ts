// Z47 — second-order adversary for EPAGOGE: attacks derived from its own structure (parameters in the sentence,
// two frame forms, Kt facades, zipper over the NEXT record, refusals). Every case must round-trip byte-exactly.
import { epagogeEncode, epagogeDecode, EPAGOGE_SCHEMAS } from '@/lib/omega/epagoge';
const enc = 'o200k_base' as const;
const rep = (s: string, n: number) => Array.from({ length: n }, (_, i) => s.replace(/%i/g, String(i))).join('');
const cases: Array<[string, string]> = [
  ['mixed java+kt on few distinct files: second form and Kt-facade must repay their sentence share (here they do not); the OddKt.kt impostor stays literal',
    rep('\tat com.app.Main$onCreate$%i.invoke(Main.kt:1%i)\n', 6) + rep('\tat kotlin.io.FilesKt.readText(Files.kt:2%i)\n', 5) +
    '\tat kotlin.io.OddKt.run(OddKt.kt:7)\n' + rep('\tat android.app.ActivityThread.performLaunchActivity(ActivityThread.java:3%i)\n', 6) +
    '\tat kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)\n'],
  ['payload already contains an elided form (;N): frames schema must refuse, anchors may still fire',
    'at a.b.C.m(;12)\n' + rep('at a.b.C%i.m(C%i.java:4%i)\n', 8) + '# TOC\n' + rep('- [Section %i Title](#section-%i-title)\n', 12)],
  ['payload already contains a bare "[x]:" line: release schema must refuse',
    '[note]:\n' + rep('## [1.%i.0]\n- change\n\n[1.%i.0]: https://github.com/o/r/compare/v1.%i.0...v1.%i.0\n', 6)],
  ['scala frames (ext induced, not assumed)',
    rep('\tat org.apache.spark.sql.Dataset$$anonfun$%i.apply(Dataset.scala:%i0)\n', 9) + '\tat scala.Option.foreach(Option.scala:407)\n'],
  ['release links with a skipped version and a foreign link line in between',
    '# Changelog\n' + '[0.5.0]: https://github.com/o/r/compare/v0.4.0...v0.5.0\n[0.4.0]: https://github.com/o/r/compare/v0.3.0...v0.4.0\n[docs]: https://example.com/docs\n[0.3.0]: https://github.com/o/r/compare/v0.2.0...v0.3.0\n[0.2.0]: https://github.com/o/r/compare/v0.1.0...v0.2.0\n[0.1.0]: https://github.com/o/r/compare/v0.0.5...v0.1.0\n[0.0.5]: https://github.com/o/r/compare/v0.0.4...v0.0.5\n[0.0.4]: https://github.com/o/r/releases/tag/v0.0.4\n'],
  ['release links without a tag prefix and with the Unreleased line',
    '[Unreleased]: https://gitlab.com/g/p/-/compare/3.0.7...main\n' + Array.from({ length: 7 }, (_, i) => `[3.0.${7 - i}]: https://gitlab.com/g/p/-/compare/3.0.${6 - i}...3.0.${7 - i}\n`).join('') + '[3.0.0]: https://gitlab.com/g/p/-/tags/3.0.0\n'],
  ['percent-encoded anchors (Obsidian-style) chosen over github flavour',
    rep('- [Lecture %i Notes](#Lecture%20%i%20Notes)\n', 14) + '\n## Lecture 1 Notes\ntext\n'],
  ['CRLF changelog: zipper stays inactive, everything exact',
    rep('[2.%i.0]: https://github.com/o/r/compare/v2.%i.0...v2.%i.0\r\n', 8)],
  ['frames with module prefixes and Native/Unknown Source frames',
    rep('\tat java.base/java.util.HashMap$TreeNode.find(HashMap.java:%i9)\n', 7) + '\tat java.base/jdk.internal.misc.Unsafe.park(Native Method)\n\tat com.sun.proxy.$Proxy12.run(Unknown Source)\n'],
  ['label already lowercase and without spaces: both flavours match, github wins deterministically',
    rep('- [intro%i](#intro%i)\n', 10)],
  ['text starts with the rule mark: refused entirely',
    '∴ Stack frames: whatever\n' + rep('\tat a.b.C%i.m(C%i.java:1)\n', 9)],
];
let ok = 0;
for (const [name, text] of cases) {
  const r = epagogeEncode(text, enc);
  const exact = epagogeDecode(r.wire) === text && r.decoded === text;
  ok += exact ? 1 : 0;
  // direct transform check, independent of the token gate: every candidate instance must fold and unfold exactly
  const insts: string[] = [];
  let tOk = true;
  for (const s of EPAGOGE_SCHEMAS) {
    const inst = s.instantiate(text, enc); if (!inst) continue;
    const f = inst.fold(text, enc);
    const back = f ? inst.unfold(f.text) === text : true;
    tOk = tOk && back;
    insts.push(`${inst.schema}[${inst.params}]${f ? ` folded=${f.count}${back ? '' : ' ROUNDTRIP-FAIL'}` : ' refused'}`);
    if (process.env.SHOW && f) console.log('      folded: ' + JSON.stringify(f.text.slice(0, 260)));
  }
  ok += tOk ? 0 : -1;
  console.log(`${exact && tOk ? 'OK  ' : 'FAIL'} ${name}\n      raw ${r.inTokens} M ${r.messageTokens} applied=${r.applied} ${r.schemas.map((s, i) => `${s}[${r.params[i]}]`).join('+') || '-'} elided=${r.elided}; candidates: ${insts.join(' | ') || '-'}`);
  if (process.env.SHOW && r.applied) console.log(r.wire.split('\n')[0]);
}
console.log(`${ok}/${cases.length} exact`);
