# Algebraic invariants — pencil-and-paper argument, not kernel-verified code

Let G be a finite sequence of distinct single-code-point names g_i with words
v_i over literals and names g_j for j<i. Literals are disjoint from the names.
Define E_G on words by concatenation and E_G(g_i)=E_G(v_i), with literal
characters fixed. The earlier-reference order makes this recursion finite.
Wire parsing, operator recognition, UTF-8 transport and tokenizer cost are
additional implementation obligations, not assumed to follow from this algebra.

## 1. Deletion

Delete rule k and replace every occurrence of g_k in later v_i and the body
with v_k. For i<k the expansion is unchanged. At i=k there is no surviving
rule. Induct on later surviving rules i: every replacement of g_k expands to
E_G(v_k)=E_G(g_k), and every other earlier name has unchanged expansion by the
induction hypothesis. Concatenation then gives identical expansion for v_i.
Apply the same argument to the body. Repeating this for a later-first sequence
of deletions preserves expansion at each step. This is not a claim that cost
falls, since E preserves text rather than its serialization.

## 2. Body remining

Append a fresh rule h=p, where p is a word over existing names and literals.
For each non-overlapping occurrence of p in body b, substitute h. Write
b=u_0 p u_1 p ... p u_k at exactly the selected split positions. New expansion
is E(u_0) E(h) E(u_1) ... E(h) E(u_k). By the definition of the appended rule,
E(h)=E(p), hence this equals E(b). Non-overlap is essential to the displayed
factorization; raw overlapping occurrence counts cannot certify either the
factorization or its cost. `split(...).join(...)` chooses non-overlapping
occurrences while the search's frequency proxy may overcount.

## 3. Tape factoring

Insert h=p after all names occurring in p, and rewrite occurrences only in
later rules and the body. Earlier rules are untouched, so E(h)=E(p) is well
founded and unchanged. Induct through later rules using the factorization in
(2). This proves equal expansion of every rewritten rule and then of the body.
If h is inserted before one of p's dependencies, this argument fails; the
implementation computes the insertion position from all referenced names.

## 4. Fresh renaming

For a name g and a fresh name h, apply the bijection g↦h to the definition name,
all rule right-hand sides, and body, leaving all other names/literals fixed.
The dependency graph is isomorphic and expansions correspond by induction.
Freshness is necessary: if h were an existing literal or name, the mapping
would not be injective on the alphabet and the induction would fail. The
implementation uses a deliberately conservative absent-from-source-and-wire
check, not only absence from definition names.

## 5. Topological relocation

Relocation does not change any rule's mapping name↦right-hand side. If the new
order remains topological, recursively evaluating the same finite dependency
DAG yields the same strings. Prove this by induction on dependency depth,
which is independent of the chosen topological order. The delimiter-free wire
must still parse into exactly that DAG; the final parent decoder comparison is
an extra check of this obligation, not implied by topological ordering alone.

## 6. Alias

Append fresh h=g. Replace any chosen subset of occurrences of g in the body by
h, leaving other positions unchanged. E(h)=E(g), so positionwise expansion and
concatenation preserve the body. The subset can be selected by left context;
that selection need not be communicated to the reader because h itself is
present at exactly those positions. The new rule definition is fully paid.
No claim follows that aliasing improves cost or that an LLM executes it reliably.

## Composition and acceptance

Composition of the above text-preserving maps preserves E_G(b). Nevertheless,
the actual reader has framing and operator semantics beyond E_G. The module
therefore evaluates candidates through the actual parent decoder before
accepting a cheaper one, and initially compares the parent to the exact source.
The final tests independently check reference token prices and Python decoding.
This is a justified engineering gate, not a formal verification of TypeScript,
its runtime, the reference tokenizer, or native model behavior.

Nothing here proves a profitable candidate exists, gives an approximation
factor for paid BPE, establishes all-stack novelty, or proves H− after failure.
