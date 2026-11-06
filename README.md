# ALL COLLECTOR ARCHIVE

사진과 소개를 중심으로 구성한 개인 빈티지 아카이브입니다.

- **ALL COLLECTION**: 처음에는 선정한 8건, 전체 기록과 Shoes / Outer / Top / Bottom / ETC 분류. 사진이나 제목을 누르면 상세 기록이 열립니다.
- **ALL COLLECTOR**: 아카이브 소개.
- **INFORMATION**: 블로그, Instagram, FruitsFamily, 읽을거리 링크.

## 편집

### 관리자 화면

- 공개 주소 뒤에 `/admin/`을 붙이면 아이폰과 PC에서 기록을 관리할 수 있습니다.
- 새 기록 추가, 전체 공개 기록 검색·수정, 사진 업로드, 삭제(복구 가능한 숨김)를 지원합니다.
- 새 기록은 `data/personal-posts.json`에 저장합니다.
- 번개장터 기록의 수정값과 숨김 상태는 `data/admin-overrides.json`에 따로 저장하므로 목록을 다시 수집해도 유지됩니다.
- 사진은 업로드 전에 브라우저에서 최대 2400px JPG로 변환한 뒤 `assets/uploads/`에 저장합니다.
- 인증에는 해당 저장소 하나에 `Contents: Read and write` 권한만 준 GitHub fine-grained token을 사용합니다. 토큰은 `sessionStorage`에만 보관되며 페이지 소스나 저장소에는 기록하지 않습니다.

- `index.html`: 소개 문구, 큰 메뉴, 외부 링크.
- `assets/archive-room-cover.jpg`: 사용자가 선택한 커버 원본. 화면에서 전체 비율을 유지합니다.
- `assets/site.css`: PC / 모바일 화면.
- `assets/site.js`: 분류, 상세 기록, 가격 표시.
- `data/site.json`: `site_title`, 첫 8건의 순서를 정하는 `featured_ids`, `price_mode_default` (`hidden`, `sale`, `all`).
- `data/admin-overrides.json`: 관리 화면에서 수정한 번개장터 기록과 사이트에서 숨긴 기록.
- `data/catalog.json`: 각 아이템의 제목, 이미지, 원문 링크, 연도, 사이즈, 설명, 게시일. `status`는 빈 값 또는 `for_sale`, `reserved`, `sold`, `archive`; `status_text`로 표시 문구를 지정할 수 있습니다.
- 가격은 기본적으로 숨깁니다. `price_krw`가 있는 항목만 표시하며, 판매 중만 표시할 때는 `status: for_sale`인 항목만 표시합니다.

## 자료 현황

공개 목록은 `data/personal-posts.json`의 개인 소장 기록과 `data/bunjang-active.json`의 판매중 매물만 사용합니다. 번개장터 목록은 올콜렉터 상점의 현재 검색 결과에서 `SELLING` 상태만 수집하고, 상품 ID와 정규화한 제목으로 중복을 제거합니다. 과거 후보·판매완료·예약 자료가 남아 있는 다른 JSON 파일은 공개 화면에 합치지 않습니다.

## 확인

`node --check assets/site.js`로 스크립트 문법을 확인합니다. GitHub Pages에서 `main` 브랜치 루트를 게시합니다.

## 워크 채팅에서 번개장터 수집

이 저장소에 연결된 워크 채팅에서 **번개장터 자료 긁어와줘**라고 요청합니다.
에이전트가 `AGENTS.md`에 따라 `.github/bunjang-request.json`을 main에 갱신하면
번개장터 직접 수집 워크플로가 자동 실행됩니다. 사용자가 Actions 버튼을 누를 필요는 없습니다.

이 기능은 GitHub 쓰기 권한이 있는 에이전트가 요청을 처리해야 작동하며,
채팅 문장 자체를 GitHub가 감지하는 기능은 아닙니다.
APIFY_TOKEN Secret과 Apify 서비스의 정상 동작은 여전히 필요합니다.
요청 기록 성공, 실제 수집 성공, 공개 페이지 반영은 각각 확인해야 합니다.
기존 상품 데이터와 관리자 수정 기록은 덮어쓰지 않습니다.

### 실제 실행 확인 — 2026-11-06

워크 채팅의 요청 파일 커밋 `2fe2017d3c69bb475818f3f9ae37af5eda750489`으로
[수집 실행 42181102099](https://github.com/billcox2020-commits/all-collector/actions/runs/42181102099)이
`push` 이벤트로 자동 시작됐습니다. 수동 Actions 버튼 없이 실행되는 연결은 확인했습니다.

이 실행의 실제 자료 수집은 Apify HTTP 403으로 실패했습니다.
응답에 따르면 Free 요금제에 포함된 월 $5 사용량을 모두 사용해 Actor 실행이 차단된 상태입니다.
Apify 사용량 주기 초기화 또는 요금제 변경 전에는 새 자료 수집이 불가능합니다.
GitHub Connector 쓰기 403과는 다른 문제이며, 기존 상품 데이터와 관리자 수정 기록은 변경되지 않았습니다.
요청 제출 성공을 수집 완료로 보고하면 안 됩니다.
