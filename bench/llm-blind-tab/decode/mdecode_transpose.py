# Mechanical decode of visible/msg_3.txt: expand tape rules (decode/mdecode.py), then transpose
# (each output line is one column; row i takes cell i of every line), per the visible instruction.
import subprocess, sys
src = sys.argv[1]; dst = sys.argv[2]
raw = subprocess.run([sys.executable, 'decode/mdecode.py', src], capture_output=True, text=True, check=True).stdout
cols = [l.split(',') for l in raw.rstrip('\n').split('\n')]
rows = [[cols[j][i] for j in range(len(cols))] for i in range(len(cols[0]))]
open(dst, 'w', encoding='utf-8').write('\n'.join(','.join(r) for r in rows) + '\n')
