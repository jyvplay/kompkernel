# X114 bench artefacts

Canonical runner: `bash bench/x15/run.sh <entry.ts> [args...]`.

## Commands

```bash
# Shipped-chain baseline (pre-SYNEDRIA bundle; 29 lanes, pinned audit flags)
bash bench/x15/run.sh bench/x114/baseline.ts bench/x109/lanes29.txt bench/x114/receipts/baseline

# Raw mechanism screens (no parent gate)
bash bench/x15/run.sh bench/x114/screen.ts  bench/x109/lanes29.txt
bash bench/x15/run.sh bench/x114/screen2.ts bench/x109/lanes29.txt

# SYNEDRIA soundness unit probes
bash bench/x15/run.sh bench/x114/synedria-unit.ts

# Small balanced smoke A/B (first N lanes)
bash bench/x15/run.sh bench/x114/synedria-smoke.ts bench/x109/lanes29.txt 4

# Full balanced 29-lane A/B of OMEGA_SYNEDRIA on the shipped tagstackEncode
bash bench/x15/run.sh bench/x114/ab.ts bench/x109/lanes29.txt bench/x114/receipts/ab

# Leaders refresh from the completed baseline receipt (zero encoder calls)
bash bench/x15/run.sh bench/x114/leaders.ts bench/x114/receipts/baseline.json
```

## Receipts

- `baseline.{jsonl,json,log}`: shipped `tagstackEncode`, 29/29 exact, total 12 290.
- `screen.{json,log}`: layout / delta-layout / sentence-case, all raw-negative.
- `screen2.{json,log}`: same-row percentage / tree geometry / column unit template,
  all raw-negative; `fired` means exact admissible firing.
- `synedria-unit.log`: replay/clone/bypass/scope/disable probes PASS.
- `synedria-smoke.{json,log}`: corrected 4-lane balanced smoke A/B.
- `ab.{jsonl,json,log}`: full balanced 29-lane SYNEDRIA A/B.
- `leaders-x114.{json,log}`: category leaders, raw/floor imported from X90.
- `research/`: frontier-lab mathematics and compression prior-art notes.

## Flags

Pinned audit flags: `OMEGA_DET=1 OMEGA_NO_MEMO=1 OMEGA_ENGRAM=0
OMEGA_OURA_MEMO=0 OMEGA_NO_OROTHESIA=1`. The A/B toggle is `OMEGA_SYNEDRIA`
(`0` off, `1` on). Production default is on; the lane adds no wire syntax and
replays the deterministic meter on every hit.
