(() => {
  'use strict';
  const CATALOG = [
    {key:'flex', title:'Flex Printing', icon:'▰', items:['Star Flex','Normal HS Flex','Black Back (BB) Flex','One Way Vision','Vinyl','Backlit Flex']},
    {key:'digital', title:'Digital Printing', icon:'▤', items:['300 GSM Single Side','300 GSM Both Side','SS + Lamination','BS + Lamination','SS Non-Tear (NT)']},
    {key:'stickers', title:'Stickers', icon:'▱', items:['PVC Sticker','Normal Sticker']},
    {key:'sunboard', title:'Sunboard', icon:'▤', items:['Sunboard Print','Sunboard Mounting','Sunboard Cutout','Sunboard + Vinyl']},
    {key:'rollup', title:'Roll Up Standy', icon:'▥', items:['Standard Roll Up','Premium Roll Up','Double Side Roll Up']},
    {key:'canopy', title:'Canopy / Tent', icon:'⌂', items:['Canopy Printing','Canopy with Frame','Promotional Tent']}
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function style(){
    if(document.getElementById('pu-service-catalog-style')) return;
    const s=document.createElement('style');s.id='pu-service-catalog-style';s.textContent=`
      .pu-service-catalog{margin-top:14px}.pu-service-categories{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .pu-service-cat{appearance:none;border:1px solid #e8ecf3;border-radius:22px;padding:14px;background:#fff;box-shadow:0 8px 22px rgba(16,42,86,.06);text-align:left;cursor:pointer;min-height:104px;color:#102a56;transition:transform .16s,box-shadow .16s,border-color .16s}
      .pu-service-cat:active{transform:scale(.98)}.pu-service-cat.is-active{border-color:#1468e8;box-shadow:0 10px 26px rgba(20,104,232,.12)}
      .pu-service-cat-icon{width:38px;height:38px;border-radius:14px;display:grid;place-items:center;background:#edf4ff;color:#1468e8;font-size:18px;font-weight:900;margin-bottom:9px}
      .pu-service-cat:nth-child(1) .pu-service-cat-icon{background:#f1edff;color:#7357d5}.pu-service-cat:nth-child(3) .pu-service-cat-icon{background:#fff1e9;color:#e97842}.pu-service-cat:nth-child(4) .pu-service-cat-icon{background:#eafaf3;color:#20a875}.pu-service-cat:nth-child(5) .pu-service-cat-icon{background:#fff7df;color:#b88308}.pu-service-cat:nth-child(6) .pu-service-cat-icon{background:#fcecf7;color:#c14f91}
      .pu-service-cat b{display:block;font-size:12px;line-height:1.25}.pu-service-cat small{display:block;margin-top:4px;color:#7888a2;font-size:9px}
      .pu-service-detail{margin-top:12px;padding:14px;border-radius:22px;background:#f8faff;border:1px solid #e8edf5}.pu-service-detail-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.pu-service-detail-head h3{margin:0;font-size:15px}.pu-service-count{border-radius:999px;padding:6px 9px;background:#eaf2ff;color:#1468e8;font-size:9px;font-weight:900;white-space:nowrap}
      .pu-service-row{display:flex;align-items:center;gap:10px;margin-top:7px;padding:11px 12px;border-radius:16px;background:#fff;border:1px solid #edf1f6}.pu-service-row-icon{width:28px;height:28px;border-radius:10px;display:grid;place-items:center;background:#f1f5fa;color:#1468e8;font-size:11px;font-weight:900}.pu-service-row b{font-size:11px}.pu-service-row span:last-child{margin-left:auto;color:#9aa6b8;font-size:18px}
      @media(max-width:420px){.pu-service-categories{gap:8px}.pu-service-cat{padding:12px;min-height:98px;border-radius:19px}}
    `;document.head.appendChild(s);
  }
  function enhance(){
    const screen=document.querySelector('.pu-screen[data-screen="services"]');if(!screen)return;
    style();
    const panel=screen.querySelector('.pu-panel');if(!panel)return;
    if(panel.dataset.serviceCatalog==='1')return;
    panel.dataset.serviceCatalog='1';
    const oldList=panel.querySelector('.pu-list');if(oldList)oldList.style.display='none';
    const form=panel.querySelector('#puServiceForm');if(form)form.style.display='none';
    const head=panel.querySelector('.pu-inline-head');
    const wrap=document.createElement('div');wrap.className='pu-service-catalog';
    wrap.innerHTML=`<div class="pu-service-categories">${CATALOG.map((c,i)=>`<button type="button" class="pu-service-cat${i===0?' is-active':''}" data-service-cat="${c.key}"><span class="pu-service-cat-icon">${c.icon}</span><b>${c.title}</b><small>${c.items.length} services</small></button>`).join('')}</div><div class="pu-service-detail" id="puServiceDetail"></div>`;
    if(head)head.after(wrap);else panel.appendChild(wrap);
    const detail=wrap.querySelector('#puServiceDetail');
    const show=key=>{const c=CATALOG.find(x=>x.key===key)||CATALOG[0];wrap.querySelectorAll('[data-service-cat]').forEach(b=>b.classList.toggle('is-active',b.dataset.serviceCat===c.key));detail.innerHTML=`<div class="pu-service-detail-head"><h3>${c.title}</h3><span class="pu-service-count">${c.items.length} Services</span></div>${c.items.map(x=>`<div class="pu-service-row"><span class="pu-service-row-icon">✓</span><b>${esc(x)}</b><span>›</span></div>`).join('')}`};
    wrap.querySelectorAll('[data-service-cat]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.serviceCat)));
    show('flex');
  }
  const observer=new MutationObserver(enhance);
  function boot(){observer.observe(document.body,{childList:true,subtree:true});enhance();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
