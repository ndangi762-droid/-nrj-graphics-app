(() => {
  'use strict';

  const CATALOG = [
    { key:'flex', title:'Flex Printing', icon:'▰', items:['Star Flex','Normal HS Flex','Black Back (BB) Flex','One Way Vision','Vinyl','Backlit Flex'] },
    { key:'digital', title:'Digital Printing', icon:'▤', items:['300 GSM Single Side','300 GSM Both Side','SS + Lamination','BS + Lamination','SS Non-Tear (NT)'] },
    { key:'stickers', title:'Stickers', icon:'▱', items:['PVC Sticker','Normal Sticker'] },
    { key:'sunboard', title:'Sunboard', icon:'▤', items:['Sunboard Print','Sunboard Mounting','Sunboard Cutout','Sunboard + Vinyl'] },
    { key:'rollup', title:'Roll Up Standy', icon:'▥', items:['Standard Roll Up','Premium Roll Up','Double Side Roll Up'] },
    { key:'canopy', title:'Canopy / Tent', icon:'⌂', items:['Canopy Printing','Canopy with Frame','Promotional Tent'] }
  ];
  const $ = (s,r=document) => r.querySelector(s);
  const esc = v => String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function style(){
    if($('#pu-service-catalog-style')) return;
    const s=document.createElement('style');s.id='pu-service-catalog-style';s.textContent=`
      .pu-cat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:12px 0}
      .pu-cat{border:1px solid #eceef4;border-radius:20px;padding:15px;background:#fff;box-shadow:0 8px 22px rgba(42,35,69,.07);cursor:pointer;text-align:left;min-height:112px;transition:.2s ease}
      .pu-cat:active{transform:scale(.98)}.pu-cat.active{border-color:#7b5ce1;box-shadow:0 8px 24px rgba(118,87,232,.16)}
      .pu-cat-icon{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:#f1edff;color:#6f55c9;font-weight:900;font-size:19px;margin-bottom:10px}
      .pu-cat:nth-child(2) .pu-cat-icon{background:#eaf3ff;color:#2872dc}.pu-cat:nth-child(3) .pu-cat-icon{background:#fff0e8;color:#e97b45}.pu-cat:nth-child(4) .pu-cat-icon{background:#eafaf3;color:#24a879}.pu-cat:nth-child(5) .pu-cat-icon{background:#fff7df;color:#bd8c12}.pu-cat:nth-child(6) .pu-cat-icon{background:#fcecf7;color:#c04d8e}
      .pu-cat b{display:block;font-size:13px;color:#29263a}.pu-cat small{display:block;margin-top:4px;color:#8d8aa0;font-size:10px}
      .pu-cat-detail{margin-top:12px;padding:14px;border-radius:20px;background:#faf9ff;border:1px solid #eeeaf8}.pu-cat-detail-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}.pu-cat-detail h3{margin:0;font-size:16px}.pu-cat-detail .count{background:#eee9ff;color:#6749c5;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:900}
      .pu-service-item{display:flex;align-items:center;gap:10px;padding:11px 10px;background:#fff;border:1px solid #f0eef4;border-radius:15px;margin-top:7px}.pu-service-item .dot{width:30px;height:30px;border-radius:10px;background:#f5f3f9;display:grid;place-items:center;color:#6c58bf;font-size:14px}.pu-service-item b{font-size:12px}.pu-service-item span{margin-left:auto;color:#8d8aa0;font-size:18px}
      @media(max-width:420px){.pu-cat-grid{gap:8px}.pu-cat{padding:12px;min-height:105px}.pu-cat b{font-size:12px}}
    `;document.head.appendChild(s);
  }

  function catalogHtml(){return `<div class="pu-cat-grid">${CATALOG.map((c,i)=>`<button type="button" class="pu-cat${i===0?' active':''}" data-service-cat="${c.key}"><span class="pu-cat-icon">${c.icon}</span><b>${c.title}</b><small>${c.items.length} services</small></button>`).join('')}</div><div id="puCatDetail" class="pu-cat-detail"></div>`}
  function renderDetail(key){const c=CATALOG.find(x=>x.key===key)||CATALOG[0];const d=$('#puCatDetail');if(!d)return;document.querySelectorAll('[data-service-cat]').forEach(x=>x.classList.toggle('active',x.dataset.serviceCat===c.key));d.innerHTML=`<div class="pu-cat-detail-head"><h3>${c.title}</h3><span class="count">${c.items.length} Services</span></div>${c.items.map(x=>`<div class="pu-service-item"><span class="dot">✓</span><b>${esc(x)}</b><span>›</span></div>`).join('')}`;}

  function enhance(){
    const s=document.querySelector('.pu-screen[data-screen="services"]');if(!s||s.dataset.catalogReady==='1')return;
    style();s.dataset.catalogReady='1';
    const panel=s.querySelector('.pu-panel');if(!panel)return;
    const heading=panel.querySelector('.pu-inline-head');
    const oldList=panel.querySelector('.pu-list');
    if(oldList)oldList.style.display='none';
    const wrap=document.createElement('div');wrap.id='puServiceCatalog';wrap.innerHTML=catalogHtml();
    if(heading)heading.after(wrap);else panel.appendChild(wrap);
    wrap.querySelectorAll('[data-service-cat]').forEach(b=>b.onclick=()=>renderDetail(b.dataset.serviceCat));
    renderDetail('flex');
  }

  const obs=new MutationObserver(()=>enhance());
  function boot(){const s=document.querySelector('.pu-screen[data-screen="services"]');if(s){obs.observe(s,{childList:true,subtree:true});enhance();}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
