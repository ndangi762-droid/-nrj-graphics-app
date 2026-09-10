(() => {
  'use strict';

  const TOKEN_KEY = 'printup_public_access_token';
  const getToken = () => sessionStorage.getItem(TOKEN_KEY) || '';
  const setToken = (token) => { if (token) sessionStorage.setItem(TOKEN_KEY, token); };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (url.includes('/public/otp/verify')) {
        const data = await response.clone().json();
        if (data?.access_token) setToken(data.access_token);
      }
    } catch (_) {}
    return response;
  };

  async function api(path, payload = {}) {
    const token = getToken();
    if (!token) return { ok: false, error: 'Public login session is missing.' };
    const response = await originalFetch('/api/public/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, access_token: token })
    });
    return await response.json().catch(() => ({ ok: false, error: 'Invalid server response.' }));
  }

  window.PRINTUPPublicAPI = {
    setAccessToken: setToken,
    getAccessToken: getToken,
    customers: () => api('customers/list'),
    createCustomer: (data) => api('customers/create', data),
    jobs: () => api('jobs/list'),
    payments: () => api('payments/list'),
    services: () => api('services/list')
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '';

  function customerScreen() {
    return document.querySelector('.pu-screen[data-screen="customers"]');
  }

  async function renderCustomers() {
    const screen = customerScreen();
    if (!screen) return;
    if (!document.getElementById('printupPublicCustomers')) {
      const panel = document.createElement('div');
      panel.id = 'printupPublicCustomers';
      panel.className = 'pu-panel';
      panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div><h3>Customers</h3><div class="pu-muted">Your shop customers, saved securely to your PRINTUP account.</div></div>
          <button id="puAddCustomer" type="button" style="border:0;border-radius:12px;padding:10px 12px;background:#1468e8;color:#fff;font-weight:800">＋ Add</button>
        </div>
        <div id="puCustomerForm" style="display:none;margin-top:12px">
          <input id="puCustomerName" placeholder="Customer name" style="width:100%;padding:11px;border:1px solid #d7deea;border-radius:10px">
          <input id="puCustomerPhone" placeholder="Mobile number" inputmode="tel" style="width:100%;padding:11px;border:1px solid #d7deea;border-radius:10px;margin-top:8px">
          <button id="puSaveCustomer" type="button" style="width:100%;margin-top:9px;padding:11px;border:0;border-radius:10px;background:#0f172a;color:#fff;font-weight:800">Save Customer</button>
          <div id="puCustomerMsg" class="pu-muted" style="margin-top:7px"></div>
        </div>
        <div id="puCustomerList" class="pu-list"><div class="pu-muted">Loading customers…</div></div>`;
      screen.appendChild(panel);
      document.getElementById('puAddCustomer').onclick = () => {
        document.getElementById('puCustomerForm').style.display = 'block';
        document.getElementById('puCustomerName').focus();
      };
      document.getElementById('puSaveCustomer').onclick = saveCustomer;
    }

    const result = await api('customers/list');
    const list = document.getElementById('puCustomerList');
    if (!result.ok) {
      list.innerHTML = `<div class="pu-muted">${escapeHtml(result.error)}</div>`;
      return;
    }
    const customers = Array.isArray(result.data) ? result.data : [];
    list.innerHTML = customers.length
      ? customers.map(c => `<div class="pu-row"><div><b>${escapeHtml(c.name || 'Unnamed')}</b><span>${escapeHtml(c.phone || 'No mobile')}</span></div><span>${formatDate(c.created_at)}</span></div>`).join('')
      : '<div class="pu-muted">No customers yet. Add your first customer.</div>';
  }

  async function saveCustomer() {
    const name = document.getElementById('puCustomerName').value.trim();
    const phone = document.getElementById('puCustomerPhone').value.trim();
    const msg = document.getElementById('puCustomerMsg');
    if (!name) { msg.textContent = 'Customer name is required.'; return; }
    msg.textContent = 'Saving…';
    const result = await api('customers/create', { name, phone });
    if (!result.ok) { msg.textContent = result.error; return; }
    document.getElementById('puCustomerName').value = '';
    document.getElementById('puCustomerPhone').value = '';
    document.getElementById('puCustomerForm').style.display = 'none';
    msg.textContent = '';
    await renderCustomers();
  }

  let lastScreen = '';
  function watch() {
    const active = document.querySelector('.pu-screen.active')?.dataset.screen || '';
    if (active !== lastScreen) {
      lastScreen = active;
      if (active === 'customers') renderCustomers();
    }
  }

  document.addEventListener('click', () => setTimeout(watch, 50));
  setInterval(watch, 700);
  document.addEventListener('DOMContentLoaded', watch);
})();
