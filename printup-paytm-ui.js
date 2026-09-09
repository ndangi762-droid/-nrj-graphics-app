(() => {
  'use strict';
  // The legacy Paytm override remains disabled. This compatibility file now also
  // repairs the dashboard brand mark when the hosted asset is blocked or stale.
  const LOGO = 'https://raw.githubusercontent.com/ndangi762-droid/-nrj-graphics-app/main/nrj_graphics_icon.svg?v=3';

  function fixLogo() {
    document.querySelectorAll('.pu-brand-mark').forEach((el) => {
      if (el.dataset.logoFixed === '1') return;
      el.dataset.logoFixed = '1';
      el.textContent = '';
      const img = document.createElement('img');
      img.src = LOGO;
      img.alt = 'PRINTUP';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      Object.assign(img.style, {
        display: 'block', width: '100%', height: '100%', objectFit: 'cover',
        borderRadius: 'inherit'
      });
      el.style.background = 'transparent';
      el.style.overflow = 'hidden';
      el.appendChild(img);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fixLogo);
  else fixLogo();
  setTimeout(fixLogo, 150);
  setTimeout(fixLogo, 600);
})();
