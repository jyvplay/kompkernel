/**
 * bench/episteme-fixtures.ts
 * =============================================================================
 * Test fixtures for EPISTEME-Ω red-team validation.
 * =============================================================================
 */

export const EPISTEME_FIXTURES: Record<string, string> = {
  // 1. Realistic ArXiv Academic Paper on Extremal Math & Lean 4 with Typographic Ligatures & Roman Numerals
  academicPaperLigatures: [
    'Abstract: We investigate the classi\uFB01cation and in\uFB02uence of di\uFB00erent non-so\uFB01c group actions in extremal combinatorics.',
    'The coe\uFB03cient pro\uFB01les of the di\uFB03culties in the a\uFB04uent and e\uFB03cient manifolds were veri\uFB01ed using the Lean 4 formalization kernel.',
    'Section \u2160: Formal De\uFB01nitions and \uFB02ag algebra foundations.',
    'Section \u2161: The con\uFB02ict between \uFB02exibility and e\uFB03cacy is resolved under the a\uFB03liated topologies.',
    'Section \u2162: Upper bounds on multicolored Ramsey numbers and Sidon sets.',
    'Section \u2163: Machine-checkable certi\uFB01cates in Lean 4 mathlib con\uFB01rming the absence of singularities.',
    'Conclusion: The resulting formal proof establishes that the su\uFB03cient condition holds for all bounded metric spaces.',
  ].join('\n'),

  // 2. High-Tech Distributed Systems Architecture Spec
  distributedSystemSpec: [
    'The microservices architecture employs an asynchronous event-driven model using Apache Kafka for message ingestion.',
    'In order to ensure fault tolerance, all service instances are deployed across three availability zones with automated failover.',
    'The API gateway performs rate limiting, authentication, and request routing with respect to tenant service-level agreements.',
    'It is worth noting that reinforcement learning models can be used to dynamically tune the connection pool sizing.',
    'As a consequence of the recent throughput benchmarks, we recommend migrating the caching tier to distributed memory grids.',
    'In accordance with our infrastructure guidelines, all telemetry logs must be formatted as structured JSON payloads.',
  ].join('\n'),

  // 3. Multi-Artifact Heterogeneous Technical Report (Ligatures + Prose + Math + Code)
  multiArtifactReport: [
    'Technical Evaluation: The classi\uFB01cation of large language models for formal proof generation.',
    '1. Performance Overview:',
    '- Theorem proving throughput: 42 proofs/hour',
    '- Verification accuracy: 100% (Lean 4 kernel checked)',
    '2. Key Architectural Components:',
    '- In-context dictionary learning for prompt compression',
    '- Retrieval augmented generation over mathlib lemmas',
    '3. Code snippet:',
    '```python',
    'def verify_proof(ctx, theorem):',
    '    if ctx.is_valid():',
    '        return {"status":"ok", "verified": True}',
    '    return {"status":"error", "reason": "timeout"}',
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
