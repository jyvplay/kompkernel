#!/usr/bin/env bash
# Z45: fresh real-world corpus for the canon lane. LICENSE files via the GitHub license endpoint
# (content + GitHub's own SPDX detection) and source files with license headers at known paths.
set -uo pipefail
cd "$(dirname "$0")/corpus"
repos="lodash/lodash expressjs/express vuejs/core axios/axios facebook/react tailwindlabs/tailwindcss vitejs/vite vercel/next.js microsoft/TypeScript angular/angular sveltejs/svelte chalk/chalk prettier/prettier eslint/eslint webpack/webpack babel/babel jquery/jquery twbs/bootstrap mrdoob/three.js d3/d3 fastify/fastify nestjs/nest ReactiveX/rxjs colinhacks/zod pnpm/pnpm oven-sh/bun denoland/deno golang/go kubernetes/kubernetes tensorflow/tensorflow pytorch/pytorch numpy/numpy pandas-dev/pandas pallets/flask django/django psf/requests fastapi/fastapi httpie/cli postgres/postgres curl/curl git/git torvalds/linux vim/vim ansible/ansible videolan/vlc WordPress/WordPress grafana/grafana nextcloud/server mastodon/mastodon ytdl-org/youtube-dl madler/zlib boostorg/boost mozilla/pdf.js servo/servo hashicorp/terraform elastic/elasticsearch rust-lang/rust ollama/ollama sindresorhus/got isaacs/node-glob tj/commander.js nodejs/node python/cpython ruby/ruby php/php-src openssl/openssl apache/kafka apache/spark spring-projects/spring-framework google/guava netty/netty redis/redis sqlite/sqlite godotengine/godot blender/blender obsproject/obs-studio neovim/neovim ohmyzsh/ohmyzsh home-assistant/core ggerganov/llama.cpp huggingface/transformers langchain-ai/langchain openai/openai-python anthropics/anthropic-sdk-python supabase/supabase strapi/strapi n8n-io/n8n"
for repo in $repos; do
  slug=$(echo "$repo" | tr '/' '_')
  out="licenses/${slug}.txt"
  [ -s "$out" ] && continue
  json=$(gh api "repos/$repo/license" 2>/dev/null) || { echo "no-license $repo"; continue; }
  spdx=$(echo "$json" | jq -r '.license.spdx_id')
  name=$(echo "$json" | jq -r '.name')
  echo "$json" | jq -r '.content' | base64 -d > "$out" 2>/dev/null
  echo "$repo $name $spdx $(wc -c < "$out")" | tee -a licenses/INDEX.txt
done
# source files with headers (owner/repo path)
while read -r repo path; do
  [ -z "$repo" ] && continue
  slug=$(echo "$repo" | tr '/' '_')_$(basename "$path")
  out="headers/${slug}"
  [ -s "$out" ] && continue
  gh api "repos/$repo/contents/$path" --jq '.content' 2>/dev/null | base64 -d > "$out" || { echo "FAIL $repo $path"; rm -f "$out"; continue; }
  echo "$repo $path $(wc -c < "$out")" | tee -a headers/INDEX.txt
done <<'LIST'
kubernetes/kubernetes pkg/api/v1/pod/util.go
kubernetes/kubernetes cmd/kubectl/kubectl.go
kubernetes/kubernetes pkg/util/hash/hash.go
tensorflow/tensorflow tensorflow/python/util/nest.py
tensorflow/tensorflow tensorflow/python/platform/app.py
tensorflow/tensorflow tensorflow/core/platform/env.h
google/guava guava/src/com/google/common/base/Optional.java
google/guava guava/src/com/google/common/base/Strings.java
spring-projects/spring-framework spring-core/src/main/java/org/springframework/util/StringUtils.java
spring-projects/spring-framework spring-core/src/main/java/org/springframework/util/Assert.java
netty/netty common/src/main/java/io/netty/util/NetUtil.java
apache/kafka clients/src/main/java/org/apache/kafka/common/utils/Utils.java
apache/spark core/src/main/scala/org/apache/spark/SparkConf.scala
apache/airflow airflow/__init__.py
mozilla/pdf.js src/shared/util.js
mozilla/pdf.js src/core/document.js
servo/servo components/servo/lib.rs
mozilla/gecko-dev dom/base/Element.cpp
mozilla/gecko-dev xpcom/base/nsCOMPtr.h
hashicorp/terraform internal/command/apply.go
hashicorp/vault sdk/helper/jsonutil/json.go
coreutils/coreutils src/true.c
coreutils/coreutils src/yes.c
coreutils/coreutils src/cat.c
videolan/vlc src/misc/mtime.c
videolan/vlc src/input/clock.c
FFmpeg/FFmpeg libavutil/base64.c
FFmpeg/FFmpeg libavcodec/utils.c
ansible/ansible lib/ansible/cli/__init__.py
grafana/grafana pkg/util/strings.go
golang/go src/strings/strings.go
golang/go src/fmt/print.go
chromium/chromium base/logging.h
chromium/chromium base/strings/string_util.h
android/platform_frameworks_base core/java/android/util/Log.java
pytorch/pytorch torch/nn/modules/linear.py
apple/swift stdlib/public/core/Optional.swift
openai/openai-python src/openai/_client.py
elastic/elasticsearch server/src/main/java/org/elasticsearch/Version.java
redis/redis src/adlist.c
openssl/openssl crypto/sha/sha256.c
LLVM/llvm-project llvm/lib/Support/StringRef.cpp
llvm/llvm-project llvm/lib/Support/StringRef.cpp
dotnet/runtime src/libraries/System.Private.CoreLib/src/System/String.cs
microsoft/vscode src/vs/base/common/strings.ts
microsoft/TypeScript src/compiler/core.ts
facebook/react packages/react/src/React.js
LIST
ls licenses | wc -l; ls headers | wc -l
