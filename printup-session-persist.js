(() => {
  'use strict';

  const KEY = 'printup_public_access_token';
  const read = (store) => {
    try { return store.getItem(KEY) || ''; } catch (_) { return ''; }
  };
  const write = (token) => {
    if (!token) return;
    try { sessionStorage.setItem(KEY, token); } catch (_) {}
    try { localStorage.setItem(KEY, token); } catch (_) {}
  };

  // Keep the public Supabase access token available after an app/browser reload.
  // The HttpOnly PRINTUP session cookie still remains the server-side login guard.
  const existing = read(sessionStorage) || read(localStorage);
  if (existing) write(existing);

  const currentFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await currentFetch(...args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (url.includes('/public/otp/verify') || url.includes('/public/session') || url.includes('/public/signup/complete')) {
        const data = await response.clone().json();
        if (data?.access_token) write(data.access_token);
      }
    } catch (_) {}
    return response;
  };
})();
