# Non-string form field names raise AttributeError when files are attached

**@jbrown9513** opened on 2026-10-12T00:55:23Z

While testing an experimental version of [Perch](https://github.com/lakeday-org/perch), we found the following and figured it was worth a report.

A non-string key in `data` works for a urlencoded body, but the same `data` fails once `files` is added and the body becomes multipart. A non-string key in `files` fails the same way.

## Expected Result

The request prepares in both cases (the urlencoded path already accepts `{1: "a"}` and sends `1=a`), or a `TypeError` that names the field.

## Actual Result

```
AttributeError: 'int' object has no attribute 'translate'
```

raised from inside urllib3. `_encode_files` passes the field name straight to `RequestField(name=k, ...)` (`models.py:245`), which expects a `str`. Values are converted with `str()` a few lines earlier; names aren't.

## Reproduction Steps

```python
import requests

requests.Request("POST", "http://x", data={1: "a"}).prepare()
# works

requests.Request("POST", "http://x", data={1: "a"}, files={"f": b"x"}).prepare()
# AttributeError: 'int' object has no attribute 'translate'

requests.Request("POST", "http://x", files={1: b"x"}).prepare()
# AttributeError: 'int' object has no attribute 'translate'
```

## System Information

    $ python -m requests.help

```json
{
  "chardet": {
    "version": null
  },
  "charset_normalizer": {
    "version": "3.5.2"
  },
  "cryptography": {
    "version": ""
  },
  "idna": {
    "version": "3.20"
  },
  "implementation": {
    "name": "CPython",
    "version": "3.14.2"
  },
  "platform": {
    "release": "25.2.0",
    "system": "Darwin"
  },
  "pyOpenSSL": {
    "openssl_version": "",
    "version": null
  },
  "requests": {
    "version": "2.34.2"
  },
  "system_ssl": {
    "version": "30500040"
  },
  "urllib3": {
    "version": "2.8.0"
  },
  "using_charset_normalizer": true,
  "using_pyopenssl": false
}
```



---
**@nightcityblade** commented on 2026-10-12T03:14:57Z

Hi, I'd like to work on this. I'll submit a PR shortly.

---
**@nightcityblade** commented on 2026-10-12T03:15:53Z

I’m stepping back after reading the repository’s AI policy, so this issue is available for another contributor.

---
**@heyuhe2003** commented on 2026-10-12T20:56:06Z

Reproduced on 2.34.2 (current master), and the asymmetry is exactly as described. Scouting the fix site:

The multipart path at `src/requests/models.py:245` (`RequestField(name=k, ...)`) passes the key through untouched, while the *values* two loops above are normalized (`str(v)` for non-bytes, `field.decode("utf-8")` for bytes keys in the data loop). The urlencoded path never crashes because `urlencode` stringifies keys on the way out. So `data={1: "a"}` works, and the moment `files` flips the encoder to multipart, the raw int reaches urllib3's `escape` → `.translate` → `AttributeError`.

The minimal, consistent fix is to normalize the name the same way the surrounding code normalizes everything else, at the same one place:

```python
rf = RequestField(
    name=k.decode("utf-8") if isinstance(k, bytes) else str(k),
    data=fdata, filename=fn, headers=fh,
)
```

Notes for review:

- `str(k)` matches the value behavior five lines above (values are already `str()`-coerced) and the urlencoded path's eventual `urlencode` stringification — so `files={1: b"x"}` would send a `1` field name, same as `data={1: "a"}` sends `1=a`. Consistency argues for coercion, not `TypeError`.
- The `isinstance(k, bytes)` branch mirrors the data-field loop's `field.decode("utf-8")` (bytes keys crash at the identical site today, with the same `AttributeError`).
- Same file, same function, one statement — no behavior change for str keys, which is the entire existing test corpus.
- Test sketch: `prepare()` a multipart request with `data={1: "a"}, files={"f": b"x"}` and with `files={1: b"x"}`, assert `prepare().body` contains `name="1"`; assert bytes key `b"field"` yields `name="field"`.

Happy to open a PR for this if nobody's claimed it.


---
**@heyuhe2003** commented on 2026-10-12T23:19:09Z

Withdrawing my offer to open a PR: `.github/AI_POLICY.md` explicitly excludes agentic tools from submitting, and a patch authored under agent control can't certify the authorship clause. Leaving the analysis above for whoever picks this up — the one-line normalization at `models.py:245` (str-coerce, decode bytes keys) keeps the name behavior consistent with the value normalization already in the same function.


---
**@PranithaBoddu** commented on 2026-10-13T18:15:10Z

The issue can be reproduced locally. When a non-string field name is used in a request with file attachments, it raises an `AttributeError`.
Before working on a fix, I would like to clarify the intended behavior. Would it be preferable to convert non-string field names to strings for consistency, or to raise a `TypeError` for invalid field names?
