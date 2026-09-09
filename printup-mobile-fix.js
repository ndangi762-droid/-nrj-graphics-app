(() => {
  'use strict';

  function cleanupLegacyMobileNav() {
    const shell = document.getElementById('printup-shell');
    const ownBottom = document.querySelectorAll('.printup-bottom');
    const ownFab = document.querySelectorAll('.printup-fab');

    // Keep exactly one PRINTUP navigation bar and one FAB.
    ownBottom.forEach((el, i) => { if (i > 0) el.remove(); });
    ownFab.forEach((el, i) => { if (i > 0) el.remove(); });

    // Hide legacy/fallback fixed navigation that can remain outside the new app shell.
    const labels = ['Home', 'New Bill', 'History', 'Payment'];
    document.querySelectorAll('body *').forEach((el) => {
      if (!el || el === shell || el.closest('#printup-shell') || el.classList.contains('printup-bottom') || el.classList.contains('printup-fab')) return;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      const hits = labels.filter(label => text.includes(label)).length;
      if (hits >= 3) {
        el.setAttribute('data-printup-legacy-nav', '1');
        el.style.setProperty('display', 'none', 'important');
      }
    });
  }

  function boot() {
    cleanupLegacyMobileNav();
    setTimeout(cleanupLegacyMobileNav, 250);
    setTimeout(cleanupLegacyMobileNav, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
