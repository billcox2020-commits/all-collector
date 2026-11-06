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

## 작업 실행과 사실 보고 규칙 — 2026-11-06

- 이 저장소 작업을 시작할 때 현재 main의 AGENTS.md와 실제 도구 연결 상태부터 확인한다. 이전 채팅의 성공 기록을 현재 실행 결과처럼 보고하지 않는다.
- 사용자가 수집·수리·수정을 요청하면, 허용되고 권한이 있는 범위의 작업은 실제로 수행하고 검증까지 진행한다. 사용자가 이미 요청한 작업을 할지 다시 묻거나 계획만 설명하고 끝내지 않는다.
- 직접 워크플로 실행 도구가 없더라도, GitHub 쓰기가 가능하면 위의 요청 파일 경로를 사용한다. 이 방법이 가능한데 사용자에게 수동 Actions 버튼을 누르도록 떠넘기지 않는다.
- 원본 ZIP을 요청하지 않는다. 현재 GitHub main과 확인 가능한 이력을 기준으로 작업하고, 기존 상품·관리자 수정 기록·사진을 보존한다.
- 안전·권한·기술 제한이 실제로 있으면 그 제한을 지킨다. 거부나 실패 사유는 실제 도구 오류 또는 적용되는 규칙을 근거로 구체적으로 설명한다. 권한이 없는데 실행할 수 있다고 약속하지 않으며, 제한을 우회하지 않는다.
- 쓰기 403, Apify 과금 제한, 번개장터 접근 제한, 도구의 네트워크 제한을 서로 구분한다. 확인하지 않은 원인이나 요금·사용 횟수를 단정하지 않는다. 오류 문자열이나 Secret 값은 노출하지 않고 필요한 부분만 인용한다.
- 결과를 다음 단계로 구분한다.
  1. 요청 기록: GitHub 쓰기 성공 응답과 요청 커밋 SHA를 확인했을 때만 '요청 제출'이라고 한다.
  2. 실행 시작: 해당 요청 커밋에 연결된 Actions run ID와 상태가 확인돼야 '실행됨/대기 중'이라고 한다.
  3. 수집 완료: 수집 job 성공과 실제 추가 건수 로그를 확인해야 한다. 0건은 '신규 없음'이고 실패나 미실행과 다르다.
  4. 저장 완료: main의 커밋과 변경 파일을 다시 읽어 확인한다. 필요하면 기존 항목 값이 유지됐는지도 비교한다.
  5. 배포 작업 성공: 해당 데이터 커밋의 Pages 배포 성공을 확인한다. 공개 URL을 직접 확인하지 못했다면 '공개 화면 반영 확인'이라고 하지 않는다.
- 테스트만 한 경우, 코드만 저장한 경우, 실행 대기 중인 경우, 실행 실패한 경우를 각각 명시한다. 실패한 새 실행 대신 과거 성공 링크를 제시하지 않는다.
- 진행 중에는 상태를 알리고 작업을 이어간다. 새 채팅에서도 이 지침을 읽도록 안내하되, 이 파일이 모든 워크창에 자동 적용되거나 시스템 동작 자체를 강제 변경한다고 말하지 않는다.
- 변경 파일 전체 내용은 GitHub의 확인 가능한 커밋/파일 링크로 보존하고 적용 순서를 함께 남긴다. 임시 /workspace 경로를 다운로드 링크로 제시하지 않는다. 사용자 접근 여부를 확인할 수 없으면 그 한계를 밝히고 필요한 파일별 전체 내용 또는 패치를 대화에 제공한다.
