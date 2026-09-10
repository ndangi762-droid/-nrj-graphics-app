(() => {
  if (location.pathname !== '/') return;
  const boot = () => {
    if (document.getElementById('printupMobileHome')) return;
    const isMobile = () => window.matchMedia('(max-width: 720px)').matches;
    if (!isMobile()) return;

    const icon = '/nrj_graphics_icon.svg?v=2';
    const oldContainer = document.querySelector('.container');
    if (!oldContainer) return;

    const style = document.createElement('style');
    style.id = 'printupMobileStyle';
    style.textContent = `
      #printupMobileHome{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:720px;margin:0 auto;padding:18px 16px 96px;background:#f5f6f8;min-height:100vh;color:#202124;animation:pumPageIn .45s ease both}
      #printupMobileHome *{box-sizing:border-box}
      .pum-top{display:flex;align-items:center;gap:12px;padding:5px 0 22px;animation:pumDrop .5s cubic-bezier(.2,.8,.2,1) both}
      .pum-avatar{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#ffd5dc,#ff9da9);color:#8f1625;font-size:21px;font-weight:900;flex:none;animation:pumFloat 3s ease-in-out infinite}
      .pum-brand{display:flex;align-items:center;gap:9px;flex:1;min-width:0}.pum-brand img{width:42px;height:42px;border-radius:12px;box-shadow:0 7px 18px #1468e82c}.pum-brand b{font-size:23px;letter-spacing:.4px;color:#123b83}.pum-brand span{display:block;font-size:11px;color:#6d7480;margin-top:1px;font-weight:600}
      .pum-headbtn{width:42px;height:42px;border:0;background:#fff;border-radius:50%;font-size:23px;box-shadow:0 4px 14px #0000000d;display:grid;place-items:center;transition:transform .18s ease,box-shadow .18s ease}.pum-headbtn:active{transform:scale(.88);box-shadow:0 2px 7px #0002}
      .pum-title{font-size:29px;line-height:1.12;margin:20px 0 20px;font-weight:850;letter-spacing:-.8px;animation:pumRise .55s .08s ease both}
      .pum-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:26px}.pum-action{text-align:center;border:0;background:transparent;padding:0;min-width:0;animation:pumRise .5s ease both}.pum-action:nth-child(2){animation-delay:.06s}.pum-action:nth-child(3){animation-delay:.12s}.pum-action:nth-child(4){animation-delay:.18s}.pum-action .pum-icon{width:66px;height:66px;margin:auto;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:27px;box-shadow:0 8px 18px #00000016;transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s ease}.pum-action:hover .pum-icon{transform:translateY(-3px) scale(1.04);box-shadow:0 12px 25px #00000022}.pum-action:active .pum-icon{transform:scale(.88)}.pum-action .pum-icon{animation:pumSoftPulse 2.8s ease-in-out infinite}.pum-action:nth-child(2) .pum-icon{animation-delay:.3s}.pum-action:nth-child(3) .pum-icon{animation-delay:.6s}.pum-action:nth-child(4) .pum-icon{animation-delay:.9s}.pum-action:nth-child(1) .pum-icon{background:linear-gradient(145deg,#1769e8,#4f8ff4)}.pum-action:nth-child(2) .pum-icon{background:linear-gradient(145deg,#9a55e8,#d06af0)}.pum-action:nth-child(3) .pum-icon{background:linear-gradient(145deg,#10a98d,#38cfae)}.pum-action:nth-child(4) .pum-icon{background:linear-gradient(145deg,#ff8b3d,#ffbd59)}.pum-action strong{display:block;font-size:13px;line-height:1.2;margin-top:9px;color:#3c4045}
      .pum-card{background:#fff;border-radius:24px;padding:20px;margin:0 0 15px;box-shadow:0 6px 24px #0000000a;animation:pumRise .55s .22s ease both}.pum-card:nth-of-type(2){animation-delay:.3s}.pum-cardhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.pum-cardhead h2{font-size:22px;margin:0;font-weight:850}.pum-link{border:0;background:transparent;color:#1769d8;font-size:14px;font-weight:750;transition:transform .18s ease}.pum-link:active{transform:scale(.94)}
      .pum-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.pum-tile{border:0;background:#fff;text-align:center;padding:4px 2px;transition:transform .18s ease}.pum-tile:active{transform:scale(.93)}.pum-tile .pum-smallicon{width:44px;height:44px;border-radius:14px;margin:auto;display:grid;place-items:center;background:#edf5ff;color:#1264d5;font-size:21px;transition:transform .2s ease}.pum-tile:hover .pum-smallicon{transform:translateY(-3px) rotate(-2deg)}.pum-tile:nth-child(2) .pum-smallicon{background:#fff0f8;color:#bd3e9e}.pum-tile:nth-child(3) .pum-smallicon{background:#eafaf4;color:#0d9a77}.pum-tile:nth-child(4) .pum-smallicon{background:#fff5e8;color:#e68a19}.pum-tile span{display:block;font-size:12px;line-height:1.2;margin-top:7px;color:#4b4f54;font-weight:650}
      .pum-highlight{display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#d9f7ff,#c8f0ff);background-size:180% 180%;border-radius:24px;padding:17px 18px;animation:pumRise .55s .38s ease both,pumGradient 7s ease-in-out infinite}.pum-highlight .gift{font-size:42px;animation:pumFloat 2.6s ease-in-out infinite}.pum-highlight b{font-size:19px;display:block}.pum-highlight span{font-size:12px;color:#4b5962;display:block;margin-top:3px}.pum-arrow{margin-left:auto;font-size:28px;animation:pumArrow 1.8s ease-in-out infinite}
      .pum-minirow{display:flex;gap:10px;overflow:auto;padding:1px 0 4px;scroll-behavior:smooth}.pum-pill{white-space:nowrap;background:#fff;border-radius:999px;padding:12px 17px;font-size:13px;font-weight:700;box-shadow:0 5px 18px #00000008;transition:transform .18s ease,box-shadow .18s ease}.pum-pill:active{transform:scale(.94)}
      .pum-bottom{position:fixed;left:12px;right:12px;bottom:12px;z-index:9000;background:#fff;border-radius:22px;padding:9px 8px;display:grid;grid-template-columns:repeat(4,1fr);box-shadow:0 10px 30px #0000001a;border:1px solid #edf0f3;animation:pumNavUp .55s .35s cubic-bezier(.2,.8,.2,1) both}.pum-nav{border:0;background:transparent;color:#70757b;font-size:11px;font-weight:700;transition:transform .18s ease,color .18s ease}.pum-nav b{display:block;font-size:20px;line-height:22px;margin-bottom:2px;transition:transform .2s ease}.pum-nav.active{color:#1468e8}.pum-nav:active{transform:scale(.9)}.pum-nav.active b{animation:pumNavPop .8s ease both}
      .pum-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#202124;color:#fff;padding:11px 15px;border-radius:14px;font-size:12px;font-weight:700;z-index:10001;box-shadow:0 10px 25px #0004;animation:pumToast .25s ease both}
      @keyframes pumPageIn{from{opacity:0}to{opacity:1}}@keyframes pumDrop{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}@keyframes pumRise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes pumNavUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}@keyframes pumFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes pumSoftPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}@keyframes pumGradient{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}@keyframes pumArrow{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}@keyframes pumNavPop{0%{transform:scale(.7)}65%{transform:scale(1.12)}100%{transform:scale(1)}}@keyframes pumToast{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
      @media(prefers-reduced-motion:reduce){#printupMobileHome,.pum-top,.pum-title,.pum-action,.pum-card,.pum-highlight,.pum-bottom{animation:none!important}.pum-avatar,.pum-action .pum-icon,.pum-highlight .gift,.pum-arrow,.pum-nav.active b{animation:none!important;transition:none!important}}
      @media(min-width:721px){#printupMobileHome{display:none!important}}
    `;
    document.head.appendChild(style);

    const home = document.createElement('main');
    home.id = 'printupMobileHome';
    home.innerHTML = `
      <div class="pum-top"><div class="pum-avatar">N</div><div class="pum-brand"><img src="${icon}" alt="PRINTUP"><div><b>PRINTUP</b><span>Graphics • Printing • Production</span></div></div><button class="pum-headbtn" id="pumSearch" aria-label="Search">⌕</button><button class="pum-headbtn" id="pumBell" aria-label="Notifications">♧</button></div>
      <div class="pum-title">Print, Bill & Manage<br>your business</div>
      <div class="pum-grid"><button class="pum-action" data-open="New Bill"><span class="pum-icon">🧾</span><strong>New Bill</strong></button><button class="pum-action" data-open="Customers"><span class="pum-icon">👥</span><strong>Customers</strong></button><button class="pum-action" data-open="Jobs"><span class="pum-icon">🛠️</span><strong>Jobs & Orders</strong></button><button class="pum-action" data-open="Payments"><span class="pum-icon">₹</span><strong>Payments</strong></button></div>
      <section class="pum-card"><div class="pum-cardhead"><h2>PRINTUP Tools</h2><button class="pum-link" data-open="History">View All →</button></div><div class="pum-tiles"><button class="pum-tile" data-open="New Bill"><span class="pum-smallicon">➕</span><span>New Bill</span></button><button class="pum-tile" data-open="Services"><span class="pum-smallicon">🎨</span><span>Services</span></button><button class="pum-tile" data-open="Payments"><span class="pum-smallicon">💳</span><span>Payments</span></button><button class="pum-tile" data-open="Customers"><span class="pum-smallicon">📇</span><span>Customer Book</span></button></div></section>
      <section class="pum-card"><div class="pum-cardhead"><h2>Quick Access</h2></div><div class="pum-minirow"><button class="pum-pill" data-open="Jobs"><i>📦</i> Jobs & Orders</button><button class="pum-pill" data-open="History"><i>📋</i> Bill History</button><button class="pum-pill" data-open="Services"><i>⚙️</i> Services</button></div></section>
      <section class="pum-highlight"><div class="gift">✨</div><div><b>Welcome to PRINTUP</b><span>One place for your printing business.</span></div><div class="pum-arrow">›</div></section>
      <nav class="pum-bottom"><button class="pum-nav active" id="pumHome"><b>⌂</b>Home</button><button class="pum-nav" data-open="New Bill"><b>＋</b>New Bill</button><button class="pum-nav" data-open="Customers"><b>♙</b>Customers</button><button class="pum-nav" data-open="History"><b>☷</b>History</button></nav>
    `;
    oldContainer.style.display = 'none';
    document.body.style.background = '#f5f6f8';
    document.body.style.padding = '0';
    document.body.appendChild(home);

    const toast = (text) => { const t=document.createElement('div'); t.className='pum-toast'; t.textContent=text; document.body.appendChild(t); setTimeout(()=>t.remove(),1800); };
    const clickExisting = (terms) => {
      const nodes = [...document.querySelectorAll('button,a,[role="button"],.card-title,h2,h3,h4,label')];
      const found = nodes.find(el => el !== home && el.offsetParent !== null && terms.some(term => (el.textContent||'').trim().toLowerCase().includes(term.toLowerCase())));
      if(found){ found.scrollIntoView({behavior:'smooth',block:'center'}); if(found.tagName==='BUTTON'||found.tagName==='A'||found.getAttribute('role')==='button') found.click(); else toast('Opening '+terms[0]+'…'); }
      else toast(terms[0]+' screen is ready in the main PRINTUP system.');
    };
    home.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click',()=>{
      const name=btn.dataset.open; const map={"New Bill":["New Bill","Create Bill","Billing"],Customers:["Customers","Customer"],Jobs:["Jobs","Orders","Production"],Payments:["Payments","Payment"],Services:["Services","Service"],History:["History","Bill History","Bills"]};
      oldContainer.style.display=''; home.style.display='none'; document.body.style.padding='18px'; clickExisting(map[name]||[name]);
      const back=document.createElement('button'); back.id='pumBack'; back.textContent='‹  PRINTUP Home'; back.style.cssText='position:fixed;left:12px;top:12px;z-index:9999;border:0;border-radius:999px;background:#1468e8;color:#fff;padding:10px 14px;font-weight:800;box-shadow:0 6px 18px #1468e844;transition:transform .18s ease'; back.onpointerdown=()=>back.style.transform='scale(.94)'; back.onpointerup=()=>back.style.transform=''; document.body.appendChild(back); back.onclick=()=>{back.remove();oldContainer.style.display='none';home.style.display='block';document.body.style.padding='0';window.scrollTo({top:0,behavior:'smooth'});};
    }));
    document.getElementById('pumHome').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
    document.getElementById('pumSearch').onclick=()=>toast('Search will connect to your PRINTUP records.');
    document.getElementById('pumBell').onclick=()=>toast('No new notifications.');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
