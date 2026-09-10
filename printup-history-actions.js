(() => {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => `₹${Number(v || 0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
  let busy = false;

  async function addActions() {
    const screen = document.querySelector('.pu-screen[data-screen="history"]');
    if (!screen || !window.PRINTUPPublicAPI || busy) return;
    const rows = Array.from(screen.querySelectorAll('[data-job-status]')).map(select => ({ select, row: select.closest('.pu-row'), id: select.dataset.jobStatus }));
    if (!rows.length) return;
    busy = true;
    try {
      const result = await window.PRINTUPPublicAPI.jobs();
      const jobs = Array.isArray(result?.data) ? result.data : [];
      rows.forEach(({row,id}) => {
        if (!row || row.querySelector('[data-history-actions]')) return;
        const job = jobs.find(x => x.id === id);
        if (!job) return;
        const box = document.createElement('div');
        box.dataset.historyActions = '1';
        box.style.cssText='display:flex;gap:5px;margin-top:3px;justify-content:flex-end';
        box.innerHTML='<button type="button" data-wa style="border:1px solid #d7deea;border-radius:8px;background:#fff;padding:5px 7px;font-size:10px;font-weight:800;color:#0f9d72">WhatsApp</button><button type="button" data-pdf style="border:1px solid #d7deea;border-radius:8px;background:#fff;padding:5px 7px;font-size:10px;font-weight:800;color:#1468e8">Invoice</button>';
        box.querySelector('[data-wa]').onclick=()=>{
          const customer=job.customers?.name||'Customer';
          const text=`PRINTUP Bill\n${job.bill_number||job.job_number||''}\nCustomer: ${customer}\nTotal: ${money(job.total)}\nReceived: ${money(job.advance)}\nBalance: ${money(job.balance)}\nStatus: ${String(job.status||'pending').replace(/_/g,' ')}`;
          window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');
        };
        box.querySelector('[data-pdf]').onclick=()=>{
          const customer=job.customers?.name||'Customer';
          const w=window.open('','_blank','noopener');
          if(!w) return;
          w.document.write(`<!doctype html><html><head><title>PRINTUP Invoice ${esc(job.bill_number||job.job_number)}</title><style>body{font-family:Arial,sans-serif;padding:36px;color:#102a56}h1{margin:0 0 4px}small{color:#667085}.box{max-width:720px;margin:auto;border:1px solid #dfe6f0;border-radius:16px;padding:28px}.line{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #edf1f5}.total{font-size:20px;font-weight:800}.brand{color:#1468e8;font-weight:900;margin-bottom:20px}@media print{body{padding:0}.box{border:0}}</style></head><body><div class="box"><div class="brand">PRINTUP by NRJ Graphics</div><h1>Invoice</h1><small>${esc(job.bill_number||job.job_number||'')}</small><div style="margin:24px 0"><b>Customer</b><div>${esc(customer)}</div></div><div class="line"><span>Job</span><b>${esc(job.title||'Printing Work')}</b></div><div class="line"><span>Total</span><b>${money(job.total)}</b></div><div class="line"><span>Received</span><b>${money(job.advance)}</b></div><div class="line total"><span>Balance</span><b>${money(job.balance)}</b></div><div style="margin-top:22px"><small>Status: ${esc(job.status||'pending')} • ${esc(new Date(job.created_at||Date.now()).toLocaleDateString('en-IN'))}</small></div></div><script>window.print()<\/script></body></html>`);
          w.document.close();
        };
        row.querySelector('.pu-row-right')?.appendChild(box);
      });
    } finally { busy = false; }
  }
  document.addEventListener('DOMContentLoaded', addActions);
  document.addEventListener('click', () => setTimeout(addActions, 120));
  setInterval(addActions, 1200);
})();
