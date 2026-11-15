# X118 status — COMPLETE

- Frontier re-verification: `verify-frontier.log` = X116 ON reproduced 29/29,
  total 12277, exact 29/29. Configuration is exactly last turn's X116.
- Balanced ΣΥΝΘΕΣΙΣ A/B (`bench/x117/receipts/ab.json`): the FIRST run
  (`ab-prefix.json`) caught a +12-token regression on ls-l-real (base-frontier
  inner pricing skipped wire-level glyph opts). NOT shipped.
- Repair: synthesis inner encoder = full X74 chain (same callback as
  ΕΝΑΛΛΑΓΗ/ΜΗΚΟΣ). Re-gate (`regate-lsl.json`): ls-l-real 1348 → 1341 (−7), exact.
- Final A/B totals: OFF 12277 → ON 12270 (Δ−7), better 1 / worse 0 / same 28,
  exact 29/29, same-price hashes stable. Wall 3.225×, CPU 3.233×.
- OFF verification: `verify-ab-off.log` = OFF=X116-ON identical 29/29.
- Leaders (`leaders-x117.json`): ALL 29 raw 28015 → 12270 (0.4380), floor 10158,
  headroom 11.8%, readability price 17.21%. OPS LISTING leader ls-l-real 5194→1341.
- New attack on the repair (`attack-crc-domain.json`): 6 trials, 0 silent accepts.
- Unit 9/9; cold read EXACT; mutation 930/878/52/0; tsc --noEmit exit 0.
- Seven new-mechanism screens: all H−/H∂ at the complete-message gate
  (research/protocol.md; screen.json / affix-screen.json / diff-screen.json).
