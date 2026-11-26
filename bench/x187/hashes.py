import hashlib,json
from pathlib import Path
root=Path('bench/x187');files=[Path('.gitattributes'),Path('.gitignore'),Path('src/lib/omega/diameris.ts'),Path('docs/codecs.md'),Path('docs/codec-abbreviations.md')]+[p for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts and (p.suffix!='.mjs' or p.name.endswith('-build.mjs')) and p.name!='hashes.json']
result={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)};(root/'receipts/hashes.json').write_text(json.dumps(result,indent=2));assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==h for p,h in result.items());print(len(result),'hashes verified')
