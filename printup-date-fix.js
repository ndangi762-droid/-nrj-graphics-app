(() => {
  'use strict';

  const today = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  function addDateField() {
    const form = document.getElementById('puJobForm');
    if (!form || document.getElementById('puJobDate')) return;
    const title = document.getElementById('puJobTitle');
    const input = document.createElement('input');
    input.id = 'puJobDate';
    input.type = 'date';
    input.value = today();
    input.setAttribute('aria-label', 'Bill date');
    input.style.marginBottom = '10px';
    if (title) title.insertAdjacentElement('afterend', input);
    else form.prepend(input);
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      const init = args[1] || {};
      if (url.includes('/api/public/jobs/create') && typeof init.body === 'string') {
        const body = JSON.parse(init.body);
        const dateInput = document.getElementById('puJobDate');
        if (dateInput?.value) body.bill_date = dateInput.value;
        else if (!body.bill_date) body.bill_date = today();
        args[1] = { ...init, body: JSON.stringify(body) };
      }
    } catch (_) {}
    return originalFetch(...args);
  };

  const observer = new MutationObserver(addDateField);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', addDateField);
  addDateField();
})();
