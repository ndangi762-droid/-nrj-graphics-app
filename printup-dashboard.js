(() => {
  'use strict';

  const NAV = [
    ['home','Home','⌂'],
    ['bill','New Bill','＋'],
    ['history','History','▣'],
    ['payment','Payment','₹']
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
      .printup-side{position:sticky;top:104px;width:190px;flex:0 0 190px;background:#fff;border:1px solid var(--pu-line);border-radius:20px;padding:10px;box-shadow:0 8px 30px rgba(15,23,42,.07)}
      .printup-side button,.printup-bottom button{border:0;background:transparent;color:#64748b;font:700 12px system-ui;cursor:pointer;border-radius:14px;transition:.2s;display:flex;align-items:center;gap:9px}
      .printup-side button{width:100%;padding:13px 12px;text-align:left}
      .printup-side button.active,.printup-side button:hover{background:#f8f3e7;color:#9a711d}
      .printup-main{min-width:0;flex:1;width:100%}
      .printup-pagebar{display:flex;align-items:center;justify-content:space-between;margin:4px 0 14px;padding:4px 2px}
      .printup-pagebar h2{font-size:22px;margin:0;color:#111827}
      .printup-pagebar span{font-size:11px;color:#6b7280}
      .printup-bottom{display:none}
      .printup-fab{position:fixed;right:22px;bottom:28px;width:54px;height:54px;border:0;border-radius:18px;background:#111827;color:#fff;font-size:25px;box-shadow:0 12px 28px rgba(17,24,39,.25);z-index:60;cursor:pointer}
      .printup-screen-card{transition:opacity .18s,transform .18s}
      .printup-hidden{display:none!important}
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

  function setup(){
    const container=$('.container');
    if(!container || $('#printup-shell')) return;
    injectStyle();

    const header=$('.header');
    if(header) header.classList.add('printup-app-header');

    const cards=$$('.card',container);
    const shell=document.createElement('div');
    shell.id='printup-shell';
    shell.className='printup-shell';

    const side=document.createElement('aside');
    side.className='printup-side';
    side.innerHTML='<div style="padding:9px 10px 12px;font-weight:900;font-size:13px;color:#111827">PRINTUP</div>';

    const main=document.createElement('main');
    main.className='printup-main';
    const pagebar=document.createElement('div');
    pagebar.className='printup-pagebar';
    pagebar.innerHTML='<div><h2 id="printup-page-title">Home</h2><span>Graphics • Printing • Production</span></div>';
    main.appendChild(pagebar);

    const content=document.createElement('div');
    cards.forEach(card=>{ card.classList.add('printup-screen-card'); content.appendChild(card); });
    main.appendChild(content);

    shell.appendChild(side); shell.appendChild(main);
    container.innerHTML='';
    container.appendChild(shell);

    const bottom=document.createElement('nav');
    bottom.className='printup-bottom';
    document.body.appendChild(bottom);

    const fab=document.createElement('button');
    fab.className='printup-fab'; fab.type='button'; fab.title='New Bill'; fab.textContent='＋';
    document.body.appendChild(fab);

    const buttons=[];
    function addNav(parent,id,label,icon){
      const b=document.createElement('button'); b.type='button'; b.dataset.screen=id;
      b.innerHTML=`<span class="nav-icon">${icon}</span><span>${label}</span>`;
      parent.appendChild(b); buttons.push(b); return b;
    }
    NAV.forEach(n=>{ addNav(side,...n); addNav(bottom,...n); });

    function show(screen){
      $('#printup-page-title').textContent=screen==='bill'?'New Bill':screen[0].toUpperCase()+screen.slice(1);
      buttons.forEach(b=>b.classList.toggle('active',b.dataset.screen===screen));
      const all=$$('.printup-screen-card',content);
      if(screen==='home'){
        all.forEach(c=>c.classList.remove('printup-hidden'));
      } else {
        all.forEach(c=>c.classList.toggle('printup-hidden', classify(c)!==screen));
      }
      window.scrollTo({top:0,behavior:'smooth'});
    }
    buttons.forEach(b=>b.addEventListener('click',()=>show(b.dataset.screen)));
    fab.addEventListener('click',()=>show('bill'));
    show('home');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
