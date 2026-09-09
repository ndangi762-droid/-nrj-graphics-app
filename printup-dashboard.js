(() => {
  'use strict';

  const NAV = [
    ['home','Home','⌂'],
    ['bill','New Bill','＋'],
    ['history','History','▣'],
    ['payment','Payment','₹']
  ];

  const MORE = [
    ['customers','Customers','👥'],
    ['services','Services','◈'],
    ['reviews','Reviews','★'],
    ['help','Help & Support','?'],
    ['profile','Profile','●'],
    ['about','About','ⓘ']
  ];

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));

  function injectStyle(){
    if ($('#printup-shell-style')) return;
    const style = document.createElement('style');
    style.id = 'printup-shell-style';
    style.textContent = `
      :root{--pu-gold:#d7a63a;--pu-ink:#111827;--pu-soft:#f5f6f8;--pu-line:#e5e7eb}
      body{padding:0!important;background:linear-gradient(180deg,#f8fafc 0,#eef1f5 100%)!important}
      .container{max-width:1180px!important;padding:0 18px 100px!important}
      .printup-app-header{position:sticky;top:10px;z-index:50;margin-top:10px!important;border-radius:18px!important;backdrop-filter:blur(14px)}
      .printup-shell{display:flex;gap:18px;align-items:flex-start}
      .printup-side{position:sticky;top:104px;width:210px;flex:0 0 210px;background:#fff;border:1px solid var(--pu-line);border-radius:20px;padding:10px;box-shadow:0 8px 30px rgba(15,23,42,.07)}
      .printup-side button,.printup-bottom button,.printup-more button{border:0;background:transparent;color:#64748b;font:700 12px system-ui;cursor:pointer;border-radius:14px;transition:.2s;display:flex;align-items:center;gap:9px}
      .printup-side button{width:100%;padding:12px;text-align:left}
      .printup-side button.active,.printup-side button:hover,.printup-more button:hover{background:#f8f3e7;color:#9a711d}
      .printup-side .more-label{padding:14px 10px 7px;font-size:10px;font-weight:900;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em}
      .printup-main{min-width:0;flex:1;width:100%}
      .printup-pagebar{display:flex;align-items:center;justify-content:space-between;margin:4px 0 14px;padding:4px 2px}
      .printup-pagebar h2{font-size:22px;margin:0;color:#111827}
      .printup-pagebar span{font-size:11px;color:#6b7280}
      .printup-bottom{display:none}
      .printup-fab{position:fixed;right:22px;bottom:28px;width:54px;height:54px;border:0;border-radius:18px;background:#111827;color:#fff;font-size:25px;box-shadow:0 12px 28px rgba(17,24,39,.25);z-index:60;cursor:pointer}
      .printup-screen-card{transition:opacity .18s,transform .18s}
      .printup-hidden{display:none!important}
      .printup-more{margin-top:8px;padding-top:8px;border-top:1px solid #f0f1f3}
      .printup-more-panel{background:#fff;border:1px solid var(--pu-line);border-radius:18px;padding:16px;margin-bottom:16px;box-shadow:0 6px 24px rgba(15,23,42,.06)}
      .printup-more-panel h3{margin:0 0 6px;font-size:18px;color:#111827}
      .printup-more-panel p{margin:5px 0;color:#6b7280;font-size:13px;line-height:1.5}
      .printup-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
      .printup-info{padding:13px;border:1px solid #eceff2;border-radius:14px;background:#fafafa}
      .printup-info b{display:block;font-size:11px;color:#6b7280;margin-bottom:4px}
      .printup-info span{font-weight:800;color:#111827;font-size:14px}
      .printup-action{display:inline-flex!important;width:auto!important;padding:10px 14px!important;background:#111827!important;color:#fff!important;margin-top:10px}
      @media(max-width:899px){
        .container{padding:0 10px 92px!important}
        .printup-shell{display:block}
        .printup-side{display:none}
        .printup-bottom{position:fixed;display:flex;left:10px;right:10px;bottom:10px;height:68px;z-index:55;background:rgba(255,255,255,.94);backdrop-filter:blur(18px);border:1px solid #e5e7eb;border-radius:20px;box-shadow:0 12px 36px rgba(15,23,42,.15);padding:6px 4px;justify-content:space-around}
        .printup-bottom button{flex:1;justify-content:center;flex-direction:column;gap:3px;font-size:10px}
        .printup-bottom .nav-icon{font-size:21px;line-height:20px}
        .printup-bottom button.active{color:#9a711d;background:#f8f3e7}
        .printup-fab{right:18px;bottom:88px;width:48px;height:48px;border-radius:16px;font-size:22px}
        .printup-pagebar{margin-top:2px}
        .printup-pagebar h2{font-size:19px}
        .printup-info-grid{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function classify(card){
    const text=(card.innerText||'').toLowerCase();
    if(/history|previous|record|bill history/.test(text)) return 'history';
    if(/payment|advance|balance|paid|upi/.test(text)) return 'payment';
    if(/customer|job|service|expense|item|quantity|width|height|rate|bill/.test(text)) return 'bill';
    return 'home';
  }

  function createMorePanel(id){
    const panel=document.createElement('section');
    panel.className='printup-more-panel printup-hidden';
    panel.dataset.moreScreen=id;
    const data={
      customers:{title:'Customers',desc:'Customer details aur billing history ko ek jagah manage karo.',items:[['Customer Management','Customer records, contact details aur jobs manage karein.'],['Customer 360°','Customer ke bills, payments aur pending balance ek view mein.']]},
      services:{title:'Services',desc:'PRINTUP ke printing aur production services yahan manage hongi.',items:[['Service Categories','Flex, Vinyl, Boards & Panels aur Others.'],['19 Services','Aapke configured service catalog ko organized rakha gaya hai.']]},
      reviews:{title:'Reviews',desc:'Customer feedback aur business reviews ko track karne ke liye dedicated section.',items:[['Customer Feedback','Reviews ko collect aur manage karne ka space.'],['Business Reputation','Positive feedback ko future marketing mein use kar sakte hain.']]},
      help:{title:'Help & Support',desc:'PRINTUP use karne mein problem aaye to support details yahan milengi.',items:[['Phone','+91 8690996080'],['Email','ndangi762@gmail.com'],['Support','Billing, customers, payments aur app related help.']]},
      profile:{title:'Profile',desc:'Aapke PRINTUP account aur business profile ki basic details.',items:[['Login Username',window.PRINTUP_USERNAME || 'admin'],['Account','Secure login protected'],['Business','NRJ Graphics']]},
      about:{title:'About PRINTUP',desc:'Graphics, Printing & Production business management ke liye banaya gaya app.',items:[['App','PRINTUP'],['Business','NRJ Graphics'],['Purpose','Billing • Customers • Payments • Jobs • Production']]}
    }[id];
    panel.innerHTML=`<h3>${data.title}</h3><p>${data.desc}</p><div class="printup-info-grid">${data.items.map(x=>`<div class="printup-info"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div>`;
    return panel;
  }

  function setup(){
    const container=$('.container');
    if(!container || $('#printup-shell')) return;
    injectStyle();
    const header=$('.header');
    if(header) header.classList.add('printup-app-header');

    const cards=$$('.card',container);
    const shell=document.createElement('div'); shell.id='printup-shell'; shell.className='printup-shell';
    const side=document.createElement('aside'); side.className='printup-side';
    side.innerHTML='<div style="padding:9px 10px 12px;font-weight:900;font-size:13px;color:#111827">PRINTUP</div>';
    const main=document.createElement('main'); main.className='printup-main';
    const pagebar=document.createElement('div'); pagebar.className='printup-pagebar';
    pagebar.innerHTML='<div><h2 id="printup-page-title">Home</h2><span>Graphics • Printing • Production</span></div>';
    main.appendChild(pagebar);
    const content=document.createElement('div');
    cards.forEach(card=>{card.classList.add('printup-screen-card');content.appendChild(card);});
    main.appendChild(content);
    const morePanels={};
    MORE.forEach(item=>{morePanels[item[0]]=createMorePanel(item[0]);main.appendChild(morePanels[item[0]]);});
    shell.appendChild(side); shell.appendChild(main); container.innerHTML=''; container.appendChild(shell);

    const bottom=document.createElement('nav'); bottom.className='printup-bottom'; document.body.appendChild(bottom);
    const fab=document.createElement('button'); fab.className='printup-fab'; fab.type='button'; fab.title='New Bill'; fab.textContent='＋'; document.body.appendChild(fab);
    const buttons=[];
    function addNav(parent,id,label,icon){const b=document.createElement('button');b.type='button';b.dataset.screen=id;b.innerHTML=`<span class="nav-icon">${icon}</span><span>${label}</span>`;parent.appendChild(b);buttons.push(b);return b;}
    NAV.forEach(n=>addNav(side,...n));
    const moreLabel=document.createElement('div');moreLabel.className='more-label';moreLabel.textContent='More';side.appendChild(moreLabel);
    MORE.forEach(n=>addNav(side,...n));
    NAV.forEach(n=>addNav(bottom,...n));
    const moreBtn=addNav(bottom,'more','More','•••');

    function show(screen){
      $('#printup-page-title').textContent=screen==='bill'?'New Bill':(screen==='more'?'More':screen[0].toUpperCase()+screen.slice(1));
      buttons.forEach(b=>b.classList.toggle('active',b.dataset.screen===screen));
      $$('.printup-more-panel',main).forEach(p=>p.classList.add('printup-hidden'));
      const all=$$('.printup-screen-card',content);
      if(screen==='home') all.forEach(c=>c.classList.remove('printup-hidden'));
      else if(['bill','history','payment'].includes(screen)) all.forEach(c=>c.classList.toggle('printup-hidden',classify(c)!==screen));
      else if(MORE.some(x=>x[0]===screen)){all.forEach(c=>c.classList.add('printup-hidden'));morePanels[screen].classList.remove('printup-hidden');}
      else if(screen==='more'){all.forEach(c=>c.classList.add('printup-hidden'));}
      window.scrollTo({top:0,behavior:'smooth'});
    }
    buttons.forEach(b=>b.addEventListener('click',()=>show(b.dataset.screen)));
    fab.addEventListener('click',()=>show('bill'));
    show('home');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup,{once:true}); else setup();
})();
