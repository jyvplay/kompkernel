"""Usage: python bench/x147/native_check.py /path/to/fresh-chat-response.txt
Submit native/geyser.txt as the sole user message in a NEW basic chat. No tools,
system decoder, examples, or source. Save the exact response bytes, not a cleaned
code block. This comparator does not run a model or establish provenance.
"""
import sys,json
from pathlib import Path
expected=Path('bench/x147/heldout/geyser.csv').read_bytes()
actual=Path(sys.argv[1]).read_bytes()
result={'exact':actual==expected,'expectedBytes':len(expected),'actualBytes':len(actual),'firstMismatch':next((i for i,(a,b) in enumerate(zip(actual,expected)) if a!=b),min(len(actual),len(expected)) if actual!=expected else None)}
print(json.dumps(result));sys.exit(0 if result['exact'] else 1)
