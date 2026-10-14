# Z45 receipts summary (o200k_base, OMEGA_DET=1, one-chat cost = contract + wire)

## Shipped lanes (must be a no-op without canonical text)

`eval-lanes.jsonl` — 17 files

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

**Totals:** raw 14042, DAEDALUS 10839, ANAGNORISIS 10657 (Δ -182, -1.7% of the DAEDALUS total); applied on 1/17 files; all rows exact: True.
References by catalogue tier: {'memorized': 1}; by layout mode: {'exact': 1}.

## Fresh canon corpus (88 LICENSE files + 44 headered sources, files ≤ 80 KB)

`eval-canon.jsonl` — 45 files

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
| licenses/git_git.txt | 4059 | 3479 | 3423 | -56 | -1.4% | True/True | 【GPL-2.0 header; prefix "    "】 | catalog |
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
| licenses/mozilla_pdf.js.txt | 2018 | 1589 | 1589 | 0 | 0.0% | True/True | - | - |
| licenses/mrdoob_three.js.txt | 223 | 223 | 57 | -166 | -74.4% | True/True | 【MIT; layout classic】 | catalog |
| licenses/n8n-io_n8n.txt | 916 | 830 | 830 | 0 | 0.0% | True/True | - | - |
| licenses/neovim_neovim.txt | 3438 | 2750 | 2750 | 0 | 0.0% | True/True | - | - |

**Totals:** raw 62309, DAEDALUS 52222, ANAGNORISIS 31778 (Δ -20444, -39.1% of the DAEDALUS total); applied on 30/45 files; all rows exact: True.
References by catalogue tier: {'memorized': 11, 'catalog': 19}; by layout mode: {'exact': 25, 'reflow': 5}.

