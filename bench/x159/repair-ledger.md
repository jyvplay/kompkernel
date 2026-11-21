# Repair ledger (no inherited trust)

1. Initial KLIMAX prose key did not specify canonical positive component widths.
   Replaced it with the explicit1–12-component/1–6-digit/no-leading-zero rule.
   Rebuilt screen, unit and trial bundles; final gate checks the actual candidate messages against the final key.
2. Initial prefix regex did not treat CRLF-only numbered lines as line ends.
   Changed both TS and independent Python grammars; added a reset adversary
   mixing leading-zero, zero, oversized and standalone-CRLF numbers. All1828
   unit checks and all independent unparented sources reran. Final source
   reconstruction uses the repaired inverse; no old receipt is reused as a pass.
3. First independent HTTP-baseline attempt returned the unsupported envelope
   literally, so source equality FAILED. This was a verifier-support gap, not
   permission to trust the encoder's decoded field. Added a bounded reader for
   the existing arithmetic-progression header.
4. First version of that reader expanded the grammar but mistakenly retained
   its terminal dictionary instruction as source: output10340 vs source10165
   characters; equality FAILED. The dictionary instruction itself is grammar
   encoded on this wire. The repair requires the exact expanded Cyrillic
   terminal clause, removes exactly one clause, and rejects missing/corrupt
   clauses or other scripts. A repeated identical clause inside the source
   remains intact. Twenty targeted TS checks include unsafe integers, absent
   predecessors, CRLF, terminal corruption and duplicate-terminal preservation.
5. Re-ran both HTTP full messages and all four TLS messages through the separate
   Python inverse against source-file bytes: pass. Replayed strict full-price
   selection against the actual measured parent: HTTP gain270. The replay is
   explicitly not a new full-encoder timing. The public optional wrapper retains
   the operational incumbent if its bounded incumbent reader is unsupported.

No default production encoder code was altered by these repairs. The only
newly accepted claim is bounded complete-token improvement with software byte
verification, not native decoding or full runtime Pareto dominance.
