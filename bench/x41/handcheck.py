"""
Independent reference decode of the SYSTOLE layer, written from the clause text
alone and deliberately NOT importing systole.ts.

The clause in the message says:
    Restore separators: 10:##.########, 9:##.#######, 8:####-##-##.

Reading it literally: for a run of N digits, lay the digits out under the '#'
places of the given shape and copy the separators across. This reimplements
exactly that, in a different way (index map built from the rendered shape,
rather than walking the shape string), and checks it against the real source.
"""
import re, sys, hashlib

CLAUSE = "Restore separators: 10:##.########, 9:##.#######, 8:####-##-##."

# parse "N:shape" pairs out of the clause text
specs = {}
for n, shape in re.findall(r"(\d+):([\d#.:;\-]+)", CLAUSE):
    shape = shape.rstrip(".")
    # build a list of ("digit", None) / ("sep", ch) slots from the rendered shape
    slots, i = [], 0
    while i < len(shape):
        ch = shape[i]
        if ch == "#":
            j = i
            while j < len(shape) and shape[j] == "#":
                j += 1
            for _ in range(j - i):
                slots.append(("digit", None))
            i = j
        else:
            slots.append(("sep", ch)); i += 1
    specs[int(n)] = slots
    print(f"  parsed {n} digits -> shape {shape}  ({sum(1 for s in slots if s[0]=='digit')} digit places, "
          f"{sum(1 for s in slots if s[0]=='sep')} separators)")

def restore(text):
    out, pos = [], 0
    for m in re.finditer(r"\d+", text):
        slots = specs.get(len(m.group(0)))
        if slots is None:
            continue
        digits, k = m.group(0), 0
        assert sum(1 for s in slots if s[0] == "digit") == len(digits), "shape does not fit"
        rebuilt, k = "", 0
        for t, ch in slots:
            if t == "digit":
                rebuilt += digits[k]; k += 1
            else:
                rebuilt += ch
        out.append(text[pos:m.start()]); out.append(rebuilt); pos = m.end()
    out.append(text[pos:])
    return "".join(out)

src = open(sys.argv[1]).read()
mid = open(sys.argv[2]).read()      # contracted text (what the stack yields)
back = restore(mid)
print()
print("  source lines[0:3] ", src.split("\n")[0:3])
print("  contracted[0:3]   ", mid.split("\n")[0:3])
print("  restored[0:3]     ", back.split("\n")[0:3])
print()
print("  identical         ", back == src)
print("  md5 src           ", hashlib.md5(src.encode()).hexdigest())
print("  md5 restored      ", hashlib.md5(back.encode()).hexdigest())
