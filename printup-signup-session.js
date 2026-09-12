(() => {
  'use strict';

  const KEY = 'printup_public_access_token';
  const write = (token) => {
    if (!token) return;
    try { sessionStorage.setItem(KEY, token); } catch (_) {}
    try { localStorage.setItem(KEY, token); } catch (_) {}
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (url.includes('/public/signup/complete') || url.includes('/public/otp/verify')) {
        const data = await response.clone().json();
        if (data?.access_token) write(data.access_token);
      }
    } catch (_) {}
    return response;
  };
})();
