# Z45 receipts summary (o200k_base, OMEGA_DET=1, one-chat cost = contract + wire)

## Shipped lanes (must be a no-op without canonical text)

`eval-lanes.jsonl` — 22 files

| file | raw | DAEDALUS | ANAGNORISIS | Δ | Δ% of raw | exact | reference(s) | tier |
|---|---:|---:|---:|---:|---:|---|---|---|
| holdout-work/bibliography.txt | 896 | 711 | 711 | 0 | 0.0% | True/True | - | - |
| holdout-work/email-thread.txt | 629 | 525 | 525 | 0 | 0.0% | True/True | - | - |
| holdout-work/kb-article.txt | 656 | 651 | 651 | 0 | 0.0% | True/True | - | - |
| holdout-work/llm-answer.md | 733 | 707 | 707 | 0 | 0.0% | True/True | - | - |
| holdout-work/meeting-transcript.txt | 472 | 420 | 420 | 0 | 0.0% | True/True | - | - |
| holdout-work/unified-diff.patch | 578 | 475 | 475 | 0 | 0.0% | True/True | - | - |
| holdout/code-dts.txt | 162 | 108 | 108 | 0 | 0.0% | True/True | - | - |
| holdout/code-ts.txt | 1422 | 1028 | 1028 | 0 | 0.0% | True/True | - | - |
| holdout/gh-api.json.txt | 2519 | 1153 | 1153 | 0 | 0.0% | True/True | - | - |
| holdout/gh-prose.txt | 1934 | 1782 | 1782 | 0 | 0.0% | True/True | - | - |
| holdout/json-pkg.txt | 1152 | 743 | 743 | 0 | 0.0% | True/True | - | - |
| holdout/lic-mit.txt | 223 | 223 | 41 | -182 | -81.6% | True/True | 【MIT】 | memorized |
| holdout/license.txt | 1166 | 968 | 968 | 0 | 0.0% | True/True | - | - |
| holdout/md-react.txt | 252 | 252 | 252 | 0 | 0.0% | True/True | - | - |
| holdout/md-vite.txt | 274 | 274 | 274 | 0 | 0.0% | True/True | - | - |
| holdout/readme.txt | 843 | 688 | 688 | 0 | 0.0% | True/True | - | - |
| ops-real/df-h.txt | 131 | 131 | 131 | 0 | 0.0% | True/True | - | - |
| ops-real/dpkg-l.txt | 8975 | 4572 | 4572 | 0 | 0.0% | True/True | - | - |
| ops-real/du-usr-share.txt | 1634 | 766 | 766 | 0 | 0.0% | True/True | - | - |
| ops-real/free-h.txt | 64 | 64 | 64 | 0 | 0.0% | True/True | - | - |
| ops-real/ls-usr-bin.txt | 17146 | 3746 | 3746 | 0 | 0.0% | True/True | - | - |
| ops-real/ls-usr-lib.txt | 949 | 342 | 342 | 0 | 0.0% | True/True | - | - |

**Totals:** raw 42810, DAEDALUS 20329, ANAGNORISIS 20147 (Δ -182, -0.9% of the DAEDALUS total); applied on 1/22 files; all rows exact: True.
References by catalogue tier: {'memorized': 1}; by layout mode: {'exact': 1}.

## Fresh canon corpus — end-to-end on 106 of the 130 files (87 LICENSE + 43 headered sources; files > 24 KB skipped for DAEDALUS runtime, their recognitions are in recognise-all.txt)

`eval-canon.jsonl` — 106 files

| file | raw | DAEDALUS | ANAGNORISIS | Δ | Δ% of raw | exact | reference(s) | tier |
|---|---:|---:|---:|---:|---:|---|---|---|
| licenses/ReactiveX_rxjs.txt | 2271 | 1802 | 1763 | -39 | -1.7% | True/True | 【Apache-2.0 header; prefix " "】 | memorized |
| licenses/WordPress_WordPress.txt | 4203 | 3536 | 3536 | 0 | 0.0% | True/True | - | - |
| licenses/angular_angular.txt | 230 | 230 | 64 | -166 | -72.2% | True/True | 【MIT; layout classic】 | catalog |
| licenses/ansible_ansible.txt | 7446 | 6181 | 30 | -6151 | -82.6% | True/True | 【GPL-3.0】 | catalog |
| licenses/anthropics_anthropic-sdk-python.txt | 202 | 202 | 48 | -154 | -76.2% | True/True | 【MIT; unwrapped】 | memorized |
| licenses/apache_kafka.txt | 2262 | 1787 | 30 | -1757 | -77.7% | True/True | 【Apache-2.0】 | catalog |
| licenses/apache_spark.txt | 2765 | 2160 | 440 | -1720 | -62.2% | True/True | 【Apache-2.0】 | catalog |
| licenses/axios_axios.txt | 210 | 210 | 56 | -154 | -73.3% | True/True | 【MIT; unwrapped】 | memorized |
| licenses/babel_babel.txt | 225 | 225 | 59 | -166 | -73.8% | True/True | 【MIT; layout jquery】 | catalog |
| licenses/blender_blender.txt | 64 | 64 | 64 | 0 | 0.0% | True/True | - | - |
| licenses/boostorg_boost.txt | 282 | 282 | 31 | -251 | -89.0% | True/True | 【BSL-1.0】 | catalog |
| licenses/chalk_chalk.txt | 222 | 222 | 68 | -154 | -69.4% | True/True | 【MIT; unwrapped】 | memorized |
| licenses/colinhacks_zod.txt | 222 | 222 | 40 | -182 | -82.0% | True/True | 【MIT】 | memorized |
| licenses/curl_curl.txt | 230 | 230 | 230 | 0 | 0.0% | True/True | - | - |
| licenses/d3_d3.txt | 156 | 156 | 59 | -97 | -62.2% | True/True | 【ISC; wrap 80】 | catalog |
| licenses/denoland_deno.txt | 220 | 220 | 62 | -158 | -71.8% | True/True | 【MIT; wrap 80】 | memorized |
| licenses/django_django.txt | 296 | 296 | 296 | 0 | 0.0% | True/True | - | - |
| licenses/elastic_elasticsearch.txt | 174 | 174 | 174 | 0 | 0.0% | True/True | - | - |
| licenses/eslint_eslint.txt | 222 | 222 | 56 | -166 | -74.8% | True/True | 【MIT; layout classic】 | catalog |
| licenses/expressjs_express.txt | 281 | 281 | 116 | -165 | -58.7% | True/True | 【MIT; layout npm】 | catalog |
| licenses/facebook_react.txt | 223 | 223 | 41 | -182 | -81.6% | True/True | 【MIT】 | memorized |
| licenses/fastapi_fastapi.txt | 225 | 225 | 59 | -166 | -73.8% | True/True | 【MIT; layout classic】 | catalog |
| licenses/fastify_fastify.txt | 237 | 237 | 55 | -182 | -76.8% | True/True | 【MIT】 | memorized |
| licenses/ggerganov_llama.cpp.txt | 226 | 226 | 44 | -182 | -80.5% | True/True | 【MIT】 | memorized |
| licenses/git_git.txt | 4059 | 3479 | 216 | -3263 | -80.4% | True/True | 【GPL-2.0; tabs】 | catalog |
| licenses/godotengine_godot.txt | 244 | 244 | 62 | -182 | -74.6% | True/True | 【MIT】 | memorized |
| licenses/golang_go.txt | 282 | 282 | 282 | 0 | 0.0% | True/True | - | - |
| licenses/google_guava.txt | 2262 | 1787 | 30 | -1757 | -77.7% | True/True | 【Apache-2.0】 | catalog |
| licenses/grafana_grafana.txt | 7275 | 6012 | 6012 | 0 | 0.0% | True/True | - | - |
| licenses/hashicorp_terraform.txt | 906 | 809 | 809 | 0 | 0.0% | True/True | - | - |
| licenses/home-assistant_core.txt | 2261 | 1786 | 30 | -1756 | -77.7% | True/True | 【Apache-2.0】 | catalog |
| licenses/httpie_cli.txt | 309 | 309 | 309 | 0 | 0.0% | True/True | - | - |
| licenses/huggingface_transformers.txt | 2276 | 1801 | 45 | -1756 | -77.2% | True/True | 【Apache-2.0】 | catalog |
| licenses/isaacs_node-glob.txt | 387 | 387 | 79 | -308 | -79.6% | True/True | 【BlueOak-1.0.0】 | catalog |
| licenses/jquery_jquery.txt | 222 | 222 | 56 | -166 | -74.8% | True/True | 【MIT; layout jquery】 | catalog |
| licenses/kubernetes_kubernetes.txt | 2262 | 1787 | 30 | -1757 | -77.7% | True/True | 【Apache-2.0】 | catalog |
| licenses/langchain-ai_langchain.txt | 220 | 220 | 38 | -182 | -82.7% | True/True | 【MIT】 | memorized |
| licenses/lodash_lodash.txt | 400 | 400 | 234 | -166 | -41.5% | True/True | 【MIT; layout jquery】 | catalog |
| licenses/madler_zlib.txt | 225 | 225 | 225 | 0 | 0.0% | True/True | - | - |
| licenses/mastodon_mastodon.txt | 7275 | 6012 | 6012 | 0 | 0.0% | True/True | - | - |
| licenses/microsoft_TypeScript.txt | 1755 | 1455 | 1455 | 0 | 0.0% | True/True | - | - |
| licenses/mozilla_pdf.js.txt | 2018 | 1589 | 51 | -1538 | -76.2% | True/True | 【Apache-2.0; ending "END OF TERMS AND CONDITIONS"】 | catalog |
| licenses/mrdoob_three.js.txt | 223 | 223 | 57 | -166 | -74.4% | True/True | 【MIT; layout classic】 | catalog |
| licenses/n8n-io_n8n.txt | 916 | 830 | 830 | 0 | 0.0% | True/True | - | - |
| licenses/neovim_neovim.txt | 3438 | 2750 | 1253 | -1497 | -43.5% | True/True | 【Apache-2.0; url https; ending "of your accepting any such warranty or additional liability."】 | catalog |
| licenses/nestjs_nest.txt | 235 | 235 | 70 | -165 | -70.2% | True/True | 【MIT; layout npm】 | catalog |
| licenses/netty_netty.txt | 2262 | 1787 | 42 | -1745 | -77.1% | True/True | 【Apache-2.0; url https】 | catalog |
| licenses/nextcloud_server.txt | 7275 | 6012 | 6012 | 0 | 0.0% | True/True | - | - |
| licenses/numpy_numpy.txt | 301 | 301 | 301 | 0 | 0.0% | True/True | - | - |
| licenses/obsproject_obs-studio.txt | 3886 | 3323 | 30 | -3293 | -84.7% | True/True | 【GPL-2.0】 | catalog |
| licenses/ohmyzsh_ohmyzsh.txt | 242 | 242 | 60 | -182 | -75.2% | True/True | 【MIT】 | memorized |
| licenses/ollama_ollama.txt | 218 | 218 | 36 | -182 | -83.5% | True/True | 【MIT】 | memorized |
| licenses/openai_openai-python.txt | 2258 | 1778 | 46 | -1732 | -76.7% | True/True | 【Apache-2.0: 2026 OpenAI】 | catalog |
| licenses/openssl_openssl.txt | 2018 | 1589 | 63 | -1526 | -75.6% | True/True | 【Apache-2.0; url https; ending "END OF TERMS AND CONDITIONS"】 | catalog |
| licenses/oven-sh_bun.txt | 4015 | 2573 | 2573 | 0 | 0.0% | True/True | - | - |
| licenses/pallets_flask.txt | 296 | 296 | 296 | 0 | 0.0% | True/True | - | - |
| licenses/pandas-dev_pandas.txt | 331 | 331 | 331 | 0 | 0.0% | True/True | - | - |
| licenses/php_php-src.txt | 317 | 317 | 67 | -250 | -78.9% | True/True | 【BSD-3-Clause】 | memorized |
| licenses/pnpm_pnpm.txt | 251 | 251 | 69 | -182 | -72.5% | True/True | 【MIT】 | memorized |
| licenses/postgres_postgres.txt | 272 | 272 | 272 | 0 | 0.0% | True/True | - | - |
| licenses/prettier_prettier.txt | 199 | 199 | 45 | -154 | -77.4% | True/True | 【MIT; unwrapped】 | memorized |
| licenses/psf_requests.txt | 2011 | 1582 | 55 | -1527 | -75.9% | True/True | 【Apache-2.0; ending "of your accepting any such warranty or additional liability."】 | catalog |
| licenses/python_cpython.txt | 3164 | 2292 | 2223 | -69 | -2.2% | True/True | 【0BSD】 | memorized |
| licenses/pytorch_pytorch.txt | 804 | 660 | 660 | 0 | 0.0% | True/True | - | - |
| headers/FFmpeg_FFmpeg_base64.c | 2090 | 970 | 970 | 0 | 0.0% | True/True | - | - |
| headers/LLVM_llvm-project_StringRef.cpp | 5109 | 3160 | 3160 | 0 | 0.0% | True/True | - | - |
| headers/android_platform_frameworks_base_Log.java | 5225 | 2791 | 2745 | -46 | -0.9% | True/True | 【Apache-2.0 header; prefix " * "; indent 5】 | memorized |
| headers/coreutils_coreutils_true.c | 542 | 542 | 453 | -89 | -16.4% | True/True | 【GPL-3.0 header; prefix "   "】 | memorized |
| headers/coreutils_coreutils_yes.c | 2077 | 1756 | 1686 | -70 | -3.4% | True/True | 【GPL-3.0 header; prefix "   "】 | memorized |
| headers/google_guava_Optional.java | 3821 | 2482 | 2438 | -44 | -1.2% | True/True | 【Apache-2.0 header; prefix " * "; wrap 100】 | memorized |
| headers/google_guava_Strings.java | 3186 | 2277 | 2227 | -50 | -1.6% | True/True | 【Apache-2.0 header; prefix " * "; wrap 100】 | memorized |
| headers/grafana_grafana_strings.go | 2146 | 1619 | 1619 | 0 | 0.0% | True/True | - | - |
| headers/hashicorp_terraform_apply.go | 3489 | 2555 | 2555 | 0 | 0.0% | True/True | - | - |
| headers/hashicorp_vault_json.go | 4341 | 2970 | 2970 | 0 | 0.0% | True/True | - | - |
| headers/kubernetes_kubernetes_hash.go | 214 | 214 | 127 | -87 | -40.7% | True/True | 【Apache-2.0 header】 | memorized |
| headers/kubernetes_kubernetes_kubectl.go | 347 | 347 | 260 | -87 | -25.1% | True/True | 【Apache-2.0 header】 | memorized |
| headers/kubernetes_kubernetes_util.go | 4554 | 2798 | 2711 | -87 | -1.9% | True/True | 【Apache-2.0 header】 | memorized |
| headers/llvm_llvm-project_StringRef.cpp | 5109 | 3160 | 3160 | 0 | 0.0% | True/True | - | - |
| headers/openssl_openssl_sha256.c | 5427 | 2436 | 2436 | 0 | 0.0% | True/True | - | - |
| headers/pytorch_pytorch_linear.py | 3060 | 1795 | 1795 | 0 | 0.0% | True/True | - | - |
| headers/redis_redis_adlist.c | 2727 | 1752 | 1752 | 0 | 0.0% | True/True | - | - |
| headers/servo_servo_lib.rs | 1754 | 1434 | 1434 | 0 | 0.0% | True/True | - | - |
| headers/tensorflow_tensorflow_app.py | 296 | 296 | 225 | -71 | -24.0% | True/True | 【Apache-2.0 header; prefix "# "】 | memorized |
| headers/tensorflow_tensorflow_env.h | 430 | 355 | 270 | -85 | -19.8% | True/True | 【Apache-2.0 header】 | memorized |
| headers/videolan_vlc_mtime.c | 1329 | 956 | 956 | 0 | 0.0% | True/True | - | - |
| licenses/ruby_ruby.txt | 514 | 475 | 475 | 0 | 0.0% | True/True | - | - |
| licenses/rust-lang_rust.txt | 1998 | 1581 | 1581 | 0 | 0.0% | True/True | - | - |
| licenses/servo_servo.txt | 3274 | 2691 | 927 | -1764 | -53.9% | True/True | 【MPL-2.0; indent 0; ending "************************************************************************"】 【MPL-2.0 header】 | - |
| licenses/sindresorhus_got.txt | 222 | 222 | 68 | -154 | -69.4% | True/True | 【MIT; unwrapped】 | memorized |
| licenses/spring-projects_spring-framework.txt | 2261 | 1786 | 219 | -1567 | -69.3% | True/True | - | - |
| licenses/sqlite_sqlite.txt | 861 | 739 | 739 | 0 | 0.0% | True/True | - | - |
| licenses/strapi_strapi.txt | 499 | 499 | 499 | 0 | 0.0% | True/True | - | - |
| licenses/supabase_supabase.txt | 2258 | 1778 | 46 | -1732 | -76.7% | True/True | 【Apache-2.0: 2024 Supabase】 | catalog |
| licenses/sveltejs_svelte.txt | 221 | 221 | 67 | -154 | -69.7% | True/True | 【MIT; unwrapped】 | memorized |
| licenses/tailwindlabs_tailwindcss.txt | 221 | 221 | 39 | -182 | -82.4% | True/True | 【MIT】 | memorized |
| licenses/tensorflow_tensorflow.txt | 2696 | 2186 | 465 | -1721 | -63.8% | True/True | 【Apache-2.0】 | catalog |
| licenses/tj_commander.js.txt | 230 | 230 | 65 | -165 | -71.7% | True/True | 【MIT; layout npm】 | catalog |
| licenses/torvalds_linux.txt | 114 | 114 | 114 | 0 | 0.0% | True/True | - | - |
| licenses/twbs_bootstrap.txt | 227 | 227 | 61 | -166 | -73.1% | True/True | 【MIT; layout classic】 | catalog |
| licenses/vercel_next.js.txt | 227 | 227 | 45 | -182 | -80.2% | True/True | 【MIT】 | memorized |
| licenses/videolan_vlc.txt | 3886 | 3323 | 30 | -3293 | -84.7% | True/True | 【GPL-2.0】 | catalog |
| licenses/vim_vim.txt | 1059 | 906 | 906 | 0 | 0.0% | True/True | - | - |
| licenses/vitejs_vite.txt | 229 | 229 | 47 | -182 | -79.5% | True/True | 【MIT】 | memorized |
| licenses/vuejs_core.txt | 234 | 234 | 68 | -166 | -70.9% | True/True | 【MIT; layout classic】 | catalog |
| licenses/webpack_webpack.txt | 213 | 213 | 48 | -165 | -77.5% | True/True | 【MIT; layout npm】 | catalog |
| licenses/ytdl-org_youtube-dl.txt | 257 | 257 | 62 | -195 | -75.9% | True/True | 【Unlicense; ending "OTHER DEALINGS IN THE SOFTWARE."】 | memorized |

**Totals:** raw 171638, DAEDALUS 131504, ANAGNORISIS 81307 (Δ -50197, -38.2% of the DAEDALUS total); applied on 69/106 files; all rows exact: True.
References by catalogue tier: {'memorized': 33, 'catalog': 34, '-': 2}; by layout mode: {'exact': 59, 'reflow': 10}.

## Independent CPython reader (bench/anagnorisis_decode.py)

```
OK  lic-mit.txt                                  raw=  223 M=   41 【MIT】
OK  lic-isc.txt                                  raw=  156 M=   39 【ISC】
OK  lic-bsd-3-clause.txt                         raw=  295 M=   45 【BSD-3-Clause】
OK  facebook_react.txt                           raw=  223 M=   41 【MIT】
OK  vuejs_core.txt                               raw=  234 M=   68 【MIT; layout classic】
OK  openai_openai-python.txt                     raw= 2258 M=   46 【Apache-2.0: 2026 OpenAI】
OK  d3_d3.txt                                    raw=  156 M=   59 【ISC; wrap 80】
OK  boostorg_boost.txt                           raw=  282 M=   31 【BSL-1.0】
OK  angular_angular.txt                          raw=  230 M=   64 【MIT; layout classic】
OK  expressjs_express.txt                        raw=  281 M=  116 【MIT; layout npm】
OK  netty_netty.txt                              raw= 2262 M=   42 【Apache-2.0; url https】
OK  prettier_prettier.txt                        raw=  199 M=   45 【MIT; unwrapped】
OK  ansible_ansible.txt                          raw= 7446 M=   30 【GPL-3.0】
OK  denoland_deno.txt                            raw=  220 M=   62 【MIT; wrap 80】
OK  babel_babel.txt                              raw=  225 M=   59 【MIT; layout jquery】
OK  php_php-src.txt                              raw=  317 M=   67 【BSD-3-Clause】
OK  psf_requests.txt                             raw= 2011 M=   55 【Apache-2.0; ending "of your accepting any such warranty or additional liability."】
OK  openssl_openssl.txt                          raw= 2018 M=   63 【Apache-2.0; url https; ending "END OF TERMS AND CONDITIONS"】
OK  git_git.txt                                  raw= 4059 M=  216 【GPL-2.0; tabs】
OK  tensorflow_tensorflow_app.py                 raw=  296 M=  225 【Apache-2.0 header; prefix "# "】
OK  kubernetes_kubernetes_hash.go                raw=  214 M=  127 【Apache-2.0 header】
OK  coreutils_coreutils_true.c                   raw=  542 M=  453 【GPL-3.0 header; prefix "   "】
OK  google_guava_Strings.java                    raw= 3186 M= 2227 【Apache-2.0 header; prefix " * "; wrap 100】
OK  servo_servo_lib.rs                           raw= 1754 M= 1434 
OK  android_platform_frameworks_base_Log.java    raw= 5225 M= 2745 【Apache-2.0 header; prefix " * "; indent 5】
OK  coreutils_coreutils_yes.c                    raw= 2077 M= 1686 【GPL-3.0 header; prefix "   "】
python cross-decode: 26/26 byte-identical
```

