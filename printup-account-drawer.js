(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  function install() {
    if ($('#pu-account-drawer-style')) return;
    const style = document.createElement('style');
    style.id = 'pu-account-drawer-style';
    style.textContent = `
      #puAccountOverlay{position:fixed;inset:0;background:rgba(20,25,45,.38);backdrop-filter:blur(2px);z-index:3000;opacity:0;pointer-events:none;transition:opacity .25s ease}
      #puAccountDrawer{position:absolute;top:0;right:0;width:min(360px,92vw);height:100%;background:#fff;border-radius:28px 0 0 28px;box-shadow:-18px 0 50px rgba(25,35,65,.22);transform:translateX(105%);transition:transform .34s cubic-bezier(.22,1,.36,1);overflow:auto;padding:22px 18px 28px;color:#17233d}
      #puAccountOverlay.open{opacity:1;pointer-events:auto}#puAccountOverlay.open #puAccountDrawer{transform:translateX(0)}
      .pu-ad-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.pu-ad-brand{display:flex;align-items:center;gap:11px}.pu-ad-logo{width:48px;height:48px;border-radius:16px;background:linear-gradient(145deg,#176be9,#0c50b0);color:#fff;display:grid;place-items:center;font-size:24px;font-weight:950}.pu-ad-brand b{display:block;font-size:18px}.pu-ad-brand small{display:block;color:#7b879c;font-size:10px;margin-top:2px}.pu-ad-close{width:40px;height:40px;border:0;border-radius:14px;background:#f3f6fb;color:#33415c;font-size:22px;cursor:pointer}.pu-ad-shop{padding:15px;border:1px solid #e8edf5;border-radius:20px;background:linear-gradient(135deg,#f7faff,#fff);margin-bottom:13px}.pu-ad-shop b{font-size:15px}.pu-ad-shop small{display:block;color:#7b879c;margin-top:4px;font-size:10px}.pu-ad-group{font-size:10px;color:#8793a7;font-weight:850;margin:15px 5px 7px;text-transform:uppercase;letter-spacing:.5px}.pu-ad-item{width:100%;display:flex;align-items:center;gap:12px;border:0;background:#fff;padding:13px 8px;border-radius:15px;text-align:left;color:#17233d;cursor:pointer}.pu-ad-item:active{background:#f5f8fd}.pu-ad-ico{width:36px;height:36px;border-radius:12px;background:#edf4ff;color:#1468e8;display:grid;place-items:center;font-weight:900;font-size:16px}.pu-ad-item b{font-size:12px}.pu-ad-item small{display:block;color:#8a95a8;font-size:9px;margin-top:2px}.pu-ad-item .arrow{margin-left:auto;color:#a0aabd;font-size:18px}.pu-ad-footer{margin-top:18px;padding:13px;text-align:center;color:#9aa5b5;font-size:9px}
    `;
    document.head.appendChild(style);
    const overlay = document.createElement('div'); overlay.id='puAccountOverlay';
    overlay.innerHTML = `<aside id="puAccountDrawer" aria-label="PRINTUP account menu">
      <div class="pu-ad-head"><div class="pu-ad-brand"><div class="pu-ad-logo">P</div><div><b>PRINTUP</b><small>by NRJ Graphics</small></div></div><button class="pu-ad-close" aria-label="Close">×</button></div>
      <div class="pu-ad-shop"><b>My PRINTUP Account</b><small>Manage your shop, billing and app settings</small></div>
      <div class="pu-ad-group">Account</div>
      <button class="pu-ad-item" data-go="profile"><span class="pu-ad-ico">●</span><span><b>Shop Profile</b><small>Shop & owner details</small></span><span class="arrow">›</span></button>
      <button class="pu-ad-item" data-go="services"><span class="pu-ad-ico">▣</span><span><b>Services</b><small>Printing catalog</small></span><span class="arrow">›</span></button>
      <button class="pu-ad-item" data-go="payment"><span class="pu-ad-ico">₹</span><span><b>Payments & UPI</b><small>Payment records and settings</small></span><span class="arrow">›</span></button>
      <div class="pu-ad-group">PRINTUP</div>
      <button class="pu-ad-item" data-go="about"><span class="pu-ad-ico">ⓘ</span><span><b>About PRINTUP</b><small>Version and product details</small></span><span class="arrow">›</span></button>
      <button class="pu-ad-item" data-go="help"><span class="pu-ad-ico">?</span><span><b>Help & Support</b><small>Get help with PRINTUP</small></span><span class="arrow">›</span></button>
      <button class="pu-ad-item" type="button" onclick="alert('Thank you for using PRINTUP!')"><span class="pu-ad-ico">★</span><span><b>Rate PRINTUP</b><small>Share your feedback</small></span><span class="arrow">›</span></button>
      <div class="pu-ad-footer">PRINTUP • by NRJ Graphics</div>
    </aside>`;
    document.body.appendChild(overlay);
    const close=()=>overlay.classList.remove('open');
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    $('.pu-ad-close',overlay).addEventListener('click',close);
    overlay.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{close();const id=b.dataset.go;const nav=[...document.querySelectorAll('.printup-bottom button')].find(x=>x.dataset.screen===id||x.getAttribute('data-screen')===id);if(nav)nav.click();else if(window.PRINTUPNav)window.PRINTUPNav(id);}));
    window.PRINTUPOpenAccount=()=>overlay.classList.add('open');
    window.PRINTUPCloseAccount=close;
  }
  function bind(){
    install();
    const candidates=[...document.querySelectorAll('.pu-brand-mark')];
    candidates.forEach(el=>{if(el.dataset.accountBound==='1')return;el.dataset.accountBound='1';el.style.cursor='pointer';el.setAttribute('role','button');el.setAttribute('aria-label','Open account menu');el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.PRINTUPOpenAccount();});});
  }
  const observer=new MutationObserver(bind); observer.observe(document.documentElement,{childList:true,subtree:true}); bind();
})();
