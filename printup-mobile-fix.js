(() => {
  'use strict';

  function hideLegacyNav() {
    const shell = document.getElementById('printup-shell');
    document.querySelectorAll('.printup-bottom').forEach((el,i)=>{if(i>0)el.remove();});
    document.querySelectorAll('.printup-fab').forEach((el,i)=>{if(i>0)el.remove();});
    if (!shell) return;

    // The original app already has a mobile navigation (Home / New Bill / Jobs / Payment).
    // PRINTUP's injected navigation is the working navigation, so keep only that one.
    const wanted = ['Home','New Bill','Jobs','Payment'];
    const candidates = Array.from(document.querySelectorAll('body *')).filter(el => {
      if (!el || el.closest('#printup-shell') || el.classList.contains('printup-bottom') || el.classList.contains('printup-fab')) return false;
      const text=(el.innerText||'').replace(/\s+/g,' ').trim();
      if (!text) return false;
      const hits=wanted.filter(x=>text.includes(x)).length;
      if(hits<3) return false;
      const r=el.getBoundingClientRect();
      return r.width >= Math.min(window.innerWidth*.7, 320) && r.height >= 45 && r.height <= 260;
    });

    // Hide the smallest matching legacy navigation container(s), never body/html.
    candidates.sort((a,b)=>a.getBoundingClientRect().height-b.getBoundingClientRect().height);
    const target=candidates.find(el=>el.parentElement && !el.parentElement.matches('body,html')) || candidates[0];
    if(target){
      target.setAttribute('data-printup-legacy-nav','1');
      target.style.setProperty('display','none','important');
    }
  }

  function boot(){
    hideLegacyNav();
    setTimeout(hideLegacyNav,250);
    setTimeout(hideLegacyNav,900);
    setTimeout(hideLegacyNav,1800);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
