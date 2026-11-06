import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {candidates, toRaw, SELLER} from './bunjang-public-records.mjs';

const output = process.env.BUNJANG_RAW_PATH || 'bunjang-actor-items.json';
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage();
  const records = [], pending = new Set(), schemas = new Set();
  page.on('response', response => {
    const url = new URL(response.url());
    if (!/(^|\.)bunjang\.co\.kr$/.test(url.hostname)) return;
    if (!(response.headers()['content-type'] || '').includes('json') || !response.ok()) return;
    const work = response.json().then(body => {
      const found = candidates(body);
      records.push(...found);
      for (const item of found.slice(0, 2)) schemas.add(Object.keys(item).sort().join(','));
    }).catch(() => {});
    pending.add(work); work.finally(() => pending.delete(work));
  });
  const response = await page.goto(`https://m.bunjang.co.kr/shop/${SELLER}/products`, {
    waitUntil: 'domcontentloaded', timeout: 60000,
  });
  if (!response || !response.ok()) throw Error(`Public shop HTTP ${response?.status()}; existing archive untouched.`);
  await page.locator('a[href*="/products/"]').first().waitFor({state: 'attached', timeout: 30000});
  // Read the public shop normally. No credentials, paid service, proxy or challenge bypass.
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(1500); }
  const links = await page.locator('a[href*="/products/"]').evaluateAll(nodes => nodes.map(node => node.href));
  const visible = new Set(links.map(link => new URL(link).pathname.match(/^\/products\/(\d+)\/?$/)?.[1]).filter(Boolean));
  await Promise.allSettled([...pending]);
  const now = new Date().toISOString(), items = new Map();
  for (const record of records) {
    const normalized = toRaw(record, visible, now);
    if (normalized) items.set(normalized.id, normalized);
  }
  console.log(`Public shop: ${visible.size} linked products, ${records.length} JSON records, ${items.size} verified active records.`);
  if (!items.size) {
    console.log('Observed product field names:', [...schemas].slice(0, 4).join(' | ') || '(none)');
    throw Error('No verifiable active public records with source dates. Existing archive untouched.');
  }
  await fs.writeFile(output + '.tmp', JSON.stringify([...items.values()], null, 2) + '\n');
  await fs.rename(output + '.tmp', output);
} catch (error) {
  console.error(String(error.message)); process.exitCode = 1;
} finally { await browser.close(); }
