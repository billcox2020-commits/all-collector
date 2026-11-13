// Local preparation only. This module has no network or storage side effects.
const text = value => String(value ?? '').trim();
export const normalize = value => text(value).normalize('NFKC').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
const categories = {shoes:'신발', outer:'아우터', top:'상의', bottom:'하의', etc:'기타 (세부 분류 확인)'};

export function safeImage(value) {
  try {
    const url = new URL(text(value));
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash ? url.href : '';
  } catch { return ''; }
}

export function effectiveItems(active, changes = {}) {
  const hidden = new Set(changes.hidden_ids || []);
  return active.filter(item => item.source === 'bunjang' && !hidden.has(item.id))
    .map(item => ({...item, ...changes.overrides?.[item.id], id:item.id, source:item.source}))
    .filter(item => item.status === 'for_sale');
}

export function duplicateCandidates(item, existing, mappings = []) {
  const title = normalize(item.title);
  const mapped = new Set(mappings.filter(row => row.bunjang_id === item.id).map(row => row.fruits_id));
  return existing.flatMap(other => {
    const targetId = text(other.id) || text(other.source_url).match(/\/product\/([^/]+)/)?.[1];
    let reason = '';
    if (mapped.has(targetId) || other.bunjang_id === item.id) reason = '상품 ID 연결 기록';
    else if (title && title === normalize(other.title)) reason = '정규화한 상품명 일치';
    else if (safeImage(item.image) && safeImage(item.image) === safeImage(other.image)) reason = '대표 사진 주소 일치';
    else {
      const a = new Set(title.match(/.{1,2}/g) || []);
      const b = new Set(normalize(other.title).match(/.{1,2}/g) || []);
      const overlap = [...a].filter(token => b.has(token)).length;
      if (normalize(item.brand) && normalize(item.brand) === normalize(other.brand) && overlap >= 3 && overlap / Math.max(1, Math.min(a.size, b.size)) >= 0.6) reason = '같은 브랜드·유사 상품명 (수동 대조)';
    }
    return reason ? [{id:targetId || '', title:text(other.title), status:text(other.status), reason}] : [];
  });
}

export function prepareOne(item, existing, changes = {}, mappings = []) {
  if (!item || item.source !== 'bunjang' || !/^BJ-\d+$/.test(item.id)) throw Error('번개장터 상품 1개를 선택하세요.');
  const effective = effectiveItems([item], changes)[0];
  if (!effective) throw Error('숨김·예약·판매완료 상품은 준비 대상이 아닙니다.');
  const source = effective;
  const photos = [...new Set([source.image, ...(Array.isArray(source.gallery) ? source.gallery : [])].filter(Boolean))];
  const validPhotos = photos.map(safeImage).filter(Boolean);
  const placeholder = /번개장터 올콜렉터 상점.*(?:수집|확인)/.test(text(source.description));
  const draft = {
    title:text(source.title), price_krw:source.price_krw,
    photo_urls:validPhotos, description:placeholder ? '' : text(source.description),
    brand_label:text(source.brand), category_label:categories[source.category] || '', size_label:text(source.size),
    condition:null, shipping:null, fee_payer:null,
  };
  const blockers = [];
  if (!draft.title) blockers.push('상품명 누락');
  if (!Number.isSafeInteger(draft.price_krw) || draft.price_krw < 5000) blockers.push('가격은 정수 원화 5,000원 이상 필요');
  if (draft.price_krw >= 10000000) blockers.push('1,000만 원 이상 가격은 고객센터 확인 필요');
  if (!validPhotos.length) blockers.push('사용 가능한 HTTPS 사진 주소 누락');
  if (validPhotos.length !== photos.length) blockers.push('사진 주소에 비공개 토큰·쿼리 또는 지원하지 않는 형식이 있는지 확인');
  if (photos.length > 10) blockers.push('사진 10장 초과: 임의 삭제 없이 직접 선택 필요');
  if (!draft.description) blockers.push('실제 상품 설명 필요: 수집 안내문은 판매 설명으로 사용하지 않음');
  if (!draft.size_label) blockers.push('사이즈 누락: 상품에 맞게 확인 필요');
  if (!draft.brand_label || draft.brand_label === 'OTHER') blockers.push('브랜드 직접 확인 필요');
  if (!draft.category_label || source.category === 'etc') blockers.push('세부 카테고리 직접 확인 필요');
  if (/https?:\/\/|카카오|계좌|오픈채팅|010[- ]?\d/i.test(draft.description)) blockers.push('설명 내 외부 연락처·거래 유도 여부 직접 확인 필요');
  const duplicates = duplicateCandidates(source, existing, mappings);
  if (duplicates.length) blockers.push('기존 후루츠 상품과 중복 후보 있음: 등록 제외 후 직접 대조');
  return {
    schema_version:1, mode:'single_item_dry_run', can_publish:false, source_id:source.id,
    draft, duplicate_candidates:duplicates, blockers,
    required_review:[
      '현재 번개장터 판매 상태 재확인 (저장 목록은 실시간 재고가 아님)',
      '현재 후루츠 계정의 전체 상품과 대조 (저장된 부분 목록만으로 중복 없음 판정 불가)',
      '브랜드·세부 카테고리·사이즈를 실제 등록 화면의 선택값으로 확인 (공식 API ID 아님)',
      '사진 원본·순서·손상 부위·총 100MB 이하인지 확인 (주소만 변환됨)',
      '상품 상태·배송 방법·배송비·수수료 부담 선택 및 실제 등록 전 사용자 승인',
    ],
  };
}
