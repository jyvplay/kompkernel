# proxy_bypass_registry uses unanchored re.match (Windows proxy bypass)

**@frenzymadness** opened on 2026-09-23T11:31:17Z

This was discussed here multiple times in the past so I'm opening it as a public bug report.

`src/requests/utils.py`, `proxy_bypass_registry` (main, 2.34.2):

```python
if re.match(test, host, re.I):   # start-anchored only
    return True
```

re.match anchors only the start, so ProxyOverride=google.com matches google.com.evil.com and bypasses the proxy for it — an attacker-influenced hostname can escape a proxy meant to inspect traffic.

Diverges from CPython: this is a copy of CPython's old code. CPython now matches with fnmatch (anchored both ends, wildcards preserved). Verified on 3.14:
- `fnmatch("google.com.evil.com", "google.com")` → False (requests returns True)
- `fnmatch("a.example.net", "*.example.net")` → True

Fix: use fnmatch(host, test) to match CPython, or minimally anchor: re.match(test + r"\Z", host, re.I).


---
**@nateprewitt** commented on 2026-09-23T14:41:07Z

Thanks for the issue, @frenzymadness. We're already tracking this work for our next release.

---
**@ege-arhan** commented on 2026-09-24T21:08:21Z

Not blocking — I know this is already tracked for the next release, just leaving a tested reference fix in case it's useful.

One-line change in `proxy_bypass_registry`: anchor the converted pattern so a suffix can't escape it:

```diff
- if re.match(test, host, re.I):
+ if re.match(test + r"\Z", host, re.I):
```

Behaviour I verified locally (Windows registry path monkeypatched, Python 3.13):

| override | host | before | after |
|---|---|---|---|
| `google.com` | `google.com.evil.com` | bypassed ❌ | proxied ✅ |
| `internal` | `internal` | bypassed | bypassed ✅ |
| `*.corp` | `a.corp.evil.com` | bypassed ❌ | proxied ✅ |
| `*.corp` | `a.corp` | bypassed | bypassed ✅ |
| `10.0.0.1` | `10.0.0.1x` | bypassed ❌ | proxied ✅ |

Existing exact and wildcard entries keep working because `fnmatch.translate` already emits `\Z` for them; only the plain-entry branch needs the extra anchor.

Branch: https://github.com/ege-arhan/requests/tree/fix/issue-7629 (`e825f8e7` fix + `eb5f5e45` regression tests added to the `test_should_bypass_proxies_win_registry` parametrize block, 5 cases). Happy to close this if the internal patch differs.


---
**@Maurenz2530** commented on 2026-09-26T10:50:52Z

I prepared a focused fix for the unanchored Windows ProxyOverride match. Exact entries still match and wildcard entries remain supported, while suffix hosts such as google.com.evil.com no longer bypass the proxy for google.com. Added exact-host and wildcard regression cases; the Windows registry-path tests pass locally (16 passed).\n\nBranch: https://github.com/Maurenz2530/requests/tree/fix-windows-proxy-bypass-anchor\nCompare: https://github.com/psf/requests/compare/main...Maurenz2530:fix-windows-proxy-bypass-anchor\nCommit: 6bfa9105\n\nI understand this is already tracked for a future release. GitHub does not allow me to open an upstream PR, so I’m sharing the tested branch in case it is useful to review or pull in.

---
**@januththedev** commented on 2026-09-27T02:29:50Z

I have a tested fix for this ready, but GitHub is currently refusing to let this account open a pull request against `psf/requests` (`CreatePullRequest` permission denied), so posting the patch here for a maintainer to apply or to let me open.

- branch: [`januththedev/requests:fix/proxy-override-anchor`](https://github.com/januththedev/requests/tree/fix/proxy-override-anchor)
- commit: `7b68766`

## The change

`src/requests/utils.py`:

```diff
             test = test.replace(".", r"\.")  # mask dots
             test = test.replace("*", r".*")  # change glob sequence
             test = test.replace("?", r".")  # change glob char
-            if re.match(test, host, re.I):
+            # The whole host must match. re.match only anchors the start, so
+            # "example.com" would also bypass the proxy for "example.com.evil.net".
+            if re.fullmatch(test, host, re.I):
                 return True
         return False
```

`re.fullmatch` is the smallest change that makes the intent explicit, and it matches what the `no_proxy` path already does — `test_should_bypass_proxies` in `tests/test_utils.py` already covers "does not greedily match domains that merely endswith the no_proxy entry. See CPython bpo-39057", so the registry path was the one left on the old behaviour.

The `<local>` branch above returns before reaching the pattern match, so it is unaffected.

## Tests

Four cases added to the existing `test_should_bypass_proxies_win_registry` table — two that fail before the change, and two controls that already passed:

| URL | ProxyOverride | Expected |
|---|---|---|
| `http://example.com.evil.net/` | `example.com` | `False` (was `True`) |
| `http://notexample.com/` | `example.com` | `False` (control, unchanged) |
| `http://www.example.com/` | `*.example.com` | `True` (control: globs still work) |
| `http://www.example.com.evil.net/` | `*.example.com` | `False` (was `True`) |

- Before: `2 failed, 14 passed`.
- After: `16 passed`.
- `pytest tests/test_utils.py` → 232 passed, 1 skipped.
- `ruff check` clean on both files.

The new cases inherit the existing `skipif(os.name != "nt")` guard, since `proxy_bypass_registry` only exists on `win32`.


---
**@XZQ173** commented on 2026-10-09T16:10:58Z

### Root cause

`proxy_bypass_registry()` in `src/requests/utils.py` builds a pattern from the Windows `ProxyOverride` registry value and matches it with `re.match()`, which **only anchors the start**. An override for `google.com` therefore also matched `google.com.evil.com`:

```python
test = test.replace(".", r"\.")   # mask dots
test = test.replace("*", r".*")   # change glob sequence
test = test.replace("?", r".")    # change glob char
if re.match(test, host, re.I):    # start-anchored only
    return True
```

Consequence: an attacker-influenced hostname can escape a proxy that was configured to inspect its traffic.

### Fix

Append `\Z` so the override must match the entire host:

```python
if re.match(test + r"\Z", host, re.I):
    return True
```

The glob translation is untouched, so existing overrides (`*.example.net`, `?`, etc.) keep behaving exactly as before — only unanchored suffix matches are now rejected.

Note: this function descends from an old copy of CPython's `proxy_bypass`, which now matches with `fnmatch` (anchored at both ends, wildcards preserved). Anchoring here is the **minimal** fix with no change to glob semantics; switching to `fnmatch` would also resolve the issue and better tracks CPython, if maintainers prefer that direction.

### Verification

Reproduced locally on Windows (Python 3.13, requests main @ `448d64a`-era):

- Before fix: `proxy_bypass_registry("google.com.evil.com")` → `True` (the bypass)
- After fix: `False`, while `google.com` → `True` and `*.example.net` still matches `a.example.net` → `True`
- Full `tests/test_utils.py`: 229 passed, 1 skipped

### Patch and regression test

This repository limits pull request creation to collaborators, so the branch is available on my fork instead:

- Branch: `https://github.com/Xx-173/requests/tree/fix/proxy-bypass-anchored-match`
- Commit: `3984164e`

It contains the one-line fix above plus `test_proxy_bypass_registry_does_not_match_host_suffixes` in `tests/test_utils.py` (Windows-only, matching the existing registry tests), which asserts:

- `proxy_bypass_registry("google.com")` is `True` (exact override still works)
- `proxy_bypass_registry("a.example.net")` is `True` (`*.example.net` glob still works)
- `proxy_bypass_registry("google.com.evil.com")` is `False` (suffix escape blocked)
- `proxy_bypass_registry("notgoogle.com")` is `False`

The test fails without the fix and passes with it.

Happy to turn this into a proper PR if collaborator status is granted, or feel free to cherry-pick from the branch above.

