import {effectiveItems, prepareOne} from './fruitsfamily-core.mjs';

const $ = id => document.getElementById(id);
let active = [], changes = {}, existing = [], report = null;
async function read(path) {
  const response = await fetch(path, {cache:'no-store', credentials:'omit'});
  if (!response.ok) throw Error('저장 자료를 읽지 못했습니다. 새로고침 후 다시 확인하세요.');
  return response.json();
}
function list(id, values) {
  $(id).replaceChildren(...values.map(value => {
    const li = document.createElement('li'); li.textContent = value; return li;
  }));
}
function reset() { report = null; $('result').hidden = true; $('message').textContent = ''; }
$('product').addEventListener('change', reset);
$('prepare').addEventListener('click', () => {
  reset();
  try {
    report = prepareOne(active.find(item => item.id === $('product').value), existing, changes);
    $('summary').textContent = `${report.draft.title} · ${Number.isSafeInteger(report.draft.price_krw) ? report.draft.price_krw.toLocaleString('ko-KR') + '원' : '가격 확인 필요'}`;
    $('photo-count').textContent = `저장된 사진 ${report.draft.photo_urls.length}장. 전체 사진 수·원본 해상도는 확인되지 않았습니다.`;
    $('photos').replaceChildren(...report.draft.photo_urls.map((url, index) => {
      const li = document.createElement('li'); const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = `사진 ${index + 1} 열기 (원본 사이트 주소)`;
      li.append(a); return li;
    }));
    list('checks', [...report.blockers, ...report.required_review]);
    list('duplicates', report.duplicate_candidates.length
      ? report.duplicate_candidates.map(row => `${row.id} · ${row.title} · ${row.reason} · ${row.status}`)
      : ['저장된 부분 목록에서 후보를 찾지 못함. 현재 후루츠 전체 목록 확인 필요.']);
    $('preview').textContent = JSON.stringify(report.draft, null, 2);
    $('message').textContent = '1개 상품의 로컬 검토만 완료했습니다. 실제 등록은 실행하지 않았습니다.';
    $('result').hidden = false;
  } catch (error) { $('message').textContent = error.message; }
});
$('download').addEventListener('click', () => {
  if (!report) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2) + '\n'], {type:'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = `fruitsfamily-review-${report.source_id}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
try {
  const [catalog, overrides, fruits] = await Promise.all([
    read('../data/bunjang-active.json'), read('../data/admin-overrides.json'),
    read('../data/fruitsfamily-sale911-public.json'),
  ]);
  if (!Array.isArray(catalog.items) || !Array.isArray(fruits.records) || fruits.seller_id !== 'm5dx') throw Error('저장 자료 형식 또는 대상 상점을 확인하세요.');
  active = catalog.items; changes = overrides;
  existing = [...new Map(fruits.records.map(row => [row.id, row])).values()];
  const visible = effectiveItems(active, changes);
  $('inventory').textContent = `번개장터 준비 대상 ${visible.length}개 · 후루츠 sale911 공개 목록 ${existing.length}개 (확인 ${fruits.checked_at}). 공개 목록의 더보기까지 확인했으며 숨김 상품·현재 판매 상태는 미확인입니다.`;
  for (const item of visible) {
    const option = document.createElement('option'); option.value = item.id; option.textContent = `${item.id} · ${item.title}`; $('product').append(option);
  }
  $('product').disabled = false; $('prepare').disabled = false;
} catch (error) { $('inventory').textContent = error.message; }
