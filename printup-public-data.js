(() => {
  'use strict';

  const TOKEN_KEY = 'printup_public_access_token';
  const getToken = () => sessionStorage.getItem(TOKEN_KEY) || '';
  const setToken = (token) => { if (token) sessionStorage.setItem(TOKEN_KEY, token); };
  const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

  // Capture public auth tokens without putting them in cookies/localStorage.
  // The server session remains HttpOnly; this token is held only in sessionStorage
  // so the tenant-scoped REST API can keep using Supabase RLS.
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      const init = args[1] || {};
      if (url.includes('/public/signup/complete') && typeof init.body === 'string') {
        const body = JSON.parse(init.body);
        if (body?.access_token) setToken(body.access_token);
      }
    } catch (_) {}
    const response = await originalFetch(...args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (url.includes('/public/otp/verify') || url.includes('/public/session')) {
        const data = await response.clone().json();
        if (data?.access_token) setToken(data.access_token);
      }
    } catch (_) {}
    return response;
  };

  async function api(path, payload = {}) {
    const token = getToken();
    if (!token) return { ok: false, error: 'Public login session is missing. Please login again.' };
    try {
      const response = await originalFetch('/api/public/' + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, access_token: token })
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) clearToken();
      return data;
    } catch (_) {
      return { ok: false, error: 'Network error. Please try again.' };
    }
  }

  window.PRINTUPPublicAPI = {
    setAccessToken: setToken,
    getAccessToken: getToken,
    clearAccessToken: clearToken,
    shop: () => api('shop'),
    customers: () => api('customers/list'),
    createCustomer: (data) => api('customers/create', data),
    jobs: () => api('jobs/list'),
    createJob: (data) => api('jobs/create', data),
    updateJobStatus: (data) => api('jobs/status', data),
    payments: () => api('payments/list'),
    createPayment: (data) => api('payments/create', data),
    services: () => api('services/list'),
    createService: (data) => api('services/create', data)
  };

  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '';
  const statusLabel = (value) => String(value || 'pending').replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());

  function screen(name) { return document.querySelector(`.pu-screen[data-screen="${name}"]`); }
  function panel(title, body) { return `<div class="pu-panel"><h3>${title}</h3>${body}</div>`; }
  function message(id, text, good=false) { const el=$(id); if(el){el.textContent=text;el.style.color=good?'#059669':'#667085';} }

  let cache = { customers: [], jobs: [], payments: [], services: [], shop: null };

  async function loadAll() {
    if (!getToken()) return;
    const [shop, customers, jobs, payments, services] = await Promise.all([
      api('shop'), api('customers/list'), api('jobs/list'), api('payments/list'), api('services/list')
    ]);
    if (shop?.ok) cache.shop = Array.isArray(shop.data) ? shop.data[0] : shop.data;
    if (customers?.ok) cache.customers = Array.isArray(customers.data) ? customers.data : [];
    if (jobs?.ok) cache.jobs = Array.isArray(jobs.data) ? jobs.data : [];
    if (payments?.ok) cache.payments = Array.isArray(payments.data) ? payments.data : [];
    if (services?.ok) cache.services = Array.isArray(services.data) ? services.data : [];
    updateHomeStats();
  }

  function updateHomeStats() {
    const jobs = cache.jobs;
    const payments = cache.payments;
    const sales = jobs.reduce((s,j)=>s+Number(j.total||0),0);
    const received = payments.reduce((s,p)=>s+Number(p.amount||0),0);
    const pending = jobs.reduce((s,j)=>s+Number(j.balance||0),0);
    const hero = document.querySelector('.pu-balance h1'); if(hero) hero.textContent = money(sales);
    const stats = document.querySelectorAll('.pu-stats .pu-stat strong');
    if(stats[0]) stats[0].textContent = String(jobs.length);
    if(stats[1]) stats[1].textContent = money(received);
    if(stats[2]) stats[2].textContent = money(pending);
    const tx = document.querySelector('.pu-transactions');
    if(tx) {
      const recent = jobs.slice(0,5);
      tx.innerHTML = recent.length ? recent.map(j => `<div class="pu-tx"><div class="pu-tx-icon">▧</div><div class="pu-tx-main"><b>${escapeHtml(j.title || j.job_number)}</b><span>${escapeHtml(j.customers?.name || 'Walk-in')} • ${formatDate(j.created_at)}</span></div><div class="pu-tx-right"><b>${money(j.total)}</b><span class="pu-status ${j.balance>0?'pending':''}">${escapeHtml(statusLabel(j.status))}</span></div></div>`).join('') : '<div class="pu-tx"><div class="pu-tx-icon">▧</div><div class="pu-tx-main"><b>No recent bills</b><span>Your latest bills will appear here</span></div><div class="pu-tx-right"><b>₹0</b><span class="pu-status">Ready</span></div></div>';
    }
  }

  async function renderCustomers() {
    const s=screen('customers'); if(!s) return;
    s.innerHTML = `<div class="pu-page-title"><button class="back" data-go="home">‹</button><h2>Customers</h2></div>
      <div class="pu-panel"><div class="pu-inline-head"><div><b>Customer Directory</b><small>${cache.customers.length} saved customers</small></div><button class="pu-action" id="puAddCustomer">＋ Add</button></div>
      <div id="puCustomerForm" class="pu-form" style="display:none"><input id="puCustomerName" placeholder="Customer name"><input id="puCustomerPhone" placeholder="Mobile number" inputmode="tel"><input id="puCustomerEmail" placeholder="Email (optional)"><button id="puSaveCustomer" class="pu-primary">Save Customer</button><div id="puCustomerMsg" class="pu-msg"></div></div>
      <div id="puCustomerList" class="pu-list">${cache.customers.length ? cache.customers.map(c=>`<div class="pu-row"><div><b>${escapeHtml(c.name)}</b><span>${escapeHtml(c.phone||'No mobile')}</span></div><span>${formatDate(c.created_at)}</span></div>`).join('') : '<div class="pu-muted">No customers yet. Add your first customer.</div>'}</div></div>`;
    $('puAddCustomer').onclick=()=>{$('puCustomerForm').style.display='block';$('puCustomerName').focus();};
    $('puSaveCustomer').onclick=async()=>{const name=$('puCustomerName').value.trim();if(!name){message('puCustomerMsg','Customer name is required.');return;}message('puCustomerMsg','Saving…');const r=await api('customers/create',{name,phone:$('puCustomerPhone').value.trim(),email:$('puCustomerEmail').value.trim()});if(!r.ok){message('puCustomerMsg',r.error);return;}await loadAll();renderCustomers();};
  }

  function customerOptions() { return '<option value="">Walk-in / No customer</option>'+cache.customers.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}${c.phone?' — '+escapeHtml(c.phone):''}</option>`).join(''); }
  function jobOptions() { return '<option value="">Select bill / job</option>'+cache.jobs.map(j=>`<option value="${escapeHtml(j.id)}">${escapeHtml(j.job_number||j.bill_number||j.title)} — ${money(j.balance)}</option>`).join(''); }

  async function renderJobs() {
    const s=screen('history'); if(!s) return;
    s.innerHTML=`<div class="pu-page-title"><button class="back" data-go="home">‹</button><h2>Bill History</h2></div>
      <div class="pu-panel"><div class="pu-inline-head"><div><b>Orders & Bills</b><small>${cache.jobs.length} records</small></div><button class="pu-action" id="puAddJob">＋ New</button></div>
      <div id="puJobForm" class="pu-form" style="display:none"><select id="puJobCustomer">${customerOptions()}</select><input id="puJobTitle" placeholder="Job / Bill title"><div class="pu-two"><input id="puJobTotal" type="number" min="0" step="0.01" placeholder="Total ₹"><input id="puJobAdvance" type="number" min="0" step="0.01" placeholder="Advance ₹"></div><select id="puJobStatus"><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="ready">Ready</option><option value="delivered">Delivered</option><option value="completed">Completed</option></select><button id="puSaveJob" class="pu-primary">Save Bill / Job</button><div id="puJobMsg" class="pu-msg"></div></div>
      <div class="pu-list">${cache.jobs.length ? cache.jobs.map(j=>`<div class="pu-row pu-row-stack"><div><b>${escapeHtml(j.job_number||j.title)}</b><span>${escapeHtml(j.customers?.name||'Walk-in')} • ${escapeHtml(j.title||'')}</span></div><div class="pu-row-right"><b>${money(j.total)}</b><span>${money(j.balance)} due</span><select data-job-status="${escapeHtml(j.id)}"><option value="pending" ${j.status==='pending'?'selected':''}>Pending</option><option value="in_progress" ${j.status==='in_progress'?'selected':''}>In Progress</option><option value="ready" ${j.status==='ready'?'selected':''}>Ready</option><option value="delivered" ${j.status==='delivered'?'selected':''}>Delivered</option><option value="completed" ${j.status==='completed'?'selected':''}>Completed</option></select></div></div>`).join('') : '<div class="pu-muted">No bills yet. Create your first bill/job.</div>'}</div></div>`;
    $('puAddJob').onclick=()=>{$('puJobForm').style.display='block';$('puJobTitle').focus();};
    $('puSaveJob').onclick=async()=>{const title=$('puJobTitle').value.trim();const total=Number($('puJobTotal').value||0);const advance=Number($('puJobAdvance').value||0);if(!title){message('puJobMsg','Job title is required.');return;}if(total<0||advance<0){message('puJobMsg','Amounts cannot be negative.');return;}message('puJobMsg','Saving…');const r=await api('jobs/create',{title,total,advance,customer_id:$('puJobCustomer').value||null,status:$('puJobStatus').value});if(!r.ok){message('puJobMsg',r.error);return;}await loadAll();renderJobs();};
    s.querySelectorAll('[data-job-status]').forEach(el=>el.onchange=async()=>{const r=await api('jobs/status',{job_id:el.dataset.jobStatus,status:el.value});if(!r.ok)alert(r.error);else await loadAll();});
  }

  async function renderPayments() {
    const s=screen('payment'); if(!s) return;
    const received=cache.payments.reduce((a,p)=>a+Number(p.amount||0),0), pending=cache.jobs.reduce((a,j)=>a+Number(j.balance||0),0);
    s.innerHTML=`<div class="pu-page-title"><button class="back" data-go="home">‹</button><h2>Payments & Udhaar</h2></div>
      <div class="pu-stats"><div class="pu-stat"><div class="ico">₹</div><strong>${money(received)}</strong><small>Total Received</small></div><div class="pu-stat"><div class="ico">◷</div><strong>${money(pending)}</strong><small>Pending</small></div><div class="pu-stat"><div class="ico">▣</div><strong>${cache.payments.length}</strong><small>Transactions</small></div></div>
      <div class="pu-panel"><div class="pu-inline-head"><div><b>Record Payment</b><small>Advance or balance received</small></div></div><div class="pu-form"><select id="puPayJob">${jobOptions()}</select><input id="puPayAmount" type="number" min="0.01" step="0.01" placeholder="Amount ₹"><select id="puPayMethod"><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank Transfer</option><option value="card">Card</option><option value="other">Other</option></select><input id="puPayRef" placeholder="Reference (optional)"><button id="puSavePay" class="pu-primary">Save Payment</button><div id="puPayMsg" class="pu-msg"></div></div></div>
      <div class="pu-panel"><h3>Payment Activity</h3><div class="pu-list">${cache.payments.length ? cache.payments.map(p=>`<div class="pu-row"><div><b>${money(p.amount)}</b><span>${escapeHtml(p.jobs?.job_number||'General payment')} • ${escapeHtml(p.method||'cash')}</span></div><span>${formatDate(p.paid_at)}</span></div>`).join('') : '<div class="pu-muted">No payments recorded yet.</div>'}</div></div>`;
    $('puSavePay').onclick=async()=>{const amount=Number($('puPayAmount').value||0);if(amount<=0){message('puPayMsg','Enter a valid payment amount.');return;}message('puPayMsg','Saving…');const r=await api('payments/create',{job_id:$('puPayJob').value||null,amount,method:$('puPayMethod').value,reference:$('puPayRef').value.trim()});if(!r.ok){message('puPayMsg',r.error);return;}await loadAll();renderPayments();};
  }

  async function renderServices() {
    const s=screen('services'); if(!s) return;
    s.innerHTML=`<div class="pu-page-title"><button class="back" data-go="home">‹</button><h2>Services</h2></div>
      <div class="pu-panel"><div class="pu-inline-head"><div><b>Printing Catalog</b><small>${cache.services.length} active services</small></div><button class="pu-action" id="puAddService">＋ Add</button></div>
      <div id="puServiceForm" class="pu-form" style="display:none"><input id="puServiceName" placeholder="Service name"><input id="puServiceCategory" placeholder="Category e.g. Flex, Vinyl, Digital"><input id="puServiceRate" type="number" min="0" step="0.01" placeholder="Starting rate ₹"><button id="puSaveService" class="pu-primary">Save Service</button><div id="puServiceMsg" class="pu-msg"></div></div>
      <div class="pu-list">${cache.services.length ? cache.services.map(v=>`<div class="pu-row"><div><b>${escapeHtml(v.name)}</b><span>${escapeHtml(v.category)} • ${money(v.rate)}</span></div><span>Active</span></div>`).join('') : '<div class="pu-muted">No services yet. Add your common printing services.</div>'}</div></div>`;
    $('puAddService').onclick=()=>{$('puServiceForm').style.display='block';$('puServiceName').focus();};
    $('puSaveService').onclick=async()=>{const name=$('puServiceName').value.trim();if(!name){message('puServiceMsg','Service name is required.');return;}message('puServiceMsg','Saving…');const r=await api('services/create',{name,category:$('puServiceCategory').value.trim()||'General',rate:Number($('puServiceRate').value||0)});if(!r.ok){message('puServiceMsg',r.error);return;}await loadAll();renderServices();};
  }

  async function renderProfile() {
    const s=screen('profile'); if(!s) return;
    const p=cache.shop||{};
    s.innerHTML=`<div class="pu-page-title"><button class="back" data-go="home">‹</button><h2>Shop Profile</h2></div>${panel('Business Details',`<div class="pu-profile"><div class="pu-profile-logo">P</div><div><b>${escapeHtml(p.shop_name||'PRINTUP Shop')}</b><small>${escapeHtml(p.business_type||'Printing Business')}</small></div></div><div class="pu-detail-grid"><div><small>Owner</small><b>${escapeHtml(p.owner_name||'-')}</b></div><div><small>Mobile</small><b>${escapeHtml(p.mobile||'-')}</b></div><div><small>City</small><b>${escapeHtml(p.city||'-')}</b></div><div><small>State</small><b>${escapeHtml(p.state||'-')}</b></div><div><small>Shop Code</small><b>${escapeHtml(p.shop_code||'-')}</b></div><div><small>GSTIN</small><b>${escapeHtml(p.gstin||'Not added')}</b></div></div>`)}`;
  }

  let lastScreen='';
  async function renderActive() {
    const active=document.querySelector('.pu-screen.active')?.dataset.screen||'';
    if(active===lastScreen) return;
    lastScreen=active;
    if(active==='customers') await renderCustomers();
    else if(active==='history') await renderJobs();
    else if(active==='payment') await renderPayments();
    else if(active==='services') await renderServices();
    else if(active==='profile') await renderProfile();
  }

  async function bootData() {
    if(!getToken()) return;
    await loadAll();
    lastScreen='';
    renderActive();
  }

  document.addEventListener('click', () => setTimeout(renderActive, 50));
  setInterval(renderActive, 700);
  document.addEventListener('DOMContentLoaded', bootData);
  if(document.readyState !== 'loading') bootData();
})();
