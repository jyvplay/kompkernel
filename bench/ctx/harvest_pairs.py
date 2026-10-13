"""Harvest real revision pairs from PyPI sdists: the same text file in two adjacent releases.
Writes bench/tmp/ctx-pairs/<pkg>__<name>.{old,new} (gitignored) and bench/ctx/pairs-manifest.json (committed)."""
import hashlib, io, json, os, sys, tarfile, urllib.request, difflib, re

PKGS = ["requests", "click", "six", "attrs", "httpx", "rich", "tomli", "idna", "pluggy", "packaging",
        "typing_extensions", "urllib3", "certifi", "markdown-it-py", "pygments", "jinja2", "markupsafe",
        "filelock", "platformdirs", "tqdm", "wcwidth", "colorama", "docutils", "pyyaml", "toml", "more-itertools"]
EXT = (".py", ".md", ".rst", ".txt")
OUT = "bench/tmp/ctx-pairs"
os.makedirs(OUT, exist_ok=True)
os.makedirs("bench/ctx", exist_ok=True)

def get(url, timeout=60):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read()

def sdists(pkg):
    meta = json.loads(get(f"https://pypi.org/pypi/{pkg}/json"))
    rels = []
    for ver, files in meta["releases"].items():
        for f in files:
            if f["packagetype"] == "sdist" and f["filename"].endswith((".tar.gz", ".zip")) and f["filename"].endswith(".tar.gz"):
                rels.append((f["upload_time_iso_8601"], ver, f["url"], f["digests"]["sha256"]))
    rels.sort()
    return rels

def texts(url, sha):
    data = get(url, timeout=120)
    got = hashlib.sha256(data).hexdigest()
    if got != sha:
        raise SystemExit(f"sha mismatch {url}")
    out = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as t:
        for m in t.getmembers():
            if not m.isfile() or not m.name.endswith(EXT) or m.size < 3000 or m.size > 60000:
                continue
            rel = "/".join(m.name.split("/")[1:])
            out[rel] = t.extractfile(m).read()
    return out

manifest = []
for pkg in PKGS:
    try:
        rels = sdists(pkg)
    except Exception as e:
        print("skip", pkg, e, file=sys.stderr); continue
    if len(rels) < 2:
        continue
    # two most recent adjacent sdists
    (_, va, ua, sa), (_, vb, ub, sb) = rels[-2], rels[-1]
    try:
        A = texts(ua, sa); B = texts(ub, sb)
    except SystemExit as e:
        print(e, file=sys.stderr); continue
    for rel in sorted(set(A) & set(B)):
        a, b = A[rel], B[rel]
        if a == b:
            continue
        try:
            at, bt = a.decode("utf-8"), b.decode("utf-8")
        except UnicodeDecodeError:
            continue
        if re.search("[⟦⟧…]", at + bt):
            continue
        ratio = difflib.SequenceMatcher(None, at.splitlines(), bt.splitlines(), autojunk=False).ratio()
        if ratio < 0.5:
            continue
        name = f"{pkg}__{rel.replace('/', '__')}"
        open(f"{OUT}/{name}.old", "wb").write(a)
        open(f"{OUT}/{name}.new", "wb").write(b)
        manifest.append({"pkg": pkg, "file": rel, "oldVersion": va, "newVersion": vb,
                         "oldUrl": ua, "newUrl": ub, "oldSha256": hashlib.sha256(a).hexdigest(),
                         "newSha256": hashlib.sha256(b).hexdigest(), "oldBytes": len(a), "newBytes": len(b),
                         "lineRatio": round(ratio, 4)})
        print("pair", name, va, vb, len(a), len(b), round(ratio, 3), flush=True)
json.dump(manifest, open("bench/ctx/pairs-manifest.json", "w"), indent=1)
print("pairs", len(manifest))
