#!/usr/bin/env python3
# Z34: add the VXR sentinel to the shared VERITAS-A dispatch (wrap check, nested-header flatten, decode entry).
p = 'src/lib/omega/veritas-a.ts'
s = open(p).read()

def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:70])
    s = s.replace(old, new)

rep("|| text.startsWith(VXS_SENTINEL);\n  const pool",
    "|| text.startsWith(VXS_SENTINEL) || text.startsWith(VXR_SENTINEL);\n  const pool")
rep("export const VXS_SENTINEL = '[[VXS\\n';\n",
    "export const VXS_SENTINEL = '[[VXS\\n';\n/** VXR: the VXC wire under its own sentinel (VERITAS-R encoder, Z34). Same header and body; decoded by the VXC path. */\nexport const VXR_SENTINEL = '[[VXR\\n';\n")
rep("""  const eqFree = wire.startsWith(VXC_SENTINEL) || wire.startsWith(VXS_SENTINEL);
  if (!eqFree && !wire.startsWith(VXN_SENTINEL)) return wire;
  const pre = !eqFree ? VXN_SENTINEL : wire.startsWith(VXS_SENTINEL) ? VXS_SENTINEL : VXC_SENTINEL;""",
"""  const eqFree = wire.startsWith(VXC_SENTINEL) || wire.startsWith(VXS_SENTINEL) || wire.startsWith(VXR_SENTINEL);
  if (!eqFree && !wire.startsWith(VXN_SENTINEL)) return wire;
  const pre = !eqFree ? VXN_SENTINEL : wire.startsWith(VXS_SENTINEL) ? VXS_SENTINEL : wire.startsWith(VXR_SENTINEL) ? VXR_SENTINEL : VXC_SENTINEL;""")
rep("if (wire.startsWith(VXN_SENTINEL) || wire.startsWith(VXC_SENTINEL) || wire.startsWith(VXS_SENTINEL)) return veritasADecode(flattenNestedHeader(wire));",
    "if (wire.startsWith(VXN_SENTINEL) || wire.startsWith(VXC_SENTINEL) || wire.startsWith(VXS_SENTINEL) || wire.startsWith(VXR_SENTINEL)) return veritasADecode(flattenNestedHeader(wire));")
open(p, 'w').write(s)
print('patched dispatch')
