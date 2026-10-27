#!/usr/bin/env python3
"""Independent CPython round trip for one complete rejected BIFRONT candidate.

The parent message is decoded by the earlier independent APOGRAPHE/CHIRON
reader in bench/x39/apographe_decode.py. This file independently parses the
BIFRONT suffix literal and restores it. It is not an LLM readability test.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "bench" / "x39"))
from apographe_decode import decode_message as decode_parent  # noqa: E402

CONTRACT_SUFFIX = re.compile(
    r'After decoding the parent, append ("(?:[^"\\]|\\.)*") '
    r'to every final path field\.'
)
LINE_END = re.compile(r"(\r\n|\n|\r)")
FINAL_FIELD = re.compile(r"^(.*?)(\S+)([ \t]*)$")


def restore_suffix(transformed: str, suffix: str) -> str:
    if not suffix or "\n" in suffix or "\r" in suffix:
        raise ValueError("invalid suffix parameter")
    parts = LINE_END.split(transformed)
    out: list[str] = []
    for i, part in enumerate(parts):
        if i % 2 == 1:
            out.append(part)
            continue
        if part == "":
            out.append(part)
            continue
        match = FINAL_FIELD.match(part)
        if not match:
            raise ValueError(f"malformed row: {part!r}")
        prefix, path, trailing = match.groups()
        if "/" not in path and "\\" not in path:
            raise ValueError(f"not a path field: {path!r}")
        out.append(prefix + path + suffix + trailing)
    return "".join(out)


def main() -> int:
    receipt_path = ROOT / "bench/x46/receipts/independent-candidate.json"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    source_path = ROOT / receipt["source"]
    with source_path.open("r", encoding="utf-8", newline="") as f:
        source = f.read()
    source_sha = hashlib.sha256(source.encode("utf-8")).hexdigest()
    if source_sha != receipt["sourceSha256"]:
        raise AssertionError("source hash changed since candidate receipt")

    contract = receipt["contract"]
    match = CONTRACT_SUFFIX.search(contract)
    if not match:
        raise AssertionError("BIFRONT suffix literal not found in full contract")
    suffix = json.loads(match.group(1))

    transformed = decode_parent(receipt["message"])
    if transformed != receipt["transformed"]:
        raise AssertionError("independent parent decode differs from transformed source")
    reconstructed = restore_suffix(transformed, suffix)
    if reconstructed != source:
        raise AssertionError("independent BIFRONT reconstruction differs from source")

    parent_measure = json.loads(
        (ROOT / "bench/x46/receipts/bifront-find-listing.json").read_text(encoding="utf-8")
    )
    parent_m = parent_measure["parentTokens"]
    candidate_m = receipt["completeMessageTokens"]
    line = (
        "PASS independent CPython BIFRONT round trip: "
        f"bytes={len(reconstructed.encode('utf-8'))} sha256={source_sha} "
        f"suffix={suffix!r} paths={receipt['pathCount']} "
        f"candidateM={candidate_m} parentM={parent_m} delta={candidate_m - parent_m}"
    )
    output = ROOT / "bench/x46/receipts/independent-python-verification.txt"
    output.write_text(line + "\n", encoding="utf-8")
    print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
