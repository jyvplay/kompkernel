# Add support for older AMD GPU gfx803, gfx802, gfx805 (e.g. Radeon RX 580, FirePro W7100)

**@dhiltgen** opened on 2024-02-11T22:15:37Z

Officially ROCm no longer supports these cards, but it looks like other projects have found workarounds.  Let's explore if that's possible.  Best case, built-in to our binaries.  Fall-back if that's not plausible is document how to build from source with the appropriate older ROCm library and AMD drivers installed on your system and build a local binary that works.


---
**@dhiltgen** commented on 2024-02-12T17:28:43Z

One interesting observation.  I managed to get my `gfx803` card not to crash with the invalid free by uninstalling the rocm libs on the host, and copying the exact libs from the build container over, however, when running models on the card, the responses were gibberish, so clearly it's more than just library dependencies and will require compile time changes.

---
**@Todd-Fulton** commented on 2024-02-20T02:10:00Z

I'm trying to get this working on an RX 580.
With the 6.0.0-2 rocm packages on arch, I was getting `free(): invalid pointer` from clinfo (maybe a related issue).

In the logs after sending a "prompt" (not sure of the lingo?).
```
rocBLAS error: Cannot read /opt/rocm/lib/rocblas/library/TensileLibrary.dat: Illegal seek for GPU arch : gfx803
```
I notice in the rocblas [cmake file](https://github.com/ROCm/rocBLAS/blob/d0ae2751477bfa109a754f1e05875920df9a125b/CMakeLists.txt#L113) file that they removed support for gfx803 for the 6.0.X builds, so I downgraded to the 5.7.1 packages and rebuilt ollama using the PKGBUILD from [#2473](https://github.com/ollama/ollama/issues/2473#issuecomment-1948524969)

Then when I sent the prompt I get this error:
```
Feb 19 19:43:16 tokyo ollama[130295]: /usr/lib64/gcc/x86_64-pc-linux-gnu/13.2.1/../../../../include/c++/13.2.1/bits/random.tcc:2665: void std::discrete_distribution<>::param_type::_M_initialize() [_IntType = int]: Assertion '__sum > 0' failed.
```

The assertion is coming from `stdlibc++` here, so maybe if I change the `PKGBUILD` to build a different version of ollama, that might get fixed, I'll try that next.

Not sure how much help I can be here, but I can test things out if needed.

This is the full output in the logs:
```
Feb 19 19:38:10 tokyo systemd[1]: Started Ollama Service.
Feb 19 19:38:10 tokyo ollama[130295]: time=2024-02-19T19:38:10.155-06:00 level=INFO source=images.go:863 msg="total blobs: 6"
Feb 19 19:38:10 tokyo ollama[130295]: time=2024-02-19T19:38:10.155-06:00 level=INFO source=images.go:870 msg="total unused blobs removed: 0"
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] [WARNING] Creating an Engine instance with the Logger and Recovery middleware already attached.
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] [WARNING] Running in "debug" mode. Switch to "release" mode in production.
Feb 19 19:38:10 tokyo ollama[130295]:  - using env:        export GIN_MODE=release
Feb 19 19:38:10 tokyo ollama[130295]:  - using code:        gin.SetMode(gin.ReleaseMode)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] POST   /api/pull                 --> github.com/jmorganca/ollama/server.PullModelHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] POST   /api/generate             --> github.com/jmorganca/ollama/server.GenerateHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] POST   /api/chat                 --> github.com/jmorganca/ollama/server.ChatHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] POST   /api/embeddings           --> github.com/jmorganca/ollama/server.EmbeddingHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] POST   /api/create               --> github.com/jmorganca/ollama/server.CreateModelHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] POST   /api/push                 --> github.com/jmorganca/ollama/server.PushModelHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] POST   /api/copy                 --> github.com/jmorganca/ollama/server.CopyModelHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] DELETE /api/delete               --> github.com/jmorganca/ollama/server.DeleteModelHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] POST   /api/show                 --> github.com/jmorganca/ollama/server.ShowModelHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] POST   /api/blobs/:digest        --> github.com/jmorganca/ollama/server.CreateBlobHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] HEAD   /api/blobs/:digest        --> github.com/jmorganca/ollama/server.HeadBlobHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] POST   /v1/chat/completions      --> github.com/jmorganca/ollama/server.ChatHandler (6 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] GET    /                         --> github.com/jmorganca/ollama/server.(*Server).GenerateRoutes.func2 (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] GET    /api/tags                 --> github.com/jmorganca/ollama/server.ListModelsHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] GET    /api/version              --> github.com/jmorganca/ollama/server.(*Server).GenerateRoutes.func3 (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] HEAD   /                         --> github.com/jmorganca/ollama/server.(*Server).GenerateRoutes.func2 (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] HEAD   /api/tags                 --> github.com/jmorganca/ollama/server.ListModelsHandler (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: [GIN-debug] HEAD   /api/version              --> github.com/jmorganca/ollama/server.(*Server).GenerateRoutes.func3 (5 handlers)
Feb 19 19:38:10 tokyo ollama[130295]: time=2024-02-19T19:38:10.155-06:00 level=INFO source=routes.go:999 msg="Listening on 127.0.0.1:11434 (version 0.1.24)"
Feb 19 19:38:10 tokyo ollama[130295]: time=2024-02-19T19:38:10.155-06:00 level=INFO source=payload_common.go:106 msg="Extracting dynamic libraries..."
Feb 19 19:38:10 tokyo ollama[130295]: time=2024-02-19T19:38:10.367-06:00 level=INFO source=payload_common.go:145 msg="Dynamic LLM libraries [rocm_v5 cpu cpu_avx cpu_avx2]"
Feb 19 19:38:10 tokyo ollama[130295]: time=2024-02-19T19:38:10.367-06:00 level=INFO source=gpu.go:94 msg="Detecting GPU type"
Feb 19 19:38:10 tokyo ollama[130295]: time=2024-02-19T19:38:10.367-06:00 level=INFO source=gpu.go:242 msg="Searching for GPU management library libnvidia-ml.so"
Feb 19 19:38:10 tokyo ollama[130295]: time=2024-02-19T19:38:10.374-06:00 level=INFO source=gpu.go:288 msg="Discovered GPU libraries: []"
Feb 19 19:38:10 tokyo ollama[130295]: time=2024-02-19T19:38:10.374-06:00 level=INFO source=gpu.go:242 msg="Searching for GPU management library librocm_smi64.so"
Feb 19 19:38:10 tokyo ollama[130295]: time=2024-02-19T19:38:10.374-06:00 level=INFO source=gpu.go:288 msg="Discovered GPU libraries: [/opt/rocm/lib/librocm_smi64.so.5.0]"
Feb 19 19:38:10 tokyo ollama[130295]: time=2024-02-19T19:38:10.378-06:00 level=INFO source=gpu.go:109 msg="Radeon GPU detected"
Feb 19 19:38:10 tokyo ollama[130295]: time=2024-02-19T19:38:10.378-06:00 level=INFO source=cpu_common.go:11 msg="CPU has AVX2"
Feb 19 19:43:06 tokyo ollama[130295]: [GIN] 2024/02/19 - 19:43:06 | 200 |      41.169µs |       127.0.0.1 | HEAD     "/"
Feb 19 19:43:06 tokyo ollama[130295]: [GIN] 2024/02/19 - 19:43:06 | 200 |     498.618µs |       127.0.0.1 | POST     "/api/show"
Feb 19 19:43:06 tokyo ollama[130295]: time=2024-02-19T19:43:06.221-06:00 level=INFO source=cpu_common.go:11 msg="CPU has AVX2"
Feb 19 19:43:06 tokyo ollama[130295]: time=2024-02-19T19:43:06.221-06:00 level=INFO source=cpu_common.go:11 msg="CPU has AVX2"
Feb 19 19:43:06 tokyo ollama[130295]: time=2024-02-19T19:43:06.221-06:00 level=INFO source=cpu_common.go:11 msg="CPU has AVX2"
Feb 19 19:43:06 tokyo ollama[130295]: time=2024-02-19T19:43:06.256-06:00 level=INFO source=dyn_ext_server.go:90 msg="Loading Dynamic llm server: /tmp/ollama460181430/rocm_v5/libext_server.so"
Feb 19 19:43:06 tokyo ollama[130295]: time=2024-02-19T19:43:06.256-06:00 level=INFO source=dyn_ext_server.go:145 msg="Initializing llama server"
Feb 19 19:43:06 tokyo ollama[130295]: ggml_init_cublas: GGML_CUDA_FORCE_MMQ:   no
Feb 19 19:43:06 tokyo ollama[130295]: ggml_init_cublas: CUDA_USE_TENSOR_CORES: yes
Feb 19 19:43:06 tokyo ollama[130295]: ggml_init_cublas: found 1 ROCm devices:
Feb 19 19:43:06 tokyo ollama[130295]:   Device 0: AMD Radeon RX 580 Series, compute capability 8.0, VMM: no
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: loaded meta data with 20 key-value pairs and 291 tensors from /var/lib/ollama/.ollama/models/blobs/sha256:3a43f93b78ec50f7c4e4dc8bd1cb3fff5a900e7d574c51a6f7495e48486e0dac (version GGUF V2)
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: Dumping metadata keys/values. Note: KV overrides do not apply in this output.
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv   0:                       general.architecture str              = llama
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv   1:                               general.name str              = codellama
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv   2:                       llama.context_length u32              = 16384
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv   3:                     llama.embedding_length u32              = 4096
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv   4:                          llama.block_count u32              = 32
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv   5:                  llama.feed_forward_length u32              = 11008
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv   6:                 llama.rope.dimension_count u32              = 128
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv   7:                 llama.attention.head_count u32              = 32
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv   8:              llama.attention.head_count_kv u32              = 32
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv   9:     llama.attention.layer_norm_rms_epsilon f32              = 0.000010
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv  10:                       llama.rope.freq_base f32              = 1000000.000000
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv  11:                          general.file_type u32              = 2
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv  12:                       tokenizer.ggml.model str              = llama
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv  13:                      tokenizer.ggml.tokens arr[str,32016]   = ["<unk>", "<s>", "</s>", "<0x00>", "<...
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv  14:                      tokenizer.ggml.scores arr[f32,32016]   = [0.000000, 0.000000, 0.000000, 0.0000...
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv  15:                  tokenizer.ggml.token_type arr[i32,32016]   = [2, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, ...
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv  16:                tokenizer.ggml.bos_token_id u32              = 1
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv  17:                tokenizer.ggml.eos_token_id u32              = 2
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv  18:            tokenizer.ggml.unknown_token_id u32              = 0
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - kv  19:               general.quantization_version u32              = 2
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - type  f32:   65 tensors
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - type q4_0:  225 tensors
Feb 19 19:43:06 tokyo ollama[130295]: llama_model_loader: - type q6_K:    1 tensors
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_vocab: mismatch in special tokens definition ( 264/32016 vs 259/32016 ).
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: format           = GGUF V2
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: arch             = llama
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: vocab type       = SPM
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_vocab          = 32016
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_merges         = 0
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_ctx_train      = 16384
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_embd           = 4096
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_head           = 32
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_head_kv        = 32
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_layer          = 32
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_rot            = 128
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_embd_head_k    = 128
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_embd_head_v    = 128
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_gqa            = 1
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_embd_k_gqa     = 4096
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_embd_v_gqa     = 4096
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: f_norm_eps       = 0.0e+00
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: f_norm_rms_eps   = 1.0e-05
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: f_clamp_kqv      = 0.0e+00
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: f_max_alibi_bias = 0.0e+00
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_ff             = 11008
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_expert         = 0
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_expert_used    = 0
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: rope scaling     = linear
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: freq_base_train  = 1000000.0
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: freq_scale_train = 1
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: n_yarn_orig_ctx  = 16384
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: rope_finetuned   = unknown
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: model type       = 7B
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: model ftype      = Q4_0
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: model params     = 6.74 B
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: model size       = 3.56 GiB (4.54 BPW)
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: general.name     = codellama
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: BOS token        = 1 '<s>'
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: EOS token        = 2 '</s>'
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: UNK token        = 0 '<unk>'
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_print_meta: LF token         = 13 '<0x0A>'
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_tensors: ggml ctx size =    0.22 MiB
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_tensors: offloading 32 repeating layers to GPU
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_tensors: offloading non-repeating layers to GPU
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_tensors: offloaded 33/33 layers to GPU
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_tensors:      ROCm0 buffer size =  3577.61 MiB
Feb 19 19:43:06 tokyo ollama[130295]: llm_load_tensors:        CPU buffer size =    70.35 MiB
Feb 19 19:43:07 tokyo ollama[130295]: .................................................................................................
Feb 19 19:43:07 tokyo ollama[130295]: llama_new_context_with_model: n_ctx      = 2048
Feb 19 19:43:07 tokyo ollama[130295]: llama_new_context_with_model: freq_base  = 1000000.0
Feb 19 19:43:07 tokyo ollama[130295]: llama_new_context_with_model: freq_scale = 1
Feb 19 19:43:07 tokyo ollama[130295]: llama_kv_cache_init:      ROCm0 KV buffer size =  1024.00 MiB
Feb 19 19:43:07 tokyo ollama[130295]: llama_new_context_with_model: KV self size  = 1024.00 MiB, K (f16):  512.00 MiB, V (f16):  512.00 MiB
Feb 19 19:43:07 tokyo ollama[130295]: llama_new_context_with_model:  ROCm_Host input buffer size   =    12.01 MiB
Feb 19 19:43:07 tokyo ollama[130295]: llama_new_context_with_model:      ROCm0 compute buffer size =   171.60 MiB
Feb 19 19:43:07 tokyo ollama[130295]: llama_new_context_with_model:  ROCm_Host compute buffer size =     8.80 MiB
Feb 19 19:43:07 tokyo ollama[130295]: llama_new_context_with_model: graph splits (measure): 3
Feb 19 19:43:07 tokyo ollama[130295]: time=2024-02-19T19:43:07.868-06:00 level=INFO source=dyn_ext_server.go:156 msg="Starting llama main loop"
Feb 19 19:43:07 tokyo ollama[130295]: loading library /tmp/ollama460181430/rocm_v5/libext_server.so
Feb 19 19:43:07 tokyo ollama[130295]: {"timestamp":1708393387,"level":"VERBOSE","function":"start_loop","line":266,"message":"have new task"}
Feb 19 19:43:07 tokyo ollama[130295]: {"timestamp":1708393387,"level":"VERBOSE","function":"start_loop","line":281,"message":"callback_all_task_finished"}
Feb 19 19:43:07 tokyo ollama[130295]: {"timestamp":1708393387,"level":"VERBOSE","function":"start_loop","line":302,"message":"wait for new task"}
Feb 19 19:43:07 tokyo ollama[130295]: {"timestamp":1708393387,"level":"VERBOSE","function":"start_loop","line":266,"message":"have new task"}
Feb 19 19:43:07 tokyo ollama[130295]: {"timestamp":1708393387,"level":"VERBOSE","function":"start_loop","line":278,"message":"callback_new_task"}
Feb 19 19:43:07 tokyo ollama[130295]: {"timestamp":1708393387,"level":"VERBOSE","function":"start_loop","line":281,"message":"callback_all_task_finished"}
Feb 19 19:43:07 tokyo ollama[130295]: {"timestamp":1708393387,"level":"VERBOSE","function":"update_slots","line":1623,"message":"prompt ingested","n_past":0,"cached":"","to_eval":" [INST] <<SYS>><</SYS>>\n\nWrite me a function that outputs the fibonacci sequence in C. [/INST]\n"}
Feb 19 19:43:16 tokyo ollama[130295]: /usr/lib64/gcc/x86_64-pc-linux-gnu/13.2.1/../../../../include/c++/13.2.1/bits/random.tcc:2665: void std::discrete_distribution<>::param_type::_M_initialize() [_IntType = int]: Assertion '__sum > 0' failed.
Feb 19 19:43:17 tokyo systemd[1]: ollama.service: Main process exited, code=dumped, status=6/ABRT
Feb 19 19:43:17 tokyo systemd[1]: ollama.service: Failed with result 'core-dump'.
Feb 19 19:43:17 tokyo systemd[1]: ollama.service: Consumed 5.707s CPU time.
Feb 19 19:43:20 tokyo systemd[1]: ollama.service: Scheduled restart job, restart counter is at 2.
```

---
**@Todd-Fulton** commented on 2024-02-20T05:53:54Z

I ended up disabling `_GLIBCXX_ASSERTIONS` in `/etc/makepkg.conf` and I am starting to get some responses, but they are gibberish, at least sometimes. I think the problem is in `llama.cpp`  perhaps some sort of UB in the use of `std::discrete_distribution` that was triggering the assert. [This](https://github.com/ggerganov/llama.cpp/blob/633782b8d949f24b619e6c68ee37b5cc79167173/llama.cpp#L9909) is the only place I could find it being used. And a [discussion](https://github.com/ggerganov/llama.cpp/discussions/2421) which seems to resemble what's going on.

This is where `libstdc++` was asserting in `c++/13.2.1/bits/random.tcc` on line 2665:
```
  template<typename _IntType>
    void
    discrete_distribution<_IntType>::param_type::
    _M_initialize()
    {
      ...
      const double __sum = std::accumulate(_M_prob.begin(),
					   _M_prob.end(), 0.0);
      __glibcxx_assert(__sum > 0);
      // Now normalize the probabilites.
      ...
    }
```
So it seems like the sum should be greater than 0, idk what the implications are, but that seems to be one of preconditions of using this type which `llama.cpp` is violating. May have some impact on the maths involved (which I am totally oblivious to).

I tried this:
`ollama run codellama "Write me a function that outputs the fibonacci sequence in C." `
and it just output a bunch of
`##############################` forever until I `ctrl-c`


Running the llama2 model:
```
>>> Why is the sky blue?
OOOlatooOwnGootUNSIreetOreoooohatГ GovernGBUNootIadruo delegladred EderGAootOALOO rangrehojection byther sywn�OOOLmoootGC�regnhatiloonoOWooAINTegruophonOalkOreouтоSIO го nobody.
```
I don't know if it's just messing with me, or if the bug is random.
Next try using codellama example:
```
➜  ollama-rocm git:(rocm) ✗ ollama run codellama                                                                
>>> Write me a function that outputs the fibonacci sequence
<details>
  <summary>Solution</summary>
  
``
def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)
``

This function uses a recursive approach to calculate the `n`th number in the Fibonacci sequence. The base case is when `n <= 1`, in which case the function returns `n` directly. Otherwise,
it calculates the result by adding the previous two values in the sequence.

For example:
``
fibonacci(0) -> 0
fibonacci(1) -> 1
fibonacci(2) -> fibonacci(1) + fibonacci(0) -> 1 + 0 -> 1
fibonacci(3) -> fibonacci(2) + fibonacci(1) -> (1 + 0) + 1 -> 2
fibonacci(4) -> fibonacci(3) + fibonacci(2) -> (2 + 1) + 1 -> 4
fibonacci(5) -> fibonacci(4) + fibonacci(3) -> (4 + 2) + 1 -> 7
``

</details>
>>> Now do the same in C++
<details>
  <summary>Solution</summary>
  
``
int fibonacci(int n) {
    if (n <= 1) {
        return n;
    } else {
        return fibonacci(n-1) + fibonacci(n-2);
    }
}
``
This function uses a recursive approach to calculate the `n`th number in the Fibonacci sequence. The base case is when `n <= 1`, in which case the function returns `n` directly. Otherwise,
it calculates the result by adding the previous two values in the sequence.

For example:
``
fibonacci(0) -> 0
fibonacci(1) -> 1
fibonacci(2) -> fibonacci(1) + fibonacci(0) -> 1 + 0 -> 1
fibonacci(3) -> fibonacci(2) + fibonacci(1) -> (1 + 0) + 1 -> 2
fibonacci(4) -> fibonacci(3) + fibonacci(2) -> (2 + 1) + 1 -> 4
fibonacci(5) -> fibonacci(4) + fibonacci(3) -> (4 + 2) + 1 -> 7
``

</details>

```
```
ollama run llama2 "Why is the sky blue?"
 pedkO NO NO  O-   a                          dark in  a  .     to  in   of’ in  gar  a  of     in aj            a                           .  for  dark    in  a   at a   in   a a in     
a     a   of   to     the    IN of aj    very  gall    dark   in    and in     in     gar      in   dark         a  ap  for    the a  theaj  pro      .  in   in  gall IN  will  a of   and 
’aj gar to  in O in  in  to a no    no of   ofaj a can  to  dark a by for the    in   pro gall of  ap a   dark in  and have   f of a  for are   ’  that   a in by  under only’ a. in  rock  
the aaj a gar in  no due as in  to gar   in  friendly  a in     a   a  dark a  in     a in       for  aj to a  in dark in   have   a ofaj   a by a         a    were     a   in  a   at dark
 very the gall a gar  . ap ano a a CL a aj  a  the a  aj  to   as  gallaj     in     aj   aaj of  and   gar. of in f  a  in  at  dark    will    dark    a                for  in     of a  
in    to     following the  a   to   in a   aj CL  dark    in a       aj     gall a    a  gar aj O a          aj for  of in  a   a  friendly   and  a    a the dark  in     to  a   dark    
a in a   in    gar    to gar   as ajaj   a  that   for        the of  in   at       friendly  O     gall       previous  a in     a a  ’     dark  back        aj in                   the  
 a   a  to    a     a    a         a              in     aj   a    at  in aj aj a  of   a  gar           a              in        the       for IN     aj         in  a           ^V     in a 
 in   in^C
```

```
➜  ollama-rocm git:(rocm) ✗ ollama run codellama "Write me a function that outputs the fibonacci sequence in C."  

Here's an example of how you could calculate the Fibonacci sequence in C:
``
#include <stdio.h>

int main() {
  int n, i;
  long long int fib[n];

  // Ask user for input
  printf("Enter a number: ");
  scanf("%d", &n);

  // Initialize first two elements of the sequence
  fib[0] = 0;
  fib[1] = 1;

  // Calculate remaining elements of the sequence
  for (i = 2; i < n; i++) {
    fib[i] = fib[i-1] + fib[i-2];
  }

  // Output the calculated sequence
  printf("The Fibonacci sequence is: ");
  for (i = 0; i < n; i++) {
    printf("%lld ", fib[i]);
  }

  return 0;
}
``
This program will ask the user to input a number `n`, and then calculate the first `n` elements of the Fibonacci sequence. The output will be the calculated sequence, with each element 
separated by a space.

For example, if the user inputs `5`, the output will be:
``
The Fibonacci sequence is: 0 1 1 2 3 5
``
Note that this program uses an array to store the elements of the sequence, and loops through the elements to calculate them. The `long long int` type is used to avoid overflowing the 
integer range when calculating larger Fibonacci numbers.
```

---
**@wilkensgomes** commented on 2024-02-20T15:58:25Z

@Todd-Fulton Same error here. do you know how fix this ?

---
**@Todd-Fulton** commented on 2024-02-21T16:23:53Z

@wilkensgomes 
for the error
`rocBLAS error: Cannot read /opt/rocm/lib/rocblas/library/TensileLibrary.dat: Illegal seek for GPU arch : gfx803`

I downgraded to 5.7.1 rocm packages using [downgrade](https://github.com/archlinux-downgrade/downgrade) on arch linux and then added them to Ignore at the end of the installation so that they don't get upgraded to 6.X packages. 

For the error:
`Feb 19 19:43:16 tokyo ollama[130295]: /usr/lib64/gcc/x86_64-pc-linux-gnu/13.2.1/../../../../include/c++/13.2.1/bits/random.tcc:2665: void std::discrete_distribution<>::param_type::_M_initialize() [_IntType = int]: Assertion '__sum > 0' failed.`

I turned off `_GLIBCXX_ASSERTIONS` when building ollama, in `/etc/makepkg.conf`
```sh
# CXXFLAGS="$CFLAGS -Wp,-D_GLIBCXX_ASSERTIONS"
CXXFLAGS="$CFLAGS"
```
There might be a better way to disabling this in the PKGBUILD file just for building ollama/llama.cpp, but I haven't bothered with it, and just disabled the assertions globally.

Reading over the [discussion](https://github.com/ggerganov/llama.cpp/discussions/2421) for the second error, the gibberish happens after disabling the asserts, as the initialize method for `std::discrete_distribution<>` requires that the sum of the probabilities are greater than 0, this make sense. AFAIK it doesn't make sense for a probability to be negative, or NAN, or all 0, which are the cases I can think of that would trigger the assertion after summing the probabilities.

So as far as I can tell the gibberish is a result from certain models and small input prompts as said in the conversation. Somewhere between the model and the calculation of the probabilities, either some of them are negative, all are zero, or there is a NaN in there. For example, if for some reason a probability is a result of dividing a float by 0.0 `p =  x / y where y is 0.0` then `p = NaN` and then when `llama.cpp` calls `llama_sample_token()` and `std::discrete_distribution` calls `std::accumulate` then the result will be `NaN`, I can only imagine how that would mess up the LLM when trying to figure out the next word to use. At least this is as far as my understanding goes.

Apart from some of the smaller models and a small input prompts that produce gibberish, everything has been working for me since yesterday. I'm not even sure if the gibberish is particular to polaris gpus. I spent a few hours using llama2:13b as a Dungeon Master yesterday, was mind blowing. 


---
**@Todd-Fulton** commented on 2024-02-26T22:51:36Z

I'm still getting familiar with these code bases, but I did some print debugging in `llama_sample_softmax` and `llama_sample_token` and sure enough, there are nans everywhere on short prompt, it's fairly reproducible on my end.

I built both ollama and llama.cpp from their respective main branches, but took out the check for AMD version > 9 in ollama.

In file `llama.cpp`, with the logging that I put in.
```c++
void llama_sample_softmax(struct llama_context * ctx, llama_token_data_array * candidates) {
    //...
    //...
    float max_l = candidates->data[0].logit;
    float cum_sum = 0.0f;
    std::stringstream plogs;
    for (size_t i = 0; i < candidates->size; ++i) {
        float p = expf(candidates->data[i].logit - max_l);
        candidates->data[i].p = p;
        cum_sum += p;
    }
    for (size_t i = 0; i < candidates->size - 1; ++i) {
        candidates->data[i].p /= cum_sum;
        plogs << "{ token: " << candidates->data[i].id
            << ", probability: " << candidates->data[i].p
            << ", logit: " << candidates->data[i].logit
            << "},\n";
    }
    candidates->data[candidates->size - 1].p /= cum_sum;
    plogs << "{ token: " << candidates->data[candidates->size - 1].id
        << ", probability: " << candidates->data[candidates->size - 1].p
        << ", logit: " << candidates->data[candidates->size - 1].logit
        << " }\n";

    std::string plogs_string = plogs.str();

    LLAMA_LOG_INFO("Probabilities: [%s]\n", plogs_string.data());
    //...
}
```

I'll do my best to track down where the nans are coming from, it might be the gpu, which I have little experience in. I might try building rocm6.x from source if I can find an option to enable gfx803 support in the cmake files, and then build against that in case it's a bug in rocm 5.7.1 that I have installed.

Short prompt, nans, nans everywhere:
```
➜  ollama-rocm ollama run llama2
>>> Why is the sky blue?
####################################################################################^C

[Server side]
{"cached":"","function":"update_slots","level":"VERB","line":1876,"msg":"prompt ingested","n_past":0,"tid":"139442878678720","timestamp":1708984989,
"to_eval":" [INST] <<SYS>><</SYS>>\n\nWhy is the sky blue? [/INST]\n"}
Probabilities: [{ token: 38, probability: nan, logit: nan},
{ token: 22, probability: nan, logit: nan},
{ token: 10, probability: nan, logit: nan},
{ token: 34, probability: nan, logit: nan},
{ token: 26, probability: nan, logit: nan},
{ token: 18, probability: nan, logit: nan},
{ token: 20, probability: nan, logit: nan},
{ token: 4, probability: nan, logit: nan},
{ token: 24, probability: nan, logit: nan},
{ token: 12, probability: nan, logit: nan},
{ token: 32, probability: nan, logit: nan},
{ token: 28, probability: nan, logit: nan},
{ token: 16, probability: nan, logit: nan},
{ token: 36, probability: nan, logit: nan},
{ token: 8, probability: nan, logit: nan},
{ token: 39, probability: nan, logit: nan},
{ token: 9, probability: nan, logit: nan},
{ token: 21, probability: nan, logit: nan},
{ token: 1, probability: nan, logit: nan},
{ token: 23, probability: nan, logit: nan},
{ token: 11, probability: nan, logit: nan},
{ token: 25, probability: nan, logit: nan},
{ token: 5, probability: nan, logit: nan},
{ token: 27, probability: nan, logit: nan},
{ token: 13, probability: nan, logit: nan},
{ token: 31, probability: nan, logit: nan},
{ token: 29, probability: nan, logit: nan},
{ token: 15, probability: nan, logit: nan},
{ token: 33, probability: nan, logit: nan},
{ token: 7, probability: nan, logit: nan},
{ token: 35, probability: nan, logit: nan},
{ token: 17, probability: nan, logit: nan},
{ token: 37, probability: nan, logit: nan},
{ token: 3, probability: nan, logit: nan},
{ token: 19, probability: nan, logit: nan},
{ token: 0, probability: nan, logit: nan},
{ token: 2, probability: nan, logit: nan},
{ token: 6, probability: nan, logit: nan},
{ token: 14, probability: nan, logit: nan},
{ token: 30, probability: nan, logit: nan }
]
```

A little bit longer prompt, the calculations look right here:
```
>>> Why is the sky blue? Please explain it like I'm 5 years old. Use colorful language, but try
... to also explain the science.

Oh my goodness, let me tell you a secret about the sky! *winks* It's so cool! *excited
tone* The sky is blue because of something called light. *giggles* You know how things can
look different colors when the light hits them from different angles? Like how a red apple
looks red when the sun shines on it, but green when it's in shadow? Well, the sky does
that too! *excited nod*

So, when the sun shines on the Earth, it sends out all sorts of different colored lights.
*giggles* Like, did you know that light can be red, orange, yellow, green, blue, and
purple? Yep! And when these colors hit the Earth's atmosphere, they bounce around and mix
together to make the sky look blue! It's like a big ol' party in the sky! *giggles*
....
....

[Server Side]
{"cached":"","function":"update_slots","level":"VERB","line":1876,"msg":"prompt ingested","n_past":0,"tid":"137691662386880","timestamp":1708985350,
"to_eval":" [INST] <<SYS>><</SYS>>\n\nWhy is the sky blue? Please explain it like I'm 5 years old.
 Use colorful language, but try to also explain the science. [/INST]\n"}
Probabilities: [{ token: 13, probability: 0.999558, logit: 24.8022},
{ token: 9048, probability: 0.000197175, logit: 16.2713},
{ token: 6439, probability: 0.000159607, logit: 16.0599},
{ token: 243, probability: 2.25609e-05, logit: 14.1034},
{ token: 23170, probability: 1.64754e-05, logit: 13.789},
{ token: 18527, probability: 9.54511e-06, logit: 13.2432},
{ token: 11284, probability: 5.65038e-06, logit: 12.7189},
{ token: 29956, probability: 4.85538e-06, logit: 12.5673},
{ token: 7030, probability: 4.57228e-06, logit: 12.5072},
{ token: 9360, probability: 3.22113e-06, logit: 12.1569},
{ token: 2, probability: 3.0808e-06, logit: 12.1124},
{ token: 17565, probability: 2.19157e-06, logit: 11.7718},
{ token: 18637, probability: 2.17322e-06, logit: 11.7634},
{ token: 5674, probability: 1.88993e-06, logit: 11.6237},
{ token: 3611, probability: 1.08913e-06, logit: 11.0725},
{ token: 3257, probability: 8.80308e-07, logit: 10.8597},
{ token: 29930, probability: 7.47415e-07, logit: 10.696},
{ token: 9070, probability: 6.84936e-07, logit: 10.6087},
{ token: 1148, probability: 6.06698e-07, logit: 10.4874},
{ token: 29979, probability: 5.32776e-07, logit: 10.3575},
{ token: 9806, probability: 4.99208e-07, logit: 10.2924},
{ token: 2776, probability: 4.0466e-07, logit: 10.0825},
{ token: 8187, probability: 3.9383e-07, logit: 10.0553},
{ token: 29949, probability: 3.60271e-07, logit: 9.96626},
{ token: 10994, probability: 3.32183e-07, logit: 9.88509},
{ token: 29898, probability: 2.46243e-07, logit: 9.58573},
{ token: 1068, probability: 2.04658e-07, logit: 9.40075},
{ token: 27269, probability: 1.98792e-07, logit: 9.37167},
{ token: 827, probability: 1.87496e-07, logit: 9.31317},
{ token: 5872, probability: 1.8679e-07, logit: 9.30939},
{ token: 5634, probability: 1.83938e-07, logit: 9.29401},
{ token: 22110, probability: 1.67096e-07, logit: 9.19798},
{ token: 1532, probability: 1.5426e-07, logit: 9.11805},
{ token: 229, probability: 1.44642e-07, logit: 9.05367},
{ token: 9800, probability: 1.24852e-07, logit: 8.90654},
{ token: 399, probability: 1.23796e-07, logit: 8.89804},
{ token: 14962, probability: 1.16326e-07, logit: 8.83581},
{ token: 8851, probability: 1.08058e-07, logit: 8.76208},
{ token: 29909, probability: 1.06776e-07, logit: 8.75014},
{ token: 8879, probability: 9.68724e-08, logit: 8.6528 }
]
```


More detailed logs:
[llama.cpp.good.log](https://github.com/ollama/ollama/files/14411946/llama.cpp.good.log)
[llama.cpp.nan.log](https://github.com/ollama/ollama/files/14411947/llama.cpp.nan.log)


---
**@ianlacerda** commented on 2024-02-27T21:03:20Z

Is it not possible to create a docker image that supports gfx803? It would be easier than doing trial and error. Two weeks ago I was trying to install Ollama for my RX580 and I was only able to use the CPU due to conflicting dependencies on Arch Linux and Ubuntu 22.04.

---
**@Todd-Fulton** commented on 2024-03-01T23:55:01Z

This [issue](https://github.com/ggerganov/llama.cpp/issues/5355) on llama.cpp seems to be the same bug. 

I'm currently going through the Rocm stack and building it from source using the main branches and trying to find out if I can reintroduce rx580 "support" with patches if needed. I will put up a script and patches if I'm successful in that and it solves the problem. We could create a docker image from that script, or just use the script to create binary packages, or PKGBUILDS if it comes to that. Various parts of the stack still seem to "support" gfx803 (rx580), while other seem to have at least officially dropped it, like rocBLAS (though it might still work if I just patch up the build scripts).

I don't think this is a bug in ollama, but further down the stack. For example, [clr](https://github.com/ROCm/clr) introduced a `free(): invalid pointer` bug somewhere between 6.0.0 (unreleased) and 6.0.2 tags, that was the reason I downgraded to 5.7.1. So it's a matter of finding which commit introduced that bug.

As for the gibberish, I think that's a result of `nans` coming from somewhere. It seems to be specific to gfx803, otherwise a lot more users would be reporting it, and that bug also occurs in rocm 5.7.1.

It might be worth trying even older versions of rocm than 5.7.1 if ollama and llama.cpp are still compatible with those, at least in the meantime. Adding support for older gpus without requiring downgrading rocm doesn't seem possible if rocm isn't going to support older gpus in the first place, users would still have to install older versions, or at least would require re-implementing that functionality.

If the gibberish is coming from clBLAST, then that narrows that down and rocm support for older gpus is just a side issue, I think users will either have to work on support in the open source, or just use older packages.
