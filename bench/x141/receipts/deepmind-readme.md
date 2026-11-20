**Reviewers' site: [google-deepmind.github.io/code-verification](https://google-deepmind.github.io/code-verification/)**: browse the specifications, proofs and checks.

## License

Copyright 2026 Google LLC

All code is licensed under the Apache License, Version 2.0 (the "Apache 2.0"); you may not use this file except in compliance with the Apache 2.0 license. You may obtain a copy of the License at https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and
limitations under the License.

# Formal Verification of Signal's Security in Lean

We present two AI-generated proofs of security for compiled AArch64 machine code of
`libsignal` (the official Rust implementation of the Signal protocol) in a CLI harness
(with hooked cryptographic primitives). These provide independent arguments for
security, one under the symbolic model and one under the computational model.

For more information, please see the associated paper.
The file [`docs/PAPER_MAP.md`](docs/PAPER_MAP.md) provides links from sections in the paper,
such as descriptions of theorems, to the Lean code that formalizes it. A detailed overview of the
computational development is in [`Computational/docs/README.md`](Computational/docs/README.md);
the symbolic theorems are in [`Symbolic/Theorems/`](Symbolic/Theorems/).

```text
├── Computational/     # Computational (game-based) security specs, proofs, and headline theorems
├── Symbolic/          # Symbolic (Dolev–Yao) model, binary refinement, proofs, and theorems
├── LibsignalBinary/   # Shared AArch64 binary specs, hook models, and function proofs
├── arm64-semantics/   # Formal AArch64 ISA/process semantics, separation logic, and rust-obj2lean
├── third_party/       # Official libsignal crates (v0.105.4 + spqr v1.6.0) and libsignal-cli CLI
├── scripts/           # Stock ld.lld CLI ELF builder (cli-elf-stock), trusted-closure, and axiom audit scripts
└── docs/              # Paper-to-code map (docs/PAPER_MAP.md) and symbolic paper differences
```

## Building and Verifying

### Prerequisites

- **Lean 4** via [`elan`](https://github.com/leanprover/elan) (`lean-toolchain` pins `leanprover/lean4:v4.34.0`).
- **Rust `1.98.1`** (pinned in [`rust-toolchain.toml`](rust-toolchain.toml); `.GeneratedLean/` depends on the exact `rustc` output, so do not override the pin) with cross-compilation targets, `rust-src`, and LLVM tools:
  ```bash
  rustup toolchain install 1.98.1 \
    --target aarch64-unknown-linux-gnu,aarch64-unknown-linux-musl \
    --component rust-src,llvm-tools-preview
  ```
- **`protoc`** (Protocol Buffers compiler, used by `libsignal`'s `prost-build` scripts), **LLVM `ld.lld` `22.1.8`**, and **[Zig `0.16.0`](https://ziglang.org/)** on `PATH`.

### Build and Kernel-Check All Proofs

```bash
# 1. Fetch prebuilt Mathlib:
lake exe cache get

# 2. Raise the soft stack limit (needed by `leantar` on large modules), materialize cached
#    `.olean` files into `.lake/`, and bound parallel Lean workers (use about 1 thread per
#    4 GiB of free RAM, plus some headroom), then compile libsignal, extract it to Lean, and
#    check all default Lean proofs (several hours, ~15–34 GiB peak RAM):
ulimit -S -s 524288
export LAKE_RESTORE_ARTIFACTS=true
export LEAN_NUM_THREADS=8   # ~1 per 4 GiB of free RAM; Lake has no -j flag
lake build

# 3. Build the SHA-256-pinned `libsignal-cli` AArch64 ELF from source with stock `ld.lld`, verify
#    its pin, and check the binary-level headline theorems in `CliElfLib`
#    (`Computational/Theorems/Main.lean` and `Symbolic/Theorems/{Security,Refinement}.lean`):
./scripts/cli-elf-stock --stdbin --build
./scripts/cli-elf-stock --stdbin --verify-pin --lean-mod LibsignalBinary/Specifications/SignalSession/CliElf.lean
lake build CliElfLib
lake script run checkCliElfOwner
```

### Verify Headline Theorems with Comparator

[`leanprover/comparator`](https://github.com/leanprover/comparator) verifies that each headline
theorem matches its trusted challenge statement (including all transitive definitions), uses only
standard Lean axioms (`propext`, `Quot.sound`, `Classical.choice`), and replays in a fresh Lean
kernel from `lean4export` output rather than `.olean` files.

Running this check (`comparator/install-tools.sh` and `comparator/run.sh`) is only supported on
Linux, as `leanprover/comparator` sandboxes its builds and exports with
[`landrun`](https://github.com/Zouuup/landrun) (which uses Linux's Landlock LSM).

```bash
# 1. Build the pinned comparator, lean4export, and landrun tools and export their paths:
comparator/install-tools.sh /tmp/comparator-tools
set -a; source /tmp/comparator-tools/env; set +a

# 2. Build the challenge and solution libraries (`comparator/`), then check both
#    `comparator/computational.json` and `comparator/symbolic.json` (or pass one config):
lake build ComparatorChallenge ComparatorSolution
comparator/run.sh
```

## License and disclaimer

Copyright 2026 Google LLC

Unless a file states otherwise, the software in this repository is licensed under the license
described in [`LICENSE`](LICENSE). Third-party material, including code copied from
Signal's `libsignal` (AGPL-3.0-only), keeps its own license. The libsignal crates live in
[`third_party/libsignal/`](third_party/libsignal/), with the upstream
[`LICENSE`](third_party/libsignal/LICENSE) and a [`README.md`](third_party/libsignal/README.md)
that lists what is copied from libsignal; each file states its license in its header comment. To
contribute, see [`CONTRIBUTING.md`](CONTRIBUTING.md).

Unless required by applicable law or agreed to in writing, all software distributed here is
distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the licenses for the specific language governing permissions and limitations under
those licenses.

This is not an official Google product.

Eligibility for the [Google Open Source Software Vulnerability Rewards
Program](https://bughunters.google.com/open-source-security) is determined by the [Google Open Source Software Vulnerability Reward Program Rules](https://bughunters.google.com/about/rules/open-source/google-open-source-software-vulnerability-reward-program-rules).
