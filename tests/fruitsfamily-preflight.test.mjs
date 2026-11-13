import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareOne, effectiveItems, duplicateCandidates} from '../admin/fruitsfamily-core.mjs';

const item = {id:'BJ-123', source:'bunjang', status:'for_sale', title:'나이키 에어포스 미드 275', brand:'NIKE', category:'shoes', size:'275', price_krw:299000, image:'https://media.bunjang.co.kr/product/123.jpg', description:'밑창 사용감 있습니다.'};
test('single real saved product dry run preserves input and flags incomplete archive content', () => {
  const saved = JSON.parse(fs.readFileSync(new URL('../data/bunjang-active.json', import.meta.url)));
  const before = JSON.stringify(saved);
  const report = prepareOne(saved.items[0], []);
  assert.equal(report.mode, 'single_item_dry_run');
  assert.equal(report.can_publish, false);
  assert.equal(report.source_id, 'BJ-447097552');
  assert.equal(report.draft.description, '');
  assert.ok(report.blockers.some(row => row.includes('실제 상품 설명')));
  assert.ok(report.blockers.some(row => row.includes('사이즈 누락')));
  assert.equal(JSON.stringify(saved), before);
});
test('hidden and non-selling records are excluded including overridden statuses', () => {
  assert.deepEqual(effectiveItems([item], {hidden_ids:[item.id]}), []);
  assert.throws(() => prepareOne(item, [], {overrides:{[item.id]:{status:'sold'}}}));
  assert.throws(() => prepareOne([item], []));
});
test('overrides are used without mutating original product', () => {
  const report = prepareOne(item, [], {overrides:{[item.id]:{price_krw:55000, size:'280'}}});
  assert.equal(report.draft.price_krw, 55000);
  assert.equal(report.draft.size_label, '280');
  assert.equal(item.price_krw, 299000);
});
test('duplicates are blocked even if sold or changed in price', () => {
  const report = prepareOne(item, [{id:'abc', title:'나이키 에어포스 미드 275!!', status:'sold', price_krw:10000}]);
  assert.equal(report.duplicate_candidates.length, 1);
  assert.ok(report.blockers.some(row => row.includes('중복')));
  assert.equal(duplicateCandidates(item, [{id:'abc', title:'다른 이름'}], [{bunjang_id:item.id,fruits_id:'abc'}]).length, 1);
});
test('no match remains unverified and requires current complete inventory review', () => {
  const report = prepareOne(item, []);
  assert.equal(report.can_publish, false);
  assert.ok(report.required_review.some(row => row.includes('전체 상품')));
});
test('photos preserve ordering, do not silently truncate, and reject token URLs', () => {
  const report = prepareOne({...item, gallery:[item.image, ...Array.from({length:10}, (_, i) => `https://example.com/${i}.jpg`), 'javascript:alert(1)', 'https://example.com/x?token=secret']}, []);
  assert.equal(report.draft.photo_urls[0], item.image);
  assert.equal(report.draft.photo_urls.length, 11);
  assert.ok(report.blockers.some(row => row.includes('10장 초과')));
  assert.ok(!JSON.stringify(report).includes('token=secret'));
});
test('price is validated without silently changing sale terms', () => {
  for (const price of [0, 4999, '299000', NaN, 10000000]) assert.ok(prepareOne({...item, price_krw:price}, []).blockers.some(row => row.includes('가격')));
});
