export const SELLER = '4934829';
export function candidates(value, result = []) {
  if (!value || typeof value !== 'object') return result;
  if (!Array.isArray(value) && (value.pid || value.productId || value.product_id) && (value.name || value.title)) result.push(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') candidates(child, result);
  return result;
}
function timestamp(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = typeof value === 'number' || /^\d{10,13}$/.test(String(value));
  const date = new Date(numeric ? Number(value) * (Number(value) < 1e12 ? 1000 : 1) : value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
export function toRaw(record, visibleIds, now) {
  const id = String(record.pid || record.productId || record.product_id || '');
  if (!/^\d+$/.test(id) || !visibleIds.has(id)) return null;
  const seller = record.sellerId ?? record.seller_id ?? record.uid ?? record.userId ?? record.shopId;
  if (seller !== undefined && String(seller) !== SELLER) return null;
  const status = String(record.saleStatus ?? record.status ?? '').toLowerCase();
  if (!['selling', 'for_sale', '판매중', '판매 중', 'active', 'on_sale'].includes(status)) return null;
  const updatedAt = [record.updatedAt, record.updated_at, record.updateTime, record.update_time,
    record.createdAt, record.created_at, record.createTime, record.create_time, record.publishedAt]
    .map(timestamp).find(Boolean);
  if (!updatedAt) return null;
  const image = record.productImage ?? record.imageUrl ?? record.image ?? '';
  if (typeof image !== 'string') return null;
  return {
    id, sellerId: SELLER, status: 'for_sale', title: String(record.name || record.title).trim(),
    updatedAt, scrapedAt: now, source_url: `https://m.bunjang.co.kr/products/${id}`,
    image: image.replace('{res}', '400').replace('{cnt}', '1'),
    price: record.price ?? record.price_krw ?? 0,
    description: typeof record.description === 'string' ? record.description : '',
  };
}
