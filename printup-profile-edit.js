(() => {
  'use strict';
  const KEY='printup_shop_profile_local';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fields=[['shop_name','Shop / Business Name'],['owner_name','Owner Name'],['mobile','Mobile'],['email','Email'],['address','Address'],['city','City'],['state','State'],['pin_code','PIN Code'],['business_type','Business Type'],['gstin','GSTIN'],['pan','PAN'],['invoice_prefix','Invoice Prefix']];
  function local(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return {}}}
  function saveLocal(p){localStorage.setItem(KEY,JSON.stringify(p))}
  async function apiSave(p){
    const token=window.PRINTUPPublicAPI?.getAccessToken?.()||sessionStorage.getItem('printup_public_access_token')||'';
    if(!token)return null;
    const r=await fetch('/api/public/shop/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...p,access_token:token})});
    const j=await r.json().catch(()=>({})); if(!r.ok||!j.ok)throw new Error(j.error||'Unable to save shop profile.'); return j.data;
  }
  function install(){
    const s=document.querySelector('.pu-screen.active[data-screen="profile"]'); if(!s||s.dataset.profileEdit==='1')return;
    s.dataset.profileEdit='1';
    const saved=local();
    if(Object.keys(saved).length){
      s.querySelectorAll('.pu-detail-grid>div').forEach(d=>{const label=d.querySelector('small')?.textContent?.trim();const map={Owner:'owner_name',Mobile:'mobile',City:'city',State:'state',GSTIN:'gstin'};const k=map[label];if(k&&saved[k])d.querySelector('b').textContent=saved[k]});
      const title=s.querySelector('.pu-profile b'); if(title&&saved.shop_name)title.textContent=saved.shop_name;
    }
    const btn=document.createElement('button');btn.id='puEditProfile';btn.textContent='✎ Edit Profile';
    btn.style.cssText='display:block;width:100%;margin:0 0 14px;padding:13px;border:0;border-radius:14px;background:#1468e8;color:#fff;font-weight:800;font-size:13px;cursor:pointer';
    s.querySelector('.pu-panel')?.insertAdjacentElement('beforebegin',btn);
    btn.onclick=()=>{
      if($('puProfileEditForm'))return;
      const p={...saved};
      ['shop_name','owner_name','mobile','email','address','city','state','pin_code','business_type','gstin','pan','invoice_prefix'].forEach(k=>{if(!p[k]){const src=document.querySelector(`[data-profile-${k}]`);if(src)p[k]=src.textContent.trim()}});
      const form=document.createElement('div');form.id='puProfileEditForm';form.className='pu-form';form.innerHTML=`<b style="font-size:15px">Edit Business Details</b>${fields.map(([k,l])=>`<input id="puProf_${k}" placeholder="${l}" value="${esc(p[k]||'')}">`).join('')}<button id="puSaveProfile" class="pu-primary">Save Profile</button><div id="puProfileMsg" class="pu-msg"></div>`;
      btn.insertAdjacentElement('afterend',form);
      $('puSaveProfile').onclick=async()=>{
        const out={};fields.forEach(([k])=>out[k]=$('puProf_'+k).value.trim());
        if(!out.shop_name||!out.owner_name){$('puProfileMsg').textContent='Shop name and owner name are required.';return}
        $('puProfileMsg').textContent='Saving…';
        try{const data=await apiSave(out);if(data&&typeof data==='object')Object.assign(out,data);saveLocal(out);$('puProfileMsg').textContent='Saved successfully ✓';setTimeout(()=>location.reload(),350)}catch(e){$('puProfileMsg').textContent=e.message}
      };
    };
  }
  const obs=new MutationObserver(install);obs.observe(document.documentElement,{childList:true,subtree:true});install();
})();
