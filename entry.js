'use strict';
(() => {
  function destination(record, search) {
    const url = new URL(record?.server);
    if (record?.version !== 1 || url.protocol !== 'https:' || !/^[a-z0-9-]+\.trycloudflare\.com$/.test(url.hostname) || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid Alo server address.');
    const room = new URLSearchParams(search).get('room');
    if (/^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/.test(room || '')) url.searchParams.set('room', room);
    return url;
  }
  if (typeof module !== 'undefined') { module.exports = { destination }; return; }
  const $ = (id) => document.getElementById(id), repository = 'OmeraGod/alo-link';
  let busy = false, timer, failures = 0, nextAt = 0;
  async function readyTarget(record) {
    const target = destination(record, location.search);
    const health = await fetch(`${target.origin}/api/availability`, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(8000) });
    const state = await health.json();
    if (!health.ok || !state.ok || state.state !== 'ready') throw new Error(state.state || 'unavailable');
    return target;
  }
  async function findServer() {
    try {
      const response = await fetch(`https://raw.githubusercontent.com/${repository}/main/server.json?t=${Date.now()}`, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('registry');
      return await readyTarget(await response.json());
    } catch {
      // The raw CDN can retain the previous address briefly after a restart.
      // Use the public API only as a fallback; ordinary visits need no API quota.
      const response = await fetch(`https://api.github.com/repos/${repository}/contents/server.json?ref=main&t=${Date.now()}`, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('registry');
      const file = await response.json();
      if (file.encoding !== 'base64' || typeof file.content !== 'string' || file.size > 4096) throw new Error('registry');
      return readyTarget(JSON.parse(atob(file.content.replace(/\s/g, ''))));
    }
  }
  async function check() {
    if (busy) return; clearTimeout(timer); busy = true; $('retry').disabled = true; $('entryStatus').textContent = 'Đang kiểm tra kết nối…';
    try {
      if (navigator.onLine === false) throw new Error('offline');
      const target = await findServer();
      $('entryTitle').textContent = 'Kết nối đã sẵn sàng.'; $('entryMessage').textContent = 'Đang đưa bạn đến Alo…'; $('entryStatus').textContent = 'Máy chủ đang hoạt động';
      location.replace(target.href); return;
    } catch (error) {
      $('entryTitle').textContent = navigator.onLine === false ? 'Chờ Internet trở lại.' : 'Chờ một chút, chúng ta sẽ kết nối.';
      $('entryMessage').textContent = navigator.onLine === false ? 'Kiểm tra Wi-Fi hoặc dữ liệu di động. Trang sẽ tự thử lại.' : 'Máy chủ cá nhân đang tắt, đang khởi động hoặc tạm chưa sẵn sàng. Bạn có thể giữ nguyên đường dẫn này.';
      const delay = Math.min(60, 10 * 2 ** Math.min(failures++, 3)); nextAt = Date.now() + delay * 1000; timer = setTimeout(check, delay * 1000);
    } finally { busy = false; $('retry').disabled = false; }
  }
  $('retry').addEventListener('click', check);
  $('copyLink').addEventListener('click', async () => { try { await navigator.clipboard.writeText(new URL('.', location.href).href); $('copyLink').textContent = 'Đã sao chép link cố định ✓'; } catch { $('entryStatus').textContent = 'Sao chép đường dẫn đang mở trên thanh địa chỉ.'; } });
  window.addEventListener('online', () => { failures = 0; check(); });
  setInterval(() => { if (!busy && nextAt) $('entryStatus').textContent = `Tự kiểm tra lại sau ${Math.max(0, Math.ceil((nextAt - Date.now()) / 1000))} giây`; }, 1000);
  check();
})();
