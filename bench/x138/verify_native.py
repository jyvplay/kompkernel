"""Score an externally collected bare-model response; this script does NOT run a model.
Usage: python3 bench/x138/verify_native.py path/to/raw-response.txt
Pass only receipts/native-existing-krema-message.txt as the model's single user message.
Do not trim fences/whitespace, add decoder tools, or supply the source.
"""
import sys,json,hashlib
from pathlib import Path
if len(sys.argv)!=2:raise SystemExit('Provide one raw response file; no model is invoked here.')
root=Path(__file__).resolve().parents[2]
expected=(root/'bench/x138/heldout/tar-help.txt').read_bytes()
actual=Path(sys.argv[1]).read_bytes()
exact=expected==actual
print(json.dumps({'exactBytes':exact,'expectedBytes':len(expected),'responseBytes':len(actual),'responseSHA256':hashlib.sha256(actual).hexdigest(),'warning':'File equality alone does not establish how the response was collected; retain model/version and blind trial provenance.'},indent=2))
raise SystemExit(0 if exact else 1)
