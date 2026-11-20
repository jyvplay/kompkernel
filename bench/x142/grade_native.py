"""Grade actual saved native output. Does not call or simulate a model.
Usage: python3 bench/x142/grade_native.py krema path/to/raw-output.txt
No trimming, fence removal, Unicode normalization or newline rewriting.
"""
import sys,json,pathlib,hashlib
root=pathlib.Path(__file__).resolve().parents[2]
if len(sys.argv)!=3:raise SystemExit(__doc__)
cases=json.loads((root/'bench/x142/receipts/native-trial.json').read_text())['cases']
a=next(x for x in cases if x['codec']==sys.argv[1]);expected=(root/a['source']).read_bytes();actual=pathlib.Path(sys.argv[2]).read_bytes()
assert hashlib.sha256(expected).hexdigest()==a['sourceSha256']
print(json.dumps({'codec':a['codec'],'outputFile':sys.argv[2],'byteExact':actual==expected,'sourceBytes':len(expected),'outputBytes':len(actual),'outputSha256':hashlib.sha256(actual).hexdigest(),'provenance':'caller must supply actual model/session/settings; this grader verifies bytes only'},indent=2))
raise SystemExit(0 if actual==expected else 1)
