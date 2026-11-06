import test from 'node:test';
import assert from 'node:assert/strict';
import {candidates, toRaw} from '../scripts/bunjang-public-records.mjs';
const now = '2026-11-06T07:00:00Z', visible = new Set(['123']);
const record = {pid:'123',name:'NIKE',status:'SELLING',update_time:1793948400,price:1234,productImage:'https://example.com/{res}/{cnt}.jpg'};
test('read nested public response, verify shop links and preserve real source timestamp',()=>{
 assert.equal(candidates({data:{responses:{mainGrid:{searchResponse:{data:[record]}}}}}).length,1);
 const out=toRaw(record,visible,now);assert.equal(out.sellerId,'4934829');assert.equal(out.id,'123');
 assert.equal(out.updatedAt,new Date(record.update_time*1000).toISOString());assert.equal(out.scrapedAt,now);
 assert.equal(out.image,'https://example.com/400/1.jpg');
});
test('reject other sellers, unlinked records, sold listings and missing dates',()=>{
 assert.equal(toRaw({...record,uid:'999'},visible,now),null);
 assert.equal(toRaw(record,new Set(),now),null);
 assert.equal(toRaw({...record,status:'SOLD'},visible,now),null);
 assert.equal(toRaw({...record,update_time:null},visible,now),null);
});
