# YM — Pure Yang–Mills results and verification

## [Read the October submission assessment (PDF)](docs/assessment-1.pdf)

This repository collects pure Yang–Mills submissions, the group's independent checks, and its assessments. The first package concerns **OpenAI's submission of 28 October 2026**. The assessment is dated **10 November 2026**. In our opinion, this submission proves that a relativistic quantum field theory satisfying the Wightman axioms can be constructed as a scaling limit of four-dimensional Wilson lattice gauge theory for any simple compact gauge group. It does not prove that the infinite-volume limit is unique or that there is a mass gap.

Each submission has a complete package containing the original source, our checks, reproduction instructions, and dated evidence. This lets readers inspect a submission on its own and compare it with later submissions. The original material and the group's additions remain distinct.

## Results and assessments

| Submission | Assessment | Formal checks and evidence |
|---|---|---|
| [OpenAI, 28 October 2026](submissions/openai-20261028/README.md) | [Assessment 1 (PDF)](docs/assessment-1.pdf) | [Check scope](submissions/openai-20261028/docs/checks.md) · [dated results](submissions/openai-20261028/evidence/README.md) · [rerun instructions](submissions/openai-20261028/docs/rerun.md) |
| OpenAI, 4 November 2026 | work in progress | — |
| Alpöge and Sussman, 15 November 2026 | work in progress | — |

The October package includes the original Lean sources, the combined acceptance theorem, bridges to previous relevant formalizations, and a separate OPE check. Its historical evidence records what was built and which Comparator checks were run, including their limitations.

The [commented Lean examples](docs/examples/README.md) provide a reading route through the assessment’s A1–A8 checks: lattice law and scale, the construction chain, operator content, OS axioms, translation Ward identity, the leading trace law, and OPE bounds. Each places explanations beside compilable statements and identifies the scope of the result. The [documentation index](docs/README.md) links the assessment to the specifications, proofs and verification records.

## Repository organization

```text
docs/                              Assessments, reading guides and indexes
  assessment-1.pdf                 Stable location of the first assessment
submissions/
  openai-20261028/
    submission/                    Original, unchanged submitted source
    checks/                        The group's specifications, adapters and proofs
    verification/                  Comparator references, configurations and tool pins
    scripts/                       Reproduction runner
    evidence/                      Dated build and verification records
    provenance/                    Import hashes and upstream correspondences
    docs/                          This submission's explanations and examples
```

New submissions receive their own directories using an author and date, as described in [the package convention](submissions/README.md). Each package retains its own pinned tools and checks. Assessment PDFs have stable top-level paths such as `docs/assessment-1.pdf`. Submission-specific explanations and examples live inside their packages; indexes link to those documents. Comparisons spanning submissions will also live in `docs/`.

The [separate original-submission repository](https://github.com/yang-mills-group/OpenAI-YM-20261028) preserves the October distribution. This results repository contains its own full copy of that source and the inputs for the group's checks, so reproduction does not require access to that other repository. Lean, Mathlib and Comparator are pinned external dependencies.

To check the October package's integrity from a fresh clone:

```sh
cd submissions/openai-20261028
python3 scripts/verify.py integrity
```

For the full build and Comparator replay, read [the prerequisites and reproduction instructions](submissions/openai-20261028/docs/rerun.md), then run `python3 scripts/verify.py all` from the same directory. The recorded macOS verification mode does not provide Linux/Landrun isolation. Generated files stay within the package and are excluded from version control.

## Making a submission

To propose a submission, email [yangmills4d@gmail.com](mailto:yangmills4d@gmail.com) with a short summary and a link to a fixed revision or dated copy of the materials. Identify the authors and the pure Yang–Mills results you claim. Proposals concerning QCD or chiral SU(5) should identify that category so they can be considered for the corresponding results repository. Include an explanatory document and any formal source code, together with the license or terms under which the group may host the materials.

Submissions must meet a minimum standard of relevance, clarity, and mathematical substance. State the problem, definitions, assumptions, and claimed results precisely enough to assess them, and provide substantive arguments supporting those claims. Distinguish formalized results from informal arguments and identify known gaps or unproved steps. For formal results, include the toolchain and dependency versions, instructions for reproducing the checks, and a description of any additional axioms or proof placeholders.

The group decides which submissions meet this standard and which to include. **The group does not promise to post or review submissions, or to reply to submitters, even when these requirements are met.** Posting a submission does not constitute endorsement or certification of its claims.

Our normal arrangement is that submitters retain ownership of their work and remain free to post or publish it elsewhere, independently of our review. Submitters must specify a permissive license allowing us to copy and host their materials. We will consider other arrangements for custody and release on request, such as the one described in OpenAI’s [October 26 announcement](https://openai.com/index/building-scientific-understanding-with-academic-communities/).

Code and documentation are licensed under [Apache-2.0](LICENSE), subject to the preserved upstream notices. See [NOTICE](NOTICE) and the notices within each submission package.
