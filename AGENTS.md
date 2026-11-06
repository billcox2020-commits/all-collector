# ALL COLLECTOR work-chat collection

## User requests
When the user asks "번개장터 자료 긁어와줘", "번개장터자료 긁어와줘", "번개장터 불러와줘", or an equivalent request to collect this repository's Bunjang listings, execute the collection. Do not send the user to the Actions button when a connected write is available.

1. Fetch this file and the current main branch before acting.
2. Create or update `.github/bunjang-request.json` on main using the GitHub connector's contents API. Read the current file first, and pass its blob SHA when updating. Include a fresh UTC `requested_at` and a unique `request_id`, with `source: "work-chat"` and `seller_id: "4934829"`. Never include tokens, passwords, or unrelated chat text. Commit message: `Request Bunjang collection from work chat`. A unique request is required even when the previous request succeeded.
3. The push automatically triggers `.github/workflows/bunjang-direct-sync-20261104.yml`. Manual workflow dispatch remains available for fallback only. Do not run the legacy apply-final or newest-first code-rewriting workflows.
4. Find the workflow run for the returned request commit SHA. Follow its jobs and logs until completion; report its run URL and actual result. Do not submit another request merely because startup takes time.
5. The workflow appends unseen items through the existing `scripts/sync_bunjang.py`. Do not replace existing product data, personal posts, admin overrides, or uploaded images.
6. A successful request commit only means the request was submitted. If public-page access, GitHub write, or the collector fails, report the actual error. A 403 is not successful collection or deployment. When products were added, check the Pages deployment before claiming the public site was updated.
7. If the connector cannot write, explain that limitation. Do not expose secrets or claim that a chat message alone triggered GitHub.

## Scope
This command bridge does not alter the guest UI, admin login, password storage, or the existing append-only data merge rules. It does not listen to arbitrary ChatGPT conversations: an agent with repository access must process the user's request using these instructions.

## Free collection mode
The request-triggered workflow uses standard Chromium to read the public seller page; it never calls Apify and requires no APIFY_TOKEN. Legacy Apify/code-rewriting workflows are disabled. Do not re-enable them without an explicit user request. Stop on access denial or unverified records; do not bypass challenges. GitHub Actions hosting still has its own account limits. Report failed public access honestly and retain the existing archive.
