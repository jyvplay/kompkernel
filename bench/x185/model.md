# PERAS technical model

Experimental, unwired emitted-event-end anchored field copying. Name is a label, not a novelty claim. Classical relative: LZ-End; unlike canonical LZ-End it operates on ASCII-space fields, copies whole spans without the required new literal suffix, and prices a restricted greedy menu with the repository tokenizer.

Split exactly on ASCII space, retaining empty fields. Each input event emits either one literal field or `~i,n;`: copy n decoded fields ending at the earlier input event i's output end. Indices start at 1. A span may cross multiple previous event expansions; it cannot reference an interior end absent from the event-end table. Join with ASCII space. Tabs/CRLF stay inside fields. No Unicode normalization. Reserved tilde in a source causes encoder refusal. UTF-8-unstable strings refuse. Decoder rejects malformed markers, unavailable spans, forward/self references and expansion overflow.

Caps: 50,000 UTF-16 code units, 8,192 input/output fields, copy length 1–64; encoder widths 2,3,4,6,8,12,16,24,32,64. Six plans: maxima 8/32/64 × local token margin 0/2. Only most recently indexed endpoint per equal span is retained. Local raw segment versus reference token counts select a copy; full wire exact token count ranks plans. Local gain is **not** a globally optimal BPE segmentation, and this shortlist is not exhaustive.

Induction: after each event, `ends` records the cumulative decoded field count; a valid reference slices a previously emitted immutable range, yielding exactly the matched encoder span. Literals preserve field bytes; retained empty fields and exact ASCII joining reconstruct spacing. Domain check rejects unpaired surrogates. This argument concerns the specified inverse, not unassisted model behavior.

Forward paid composition: PERAS key + parent encoding of folded text; decode parent then PERAS. Outer composition: PERAS outer key + folded parent message; undo PERAS then decode restored parent. All key and parent bytes are charged. Native handoff cannot omit either key.

Let F be field count, L input units, W≤10 widths, M≤64 max width, P≤6 plans, and T(x) exact tokenizer work. Conservative encoder work O(P W M L + P F W T(L) + P T(L+key)); memory O(W M L + F + L) per plan (JSON substring keys, no linear-space theorem claimed). Decoder O(L + emitted units + 64F), memory O(L+F), bounded by the caps. Parent encoding can dominate and is not bounded by this expression; paid jobs have a 90-second process limit, not a universal CPU guarantee.

Comparators: GEITON (neighbor copying), APOUSIA (forced continuation), DIADOCHI (conditional successors), SYMFRAZ (context-indexed substitutions), ROPI (row edits). These are five existing implementations, not five new inventions. PERAS's visible syntax/endpoint restriction differs but all-stack semantic novelty is NOT_ESTABLISHED. No superiority over MONODROMOS/STOIBAS/LEXARITHMOS/KRYPTOLYSIS/DEIKTIS/SYMFRAZ/KYKLOS/METRIDA/KLADOS/FOTIA is asserted.

References: Dinklage 2024 arXiv:2409.07840; Bannai et al. 2023 DOI:10.4230/LIPIcs.CPM.2023.3. These concern classical parsing/phrase objectives, not this paid chat representation.
