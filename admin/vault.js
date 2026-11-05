"use strict";
window.ArchiveVault = (() => {
  const key = 'all-collector-rebuild-v1@billcox2020-commits/all-collector:vault';
  const legacy = 'all-collector-admin-vault-v1';
  const database = 'all-collector-rebuild-v1@billcox2020-commits/all-collector:auth';
  let cached = '';
  function local() {
    try { return localStorage.getItem(key) || localStorage.getItem(legacy) || ''; }
    catch { return ''; }
  }
  function transaction(mode, action) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(database, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('vaults')) request.result.createObjectStore('vaults');
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(Error('로그인 저장소가 사용 중입니다. 다른 관리 창을 닫아 주세요.'));
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('vaults', mode);
        const operation = action(tx.objectStore('vaults'));
        tx.oncomplete = () => { db.close(); resolve(operation.result); };
        tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || Error('로그인 저장 실패')); };
      };
    });
  }
  async function read() {
    const copies = [local()];
    try { copies.push(await transaction('readonly', store => store.get(key))); } catch {}
    const stamp = value => { try { return Number(JSON.parse(value).saved_at) || 0; } catch { return -1; } };
    cached = copies.filter(Boolean).sort((a, b) => stamp(b) - stamp(a))[0] || '';
    return cached;
  }
  async function write(value) {
    value = JSON.stringify({...JSON.parse(value), saved_at: Date.now()});
    let durable = false;
    try { await transaction('readwrite', store => store.put(value, key)); durable = true; } catch {}
    try { localStorage.setItem(key, value); durable = true; } catch {}
    if (!durable) throw Error('로그인 저장을 허용해 주세요.');
    cached = value;
    try { localStorage.removeItem(legacy); await navigator.storage?.persist?.(); } catch {}
  }
  async function remove() {
    // Remove every legacy copy too, so an old password cannot reappear.
    try { await transaction('readwrite', store => store.delete(key)); }
    catch { throw Error('로그인을 지우지 못했습니다. 저장소 접근을 허용해 주세요.'); }
    try { localStorage.removeItem(key); localStorage.removeItem(legacy); }
    catch { throw Error('브라우저의 저장된 로그인을 지우지 못했습니다.'); }
    cached = '';
  }
  return {read, write, remove, current: () => cached || local()};
})();
