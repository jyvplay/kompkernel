# Source fixtures

`sphinx.diff`, `isolation.diff`: complete GitHub diffs from sphinx-doc/sphinx
(BSD-2-Clause project). `django.diff`: complete GitHub diff from django/django
(BSD-3-Clause project). Preserve upstream authorship/copyright; provenance receipts
identify exact commits/parents and hashes. No truncation or content edits.
Upstream licenses: https://github.com/sphinx-doc/sphinx/blob/master/LICENSE.rst
and https://github.com/django/django/blob/main/LICENSE .

`rfc2119.txt`: complete RFC2119 mirror at cannatag/ldap3, original S. Bradner,
March1997. Source copyright/distribution notice retained; provenance in receipts.
This is a whole-document fixture, not a recent research citation.

`constructed.diff`: synthetic12-file mechanism witness generated in this session.
Hashes are deterministic test strings, not Git objects. It must never be described
as a real commit, heldout evidence, or proof of general-prose gains.
