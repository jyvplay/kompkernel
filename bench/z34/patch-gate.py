#!/usr/bin/env python3
# Z34: fix the greedy baseline (count the same wire as the trials) and gate the final output on raw size.
p = 'src/lib/omega/veritas-s.ts'
s = open(p).read()
old = "  let cur = countTokens(body, enc);\n  let trialsTot = 0;"
assert s.count(old) == 1, s.count(old)
s = s.replace(old, "  // Baseline counts the same wire as the trials (legend included). A bare-body baseline gave a false +33 gate.\n  let cur = countTokens(wireS([], body), enc);\n  let trialsTot = 0;")
old2 = "  return finish(wireS(entries, body), entries.length, trials);\n}"
assert s.count(old2) == 1
s = s.replace(old2, """  const wire = wireS(entries, body);
  // Final choice: the wire must beat the raw input (legend and header included); otherwise emit the input verbatim.
  if (countTokens(wire, enc) >= inTokens) {
    const wrap = text.startsWith(VXA_SENTINEL) || text.startsWith(VXN_SENTINEL) || text.startsWith(VXC_SENTINEL) || text.startsWith(VXS_SENTINEL);
    return finish(wrap ? wireS([], escBody(text)) : text, 0, trials);
  }
  return finish(wire, entries.length, trials);
}""")
open(p, 'w').write(s)
print('patched')
