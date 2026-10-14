# Z46 — ENTHYMEME receipts (o200k_base, OMEGA_DET=1, codec-eval harness; every row round-trip checked)

### JVM stack traces — 10 real GitHub issue bodies (bench/z46/corpus/traces)

| file | raw | DAEDALUS | ENTHYMEME | Δ | Δ% | exact | note |
|---|---:|---:|---:|---:|---:|:--:|---|
| alibaba_druid_6414.md | 1477 | 867 | 852 | -15 | -1.7% | yes | applied=true rules=frames |
| buttasam_cms-boot_3.md | 2354 | 1046 | 944 | -102 | -9.8% | yes | applied=true rules=frames |
| couchbase_CouchbaseMock_11.md | 868 | 678 | 676 | -2 | -0.3% | yes | applied=true rules=frames |
| getsentry_sentry-java_1863.md | 2800 | 1163 | 1061 | -102 | -8.8% | yes | applied=true rules=frames |
| getsentry_sentry-java_980.md | 3974 | 2153 | 2003 | -150 | -7.0% | yes | applied=true rules=frames |
| netty_netty_16626.md | 3106 | 1787 | 1692 | -95 | -5.3% | yes | applied=true rules=frames |
| oracle_graal_12109.md | 2596 | 1750 | 1739 | -11 | -0.6% | yes | applied=true rules=frames |
| spring-projects_spring-framework_35118.md | 1895 | 963 | 930 | -33 | -3.4% | yes | applied=true rules=frames |
| spring-projects_spring-loaded_102.md | 1360 | 153 | 153 | +0 | +0.0% | yes | applied=false rules=- |
| spring-projects_spring-loaded_138.md | 1989 | 723 | 658 | -65 | -9.0% | yes | applied=true rules=frames |
| **total (10 files)** | **22419** | **11283** | **10708** | **-575** | **-5.1%** | | wins 9 / ties 1 / losses 0 |

### Markdown documents with heading links — 6 real READMEs, first 24 KB (bench/z46/corpus/toc)

| file | raw | DAEDALUS | ENTHYMEME | Δ | Δ% | exact | note |
|---|---:|---:|---:|---:|---:|:--:|---|
| axios_axios.md | 5585 | 2281 | 2167 | -114 | -5.0% | yes | applied=true rules=anchors |
| donnemartin_system-design-primer.md | 5765 | 3825 | 3476 | -349 | -9.1% | yes | applied=true rules=anchors |
| goldbergyoni_nodebestpractices.md | 6777 | 4442 | 4442 | +0 | +0.0% | yes | applied=false rules=- |
| jwasham_coding-interview-university.md | 5972 | 4642 | 4277 | -365 | -7.9% | yes | applied=true rules=anchors |
| ohmyzsh_ohmyzsh.md | 6132 | 4685 | 4562 | -123 | -2.6% | yes | applied=true rules=anchors |
| vinta_awesome-python.md | 5983 | 4202 | 3982 | -220 | -5.2% | yes | applied=true rules=anchors |
| **total (6 files)** | **36214** | **24077** | **22906** | **-1171** | **-4.9%** | | wins 5 / ties 1 / losses 0 |

### Shipped lanes — 22 files (prose, code, JSON, licence, real ops); DAEDALUS rows from bench/z45/receipts/eval-lanes.jsonl

| file | raw | DAEDALUS | ENTHYMEME | Δ | Δ% | exact | note |
|---|---:|---:|---:|---:|---:|:--:|---|
| bibliography.txt | 896 | 711 | 711 | +0 | +0.0% | yes | applied=false rules=- |
| email-thread.txt | 629 | 525 | 525 | +0 | +0.0% | yes | applied=false rules=- |
| kb-article.txt | 656 | 651 | 651 | +0 | +0.0% | yes | applied=false rules=- |
| llm-answer.md | 733 | 707 | 707 | +0 | +0.0% | yes | applied=false rules=- |
| meeting-transcript.txt | 472 | 420 | 420 | +0 | +0.0% | yes | applied=false rules=- |
| unified-diff.patch | 578 | 475 | 475 | +0 | +0.0% | yes | applied=false rules=- |
| code-dts.txt | 162 | 108 | 108 | +0 | +0.0% | yes | applied=false rules=- |
| code-ts.txt | 1422 | 1028 | 1028 | +0 | +0.0% | yes | applied=false rules=- |
| gh-api.json.txt | 2519 | 1153 | 1153 | +0 | +0.0% | yes | applied=false rules=- |
| gh-prose.txt | 1934 | 1782 | 1782 | +0 | +0.0% | yes | applied=false rules=- |
| json-pkg.txt | 1152 | 743 | 743 | +0 | +0.0% | yes | applied=false rules=- |
| lic-mit.txt | 223 | 223 | 223 | +0 | +0.0% | yes | applied=false rules=- |
| license.txt | 1166 | 968 | 968 | +0 | +0.0% | yes | applied=false rules=- |
| md-react.txt | 252 | 252 | 252 | +0 | +0.0% | yes | applied=false rules=- |
| md-vite.txt | 274 | 274 | 274 | +0 | +0.0% | yes | applied=false rules=- |
| readme.txt | 843 | 688 | 688 | +0 | +0.0% | yes | applied=false rules=- |
| df-h.txt | 131 | 131 | 131 | +0 | +0.0% | yes | applied=false rules=- |
| dpkg-l.txt | 8975 | 4572 | 4572 | +0 | +0.0% | yes | applied=false rules=- |
| du-usr-share.txt | 1634 | 766 | 766 | +0 | +0.0% | yes | applied=false rules=- |
| free-h.txt | 64 | 64 | 64 | +0 | +0.0% | yes | applied=false rules=- |
| ls-usr-bin.txt | 17146 | 3746 | 3746 | +0 | +0.0% | yes | applied=false rules=- |
| ls-usr-lib.txt | 949 | 342 | 342 | +0 | +0.0% | yes | applied=false rules=- |
| **total (22 files)** | **42810** | **20329** | **20329** | **+0** | **+0.0%** | | wins 0 / ties 22 / losses 0 |

### Negative-space lanes — PHP/.NET traces (rules must not fire or must not lose)

| file | raw | DAEDALUS | ENTHYMEME | Δ | Δ% | exact | note |
|---|---:|---:|---:|---:|---:|:--:|---|
| net_anegostudios_VintageStory-Issues_9850.md | 1474 | 970 | 970 | +0 | +0.0% | yes | applied=false rules=- |
| net_artempyanykh_marksman_408.md | 938 | 607 | 607 | +0 | +0.0% | yes | applied=false rules=- |
| net_dafny-lang_dafny_6503.md | 4487 | 1475 | 1475 | +0 | +0.0% | yes | applied=false rules=- |
| net_decentraland_unity-explorer_10430.md | 2458 | 615 | 615 | +0 | +0.0% | yes | applied=false rules=- |
| **total (4 files)** | **9357** | **3667** | **3667** | **+0** | **+0.0%** | | wins 0 / ties 4 / losses 0 |

### Exactness
62 of 62 rows byte-exact; 0 errors.
