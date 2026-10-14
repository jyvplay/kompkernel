# AMD GPU & ROCm support

**@deadmeu** opened on 2023-10-08T14:53:24Z

I have a 7900XT and would definitely love to have ROCm support. It seems like it might be coming with https://github.com/jmorganca/ollama/pull/667?

I couldn't find a dedicated issue for this so I'm creating this one to track it.

Edit: For those interested in this feature, follow https://github.com/jmorganca/ollama/pull/814.


---
**@jmorganca** commented on 2023-10-08T17:19:14Z

Thanks for creating an issue. Keep an eye on https://github.com/jmorganca/ollama/pull/667

---
**@65a** commented on 2023-10-08T17:31:45Z

It works if you apply that patch locally and follow the updated readme/build instructions. My w7900 unfortunately had to go back to AMD for replacement because it liked to hang up in VBIOS during some boots, but I'd love to hear if you can patch locally and run it successfully. I have a RX6950 and Instinct Mi60 I am testing with currently. Should be as easy as (assuming you have ROCm and CLBlast installed):
```
git clone --recursive https://github.com/65a/ollama
```
```
cd ollama
```
```
ROCM_PATH=/opt/rocm CLBlast_DIR=/usr/lib/cmake/CLBlast go generate -tags rocm ./...
```
```
go build -tags rocm
```
And that should give you a ROCm-compatible ollama binary in the current directory.

Some notes: if ROCm fails, it will fall back to CPU, so you want to look carefully at the logs. Let me know if you see that happen (the symptom of course would also include low tokens/s). For reference, I just tested these instructions and I get about 11 tok/s on gfx906 (Mi60) with a 25gb q8_0 model, a 7900 (gfx1100) should do much better.

---
**@deadmeu** commented on 2023-10-09T05:06:04Z

@65a thanks for the quick help. Unfortunately, it does seem to be falling back to the CPU. Here's what I did:

1. I cloned the repo using `git clone --recursive https://github.com/65a/ollama`
2. I cd'd inside the repo and installed the required dependencies for my distro (Arch): `sudo pacman -S rocm-hip-sdk rocm-opencl-sdk clblast go`
3. I ran `ROCM_PATH=/opt/rocm CLBlast_DIR=/usr/lib/cmake/CLBlast go generate -tags rocm ./...`
4. When the tags were generated I ran `go build -tags rocm`
5. This gave me a binary which I then ran twice, once to `./ollama serve` and then in another terminal `./ollama run codellama:34b`
6. Sending a test message resulted in the CPU being used to generate a response.

Here's what I'm getting in the output of the server:
```
2023/10/09 14:58:15 images.go:995: total blobs: 21
2023/10/09 14:58:15 images.go:1002: total unused blobs removed: 0
[GIN-debug] [WARNING] Creating an Engine instance with the Logger and Recovery middleware already attached.

[GIN-debug] [WARNING] Running in "debug" mode. Switch to "release" mode in production.
 - using env:	export GIN_MODE=release
 - using code:	gin.SetMode(gin.ReleaseMode)

[GIN-debug] POST   /api/pull                 --> github.com/jmorganca/ollama/server.PullModelHandler (5 handlers)
[GIN-debug] POST   /api/generate             --> github.com/jmorganca/ollama/server.GenerateHandler (5 handlers)
[GIN-debug] POST   /api/embeddings           --> github.com/jmorganca/ollama/server.EmbeddingHandler (5 handlers)
[GIN-debug] POST   /api/create               --> github.com/jmorganca/ollama/server.CreateModelHandler (5 handlers)
[GIN-debug] POST   /api/push                 --> github.com/jmorganca/ollama/server.PushModelHandler (5 handlers)
[GIN-debug] POST   /api/copy                 --> github.com/jmorganca/ollama/server.CopyModelHandler (5 handlers)
[GIN-debug] DELETE /api/delete               --> github.com/jmorganca/ollama/server.DeleteModelHandler (5 handlers)
[GIN-debug] POST   /api/show                 --> github.com/jmorganca/ollama/server.ShowModelHandler (5 handlers)
[GIN-debug] GET    /                         --> github.com/jmorganca/ollama/server.Serve.func2 (5 handlers)
[GIN-debug] GET    /api/tags                 --> github.com/jmorganca/ollama/server.ListModelsHandler (5 handlers)
[GIN-debug] HEAD   /                         --> github.com/jmorganca/ollama/server.Serve.func2 (5 handlers)
[GIN-debug] HEAD   /api/tags                 --> github.com/jmorganca/ollama/server.ListModelsHandler (5 handlers)
2023/10/09 14:58:15 routes.go:579: Listening on 127.0.0.1:11434
2023/10/09 14:58:15 accelerator_rocm.go:32: warning: ROCM_PATH is not set. Trying a likely fallback path, but it is recommended to set this variable in the environment.
2023/10/09 14:58:15 accelerator_rocm.go:71: ROCm presenting 18512 MiB of available VRAM on device "card0"
[GIN] 2023/10/09 - 14:58:20 | 200 |        44.1µs |       127.0.0.1 | HEAD     "/"
[GIN] 2023/10/09 - 14:58:20 | 200 |     408.951µs |       127.0.0.1 | GET      "/api/tags"
2023/10/09 14:58:20 accelerator_rocm.go:32: warning: ROCM_PATH is not set. Trying a likely fallback path, but it is recommended to set this variable in the environment.
2023/10/09 14:58:20 accelerator_rocm.go:71: ROCm presenting 18523 MiB of available VRAM on device "card0"
2023/10/09 14:58:20 llama.go:219: filesize is 18169 MiB, with 48 layers. Assuming 378 MiB per layer
2023/10/09 14:58:20 llama.go:220: 18523 MiB VRAM available, loading up to 48 GPU layers
2023/10/09 14:58:20 llama.go:283: llama runner not found: stat /tmp/ollama1555236189/llama.cpp/ggml/build/rocm/bin/ollama-runner: no such file or directory
2023/10/09 14:58:20 llama.go:300: starting llama runner
2023/10/09 14:58:20 llama.go:337: waiting for llama runner to start responding
{"timestamp":1696827500,"level":"WARNING","function":"server_params_parse","line":845,"message":"Not compiled with GPU offload support, --n-gpu-layers option will be ignored. See main README.md for information on enabling GPU BLAS support","n_gpu_layers":0}
{"timestamp":1696827500,"level":"INFO","function":"main","line":1190,"message":"build info","build":1,"commit":"9e232f0"}
{"timestamp":1696827500,"level":"INFO","function":"main","line":1192,"message":"system info","n_threads":12,"total_threads":24,"system_info":"AVX = 1 | AVX2 = 1 | AVX512 = 0 | AVX512_VBMI = 0 | AVX512_VNNI = 0 | FMA = 1 | NEON = 0 | ARM_FMA = 0 | F16C = 1 | FP16_VA = 0 | WASM_SIMD = 0 | BLAS = 0 | SSE3 = 1 | VSX = 0 | "}
llama.cpp: loading model from /home/alex/.ollama/models/blobs/sha256:bcc2734eb66318d6bbbc677681b3165817a5fc15fb68b490829a119a9d97cab4
llama_model_load_internal: format     = ggjt v3 (latest)
llama_model_load_internal: n_vocab    = 32000
llama_model_load_internal: n_ctx      = 2048
llama_model_load_internal: n_embd     = 8192
llama_model_load_internal: n_mult     = 256
llama_model_load_internal: n_head     = 64
llama_model_load_internal: n_head_kv  = 8
llama_model_load_internal: n_layer    = 48
llama_model_load_internal: n_rot      = 128
llama_model_load_internal: n_gqa      = 8
llama_model_load_internal: rnorm_eps  = 5.0e-06
llama_model_load_internal: n_ff       = 22016
llama_model_load_internal: freq_base  = 100000.0
llama_model_load_internal: freq_scale = 1
llama_model_load_internal: ftype      = 2 (mostly Q4_0)
llama_model_load_internal: model size = 34B
llama_model_load_internal: ggml ctx size =    0.13 MB
llama_model_load_internal: mem required  = 18168.87 MB (+  384.00 MB per state)
llama_new_context_with_model: kv self size  =  384.00 MB
llama_new_context_with_model: compute buffer total size =  305.35 MB

llama server listening at http://127.0.0.1:57581

{"timestamp":1696827501,"level":"INFO","function":"main","line":1443,"message":"HTTP server listening","hostname":"127.0.0.1","port":57581}
{"timestamp":1696827502,"level":"INFO","function":"log_server_request","line":1157,"message":"request","remote_addr":"127.0.0.1","remote_port":59080,"status":200,"method":"HEAD","path":"/","params":{}}
2023/10/09 14:58:22 llama.go:353: llama runner started in 1.400578 seconds
{"timestamp":1696827502,"level":"INFO","function":"log_server_request","line":1157,"message":"request","remote_addr":"127.0.0.1","remote_port":59080,"status":200,"method":"POST","path":"/tokenize","params":{}}
{"timestamp":1696827502,"level":"INFO","function":"log_server_request","line":1157,"message":"request","remote_addr":"127.0.0.1","remote_port":59080,"status":200,"method":"POST","path":"/tokenize","params":{}}
[GIN] 2023/10/09 - 14:58:22 | 200 |  1.562367232s |       127.0.0.1 | POST     "/api/generate"
{"timestamp":1696827507,"level":"INFO","function":"log_server_request","line":1157,"message":"request","remote_addr":"127.0.0.1","remote_port":50906,"status":200,"method":"HEAD","path":"/","params":{}}

llama_print_timings:        load time =  1480.12 ms
llama_print_timings:      sample time =     6.27 ms /    10 runs   (    0.63 ms per token,  1594.90 tokens per second)
llama_print_timings: prompt eval time =  1479.95 ms /    11 tokens (  134.54 ms per token,     7.43 tokens per second)
llama_print_timings:        eval time =  4226.63 ms /     9 runs   (  469.63 ms per token,     2.13 tokens per second)
llama_print_timings:       total time =  5715.33 ms
{"timestamp":1696827513,"level":"INFO","function":"log_server_request","line":1157,"message":"request","remote_addr":"127.0.0.1","remote_port":50906,"status":200,"method":"POST","path":"/completion","params":{}}
{"timestamp":1696827513,"level":"INFO","function":"log_server_request","line":1157,"message":"request","remote_addr":"127.0.0.1","remote_port":50918,"status":200,"method":"POST","path":"/tokenize","params":{}}
[GIN] 2023/10/09 - 14:58:33 | 200 |  5.717758645s |       127.0.0.1 | POST     "/api/generate"
```

Two lines that stand out to me are:
`2023/10/09 14:58:20 llama.go:283: llama runner not found: stat /tmp/ollama1555236189/llama.cpp/ggml/build/rocm/bin/ollama-runner: no such file or directory`
`{"timestamp":1696827500,"level":"WARNING","function":"server_params_parse","line":845,"message":"Not compiled with GPU offload support, --n-gpu-layers option will be ignored. See main README.md for information on enabling GPU BLAS support","n_gpu_layers":0}`

As a side note I found that go was running single-threaded. Is there an easy way to add multi-threading to the `go generate` and `go build` commands?

---
**@65a** commented on 2023-10-09T05:16:02Z

Looks like a build problem, see the not found. I actually did the same thing, make sure `-tags rocm` is provided for both go generate and go build.

---
**@deadmeu** commented on 2023-10-09T05:17:11Z

~~Ok, I rebuilt (and ran) the binary with the `ROCM_PATH` and `CLBlast_DIR` env vars included and am getting this new warning: `2023/10/09 15:11:40 routes.go:599: Warning: GPU support may not enabled, check you have installed install GPU drivers: rocm-smi command failed`~~ Edit: Never mind - I had the wrong paths set.

This might be an issue with the installed ROCm packages on my system. I have this strange issue where, even though I have packages like `rocm-smi-lib` and `rocminfo` installed, I cannot run them:
```
> rocminfo
zsh: command not found: rocminfo
```

---
**@65a** commented on 2023-10-09T05:18:03Z

Where is your rocminfo binary? Set ROCM_PATH when running the binary...for me it's at /opt/rocm/bin/rocminfo

---
**@65a** commented on 2023-10-09T05:19:45Z

Note also it wants `rocm-smi`, so make sure that is located at ROCM_PATH/bin/rocm-smi

---
**@65a** commented on 2023-10-09T05:30:14Z

It's working? Good to hear. At least on Arch, /opt/rocm/bin is not on the path, so it only works if you add it to PATH, or call it directly with the full path to the binary, which is the approach the code uses (also safer generally). Is your SDK also installed there? If not I can test against multiple distro-specific fallbacks if you're on a fairly mainstream distro.
