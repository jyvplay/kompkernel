# Native gate: NOT RUN

Paste the exact contents of httpx.txt or scalar-vite.txt as the sole user input
in a new basic chat. Do not supply a skills file, codec source, extra system
instructions, tools or the original source. Save the actual response verbatim,
record the model/settings/date and whether tool use was disabled, then use
`python3 bench/x146/native_check.py httpx response.txt` (or scalar-vite).

No model endpoint or independent clean-chat session was established here.
The current coding conversation has codec/source context, so an assistant's
illustrative decode here would not meet the requested clean-chat experiment.
The checker compares bytes; it cannot authenticate that an inference happened.
A successful one-example run would establish only that example/model/settings,
not universal native fidelity or a statistical reliability bound.
