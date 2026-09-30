/**
 * bench/metatron-fixtures.ts
 * =============================================================================
 * Test fixtures for METATRON-Ω red-team validation.
 * =============================================================================
 */

export const METATRON_FIXTURES: Record<string, string> = {
  // 1. Full Markdown Architecture Spec & Task Checklist
  markdownArchitectureDoc: [
    '# Advanced Distributed Systems & AI Verification Architecture',
    '',
    '## 1. System Overview',
    'The autonomous reasoning agent coordinates multiple specialized workers.',
    '',
    '### 1.1 Technical Requirements',
    '- [x] Implement linear-time Duval Lyndon factorization for grammar discovery',
    '- [x] Integrate 768-operad tri-domain linguistic codebook',
    '- [x] Validate Lean 4 formal certificates with zero sorry-count',
    '- [ ] Extend cross-lingual grammatical particle transduction to CJK dialects',
    '',
    '### 1.2 Verification Pipeline',
    '```typescript\n' +
    'export interface VerificationContract {\n' +
    '    id: string;\n' +
    '    proof_kernel: string;\n' +
    '    theorems_verified: number;\n' +
    '    sorry_count: number;\n' +
    '}\n' +
    '```',
    '',
    '### 1.3 Benchmark Latency & Throughput Table',
    '| Component | Mean Latency (ms) | Peak Memory (MB) | Formal Status |',
    '| :--- | :--- | :--- | :--- |',
    '| Kernel Checker | 14ms | 256MB | verified |',
    '| Tiler Engine | 8ms | 128MB | verified |',
    '| Sub-Agent Shell | 42ms | 512MB | verified |',
    '',
    '## 2. Experimental Conclusion',
    'The proposed architecture guarantees exact byte-for-byte lossless reconstruction under all operational regimes.',
  ].join('\n'),

  // 2. Realistic ArXiv Academic Paper with Typographic Ligatures & Roman Numerals
  academicPaperLigatures: [
    'Abstract: We investigate the classi\uFB01cation and in\uFB02uence of di\uFB00erent non-so\uFB01c group actions in extremal combinatorics.',
    'The coe\uFB03cient pro\uFB01les of the di\uFB03culties in the a\uFB04uent and e\uFB03cient manifolds were veri\uFB01ed using the Lean 4 formalization kernel.',
    'Section \u2160: Formal De\uFB01nitions and \uFB02ag algebra foundations.',
    'Section \u2161: The con\uFB02ict between \uFB02exibility and e\uFB03cacy is resolved under the a\uFB03liated topologies.',
    'Section \u2162: Upper bounds on multicolored Ramsey numbers and Sidon sets.',
    'Section \u2163: Machine-checkable certi\uFB01cates in Lean 4 mathlib con\uFB01rming the absence of singularities.',
    'Conclusion: The resulting formal proof establishes that the su\uFB03cient condition holds for all bounded metric spaces.',
  ].join('\n'),

  // 3. Multi-Artifact Heterogeneous Technical Report (Markdown + Ligatures + Prose + Math + Code)
  multiArtifactTechDoc: [
    '### Technical Evaluation: LLM Formal Proof Generation',
    '- [x] Theorem proving throughput: 42 proofs/hour',
    '- [x] Verification accuracy: 100% (Lean 4 kernel checked)',
    '- [ ] In-context dictionary learning for prompt compression',
    '```python\n' +
    'def verify_proof(ctx, theorem):\n' +
    '    if ctx.is_valid():\n' +
    '        return {"status":"ok", "verified": True}\n' +
    '    return {"status":"error", "reason": "timeout"}\n' +
    '```',
    'Summary: The proposed method yields signi\uFB01cant e\uFB03ciency gains without loss of generality.',
  ].join('\n'),

  // 4. Negative Control: Pure ASCII English Prose
  pureEnglishProseNegative:
    'The standard algorithm computes the convex hull in linear time assuming the points are pre-sorted by their horizontal coordinate. This property guarantees optimal performance across all test suites.',

  // 5. Negative Control: Clean ASCII Code
  pureAsciiCodeNegative:
    'function binarySearch(arr: number[], target: number): number {\n  let left = 0;\n  let right = arr.length - 1;\n  while (left <= right) {\n    const mid = (left + right) >> 1;\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}',
};
