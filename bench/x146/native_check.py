"""Strict external basic-chat response checker. This does not call a model.
Usage: python3 bench/x146/native_check.py httpx response.txt
       python3 bench/x146/native_check.py scalar-vite response.txt
Do not strip fences, whitespace, or terminal newlines from the saved response.
"""
import pathlib,sys,json,hashlib
root=pathlib.Path(__file__).resolve().parents[2]
source={'httpx':'bench/x146/heldout/pypi-httpx.txt','scalar-vite':'bench/x144/heldout/vite.md'}
if len(sys.argv)!=3 or sys.argv[1]not in source:
 raise SystemExit('Provide lane httpx|scalar-vite and an actual model response file. No native test executed.')
a=(root/source[sys.argv[1]]).read_bytes();b=pathlib.Path(sys.argv[2]).read_bytes()
print(json.dumps({'lane':sys.argv[1],'sourceSha256':hashlib.sha256(a).hexdigest(),'responseSha256':hashlib.sha256(b).hexdigest(),'sourceBytes':len(a),'responseBytes':len(b),'byteExact':a==b,'provenance':'caller must separately record model, settings, clean-chat conditions and actual run; byte comparison alone cannot authenticate inference'},indent=2))
raise SystemExit(0 if a==b else 1)
