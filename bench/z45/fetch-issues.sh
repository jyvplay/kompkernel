#!/usr/bin/env bash
# Z45: build an "everyday developer chat" corpus from real GitHub issue threads (issue body + first comments),
# rendered the way a user would paste them into a chat. Public data, fetched live via the GitHub API.
set -uo pipefail
cd "$(dirname "$0")/corpus/gh-issues"
repos="vitejs/vite nodejs/node facebook/react microsoft/TypeScript denoland/deno python/cpython rust-lang/rust kubernetes/kubernetes pallets/flask psf/requests expressjs/express tailwindlabs/tailwindcss prisma/prisma vercel/next.js ollama/ollama"
for repo in $repos; do
  slug=$(echo "$repo" | tr '/' '_')
  # 4 issues per repo: most-commented (older, long) + recently updated (fresh)
  nums=$(gh api -H "Accept: application/vnd.github+json" "repos/$repo/issues?state=all&per_page=4&sort=comments&direction=desc" --jq '.[] | select(.pull_request == null) | .number' 2>/dev/null | head -2)
  nums2=$(gh api -H "Accept: application/vnd.github+json" "repos/$repo/issues?state=open&per_page=6&sort=updated&direction=desc" --jq '.[] | select(.pull_request == null) | select((.body|length) > 600) | .number' 2>/dev/null | head -2)
  for n in $nums $nums2; do
    out="${slug}_${n}.md"
    [ -s "$out" ] && continue
    {
      gh api "repos/$repo/issues/$n" --jq '"# " + .title + "\n\n**@" + .user.login + "** opened on " + .created_at + "\n\n" + (.body // "")' 2>/dev/null
      echo
      gh api "repos/$repo/issues/$n/comments?per_page=8" --jq '.[] | "\n---\n**@" + .user.login + "** commented on " + .created_at + "\n\n" + (.body // "")' 2>/dev/null
    } > "$out"
    sz=$(wc -c < "$out")
    echo "$out $sz"
    if [ "$sz" -lt 800 ]; then rm -f "$out"; fi
  done
done
ls | wc -l
