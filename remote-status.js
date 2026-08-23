/* ============================================================
   remote-status.js
   โหลดสถานะร้าน (เปิด/ปิด, หมวดปิด, สินค้าหมด, ราคาลด) จาก status.json
   ใช้ร่วมกันทุกหน้าเว็บลูกค้า (index.html และหน้าเมนูย่อยทุกหน้า)
   ============================================================ */
(function () {
  const STATUS_URL = 'status.json';
  const POLL_MS = 15000; // ดึงข้อมูลใหม่ทุก 15 วิ

  let statusData = null;

  // ---------- inject styles (ครั้งเดียว) ----------
  function injectStyles() {
    if (document.getElementById('rs-styles')) return;
    const style = document.createElement('style');
    style.id = 'rs-styles';
    style.textContent = `
      #rs-store-popup {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(20,10,6,0.72);
        display: flex; align-items: center; justify-content: center;
        padding: 24px; backdrop-filter: blur(3px);
      }
      #rs-store-popup .rs-popup-box {
        background: #fff; border-radius: 18px; max-width: 340px; width: 100%;
        padding: 28px 22px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.35);
        font-family: 'Kanit', sans-serif;
      }
      #rs-store-popup .rs-popup-icon { font-size: 2.4rem; margin-bottom: 8px; }
      #rs-store-popup .rs-popup-title { font-weight: 700; font-size: 1.15rem; color: #940008; margin-bottom: 10px; }
      #rs-store-popup .rs-popup-msg { font-size: 0.92rem; color: #4a3a2e; line-height: 1.6; white-space: pre-wrap; }

      [data-cat].rs-closed { filter: grayscale(0.85) brightness(0.82); pointer-events: none; position: relative; cursor: not-allowed; }
      [data-cat].rs-closed .rs-closed-badge {
        position: absolute; top: 10px; left: 10px; z-index: 5;
        background: #3a3a3a; color: #fff; font-size: 0.72rem; font-weight: 700;
        padding: 4px 10px; border-radius: 20px; font-family: 'Kanit', sans-serif;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      }

      .rs-soldout { filter: grayscale(0.9) brightness(0.85); position: relative; }
      .rs-soldout, .rs-soldout * { pointer-events: none !important; cursor: not-allowed !important; }
      .rs-soldout .rs-soldout-badge {
        position: absolute; top: 8px; right: 8px; z-index: 6;
        background: #940008; color: #fff; font-size: 0.7rem; font-weight: 700;
        padding: 4px 9px; border-radius: 20px; font-family: 'Kanit', sans-serif;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      }

      .rs-sale-badge {
        position: absolute; top: 8px; left: 8px; z-index: 6;
        background: #fff; border: 1.5px solid #940008; border-radius: 10px;
        padding: 3px 8px; font-family: 'Kanit', sans-serif; font-size: 0.72rem;
        display: flex; flex-direction: column; align-items: center; line-height: 1.25;
        box-shadow: 0 3px 8px rgba(0,0,0,0.2);
      }
      .rs-sale-badge s { color: #8a8a8a; font-weight: 400; }
      .rs-sale-badge .rs-sale-new { color: #c40010; font-weight: 800; }

      .rs-blocked-page {
        min-height: 60vh; display: flex; flex-direction: column; align-items: center;
        justify-content: center; text-align: center; padding: 40px 24px; font-family: 'Kanit', sans-serif;
      }
      .rs-blocked-page .icon { font-size: 3rem; margin-bottom: 14px; }
      .rs-blocked-page h2 { color: #940008; margin: 0 0 8px 0; }
      .rs-blocked-page a {
        margin-top: 18px; display: inline-block; padding: 10px 22px; border-radius: 30px;
        background: #940008; color: #fff; text-decoration: none; font-weight: 600;
      }
    `;
    document.head.appendChild(style);
  }

  async function load() {
    try {
      const res = await fetch(STATUS_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('status.json not found');
      statusData = await res.json();
    } catch (e) {
      statusData = null;
    }
    return statusData;
  }

  function showStoreClosedPopup(message) {
    let el = document.getElementById('rs-store-popup');
    const msg = message && message.trim() ? message : 'ขออภัยค่ะ ขณะนี้ร้านปิดชั่วคราว\nกรุณากลับมาใหม่ในภายหลังนะคะ';
    if (!el) {
      el = document.createElement('div');
      el.id = 'rs-store-popup';
      el.innerHTML = `<div class="rs-popup-box"><div class="rs-popup-icon">🔒</div><div class="rs-popup-title">ร้านปิดชั่วคราว</div><div class="rs-popup-msg"></div></div>`;
      document.body.appendChild(el);
    }
    el.querySelector('.rs-popup-msg').textContent = msg;
    document.body.style.overflow = 'hidden';
  }

  function hideStoreClosedPopup() {
    const el = document.getElementById('rs-store-popup');
    if (el) el.remove();
    document.body.style.overflow = '';
  }

  function applyStorePopup() {
    if (!statusData || !statusData.store) return;
    if (statusData.store.open === false) {
      showStoreClosedPopup(statusData.store.message);
    } else {
      hideStoreClosedPopup();
    }
  }

  // ใช้บน index.html เท่านั้น: ใส่ data-cat="drink_menu" ฯลฯ บนการ์ดหมวดเมนู
  function applyCategoryLocks() {
    if (!statusData || !statusData.categories) return;
    document.querySelectorAll('[data-cat]').forEach(function (card) {
      const cat = card.getAttribute('data-cat');
      const isOpen = statusData.categories[cat] !== false;
      card.classList.toggle('rs-closed', !isOpen);
      let badge = card.querySelector('.rs-closed-badge');
      if (!isOpen) {
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'rs-closed-badge';
          badge.textContent = 'ปิดชั่วคราว';
          card.appendChild(badge);
        }
      } else if (badge) {
        badge.remove();
      }
    });
  }

  // ใช้บนหน้าเมนูย่อย: เช็คว่าหมวดตัวเองถูกปิดจากแอดมินไหม ถ้าปิด บล็อกทั้งหน้า
  function checkOwnCategory(catKey) {
    if (!statusData || !statusData.categories) return true;
    if (statusData.categories[catKey] === false) {
      if (!document.getElementById('rs-blocked-page')) {
        document.body.innerHTML = `
          <div class="rs-blocked-page" id="rs-blocked-page">
            <div class="icon">🚫</div>
            <h2>เมนูนี้ปิดชั่วคราว</h2>
            <p>ขออภัยค่ะ หมวดเมนูนี้ปิดรับออเดอร์ชั่วคราว</p>
            <a href="index.html">← กลับหน้าหลัก</a>
          </div>`;
      }
      return false;
    }
    return true;
  }

  // ใส่กราฟฟิก หมด / ราคาลด บน element ที่มี id="card-<sku>"
  function applyItemOverrides() {
    if (!statusData || !statusData.items) return;
    Object.keys(statusData.items).forEach(function (sku) {
      const info = statusData.items[sku];
      const card = document.getElementById('card-' + sku);
      if (!card) return;
      card.style.position = card.style.position || 'relative';

      // สินค้าหมด
      card.classList.toggle('rs-soldout', !!info.soldOut);
      let soldBadge = card.querySelector('.rs-soldout-badge');
      if (info.soldOut) {
        if (!soldBadge) {
          soldBadge = document.createElement('div');
          soldBadge.className = 'rs-soldout-badge';
          soldBadge.textContent = 'หมด';
          card.appendChild(soldBadge);
        }
      } else if (soldBadge) {
        soldBadge.remove();
      }

      // ราคาลดชั่วคราว
      let saleBadge = card.querySelector('.rs-sale-badge');
      if (info.salePrice !== undefined && info.salePrice !== null && info.salePrice !== '') {
        if (!saleBadge) {
          saleBadge = document.createElement('div');
          saleBadge.className = 'rs-sale-badge';
          card.appendChild(saleBadge);
        }
        const orig = info.originalPrice !== undefined && info.originalPrice !== null ? info.originalPrice : '';
        saleBadge.innerHTML = (orig !== '' ? `<s>${orig} บ.</s>` : '') + `<span class="rs-sale-new">${info.salePrice} บ.</span>`;
      } else if (saleBadge) {
        saleBadge.remove();
      }
    });
  }

  function applyAll(opts) {
    applyStorePopup();
    if (opts.isIndex) applyCategoryLocks();
    if (opts.categoryKey) checkOwnCategory(opts.categoryKey);
    applyItemOverrides();
  }

  // หน้าเมนูหลายหน้า re-render การ์ดใหม่ทั้งกริดตอนผู้ใช้กดเลือกของ (renderItems() ฯลฯ)
  // ซึ่งจะล้างป้าย "หมด"/ราคาลด ที่เราแปะไว้ทิ้งไปด้วย เลยต้องคอยเฝ้าดู DOM แล้วแปะป้ายซ้ำอัตโนมัติ
  function watchDom(opts) {
    let scheduled = false;
    const observer = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        applyItemOverrides();
        if (opts.isIndex) applyCategoryLocks();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function init(opts) {
    opts = opts || {};
    injectStyles();
    await load();
    applyAll(opts);
    watchDom(opts);
    if (opts.poll !== false) {
      setInterval(async function () {
        await load();
        applyAll(opts);
      }, opts.pollMs || POLL_MS);
    }
  }

  window.RemoteStatus = {
    init: init,
    reload: async function (opts) { await load(); applyAll(opts || {}); },
    get data() { return statusData; }
  };
})();
