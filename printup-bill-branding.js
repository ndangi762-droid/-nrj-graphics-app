(function(){
  const BUSINESS = {
    name: 'NRJ Graphics',
    phone: '+91 8690996080',
    email: 'ndangi762@gmail.com',
    upi: 'ndangi762-3@okicici'
  };

  function money(n){ return '₹ ' + (Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function esc(v){ return String(v ?? '').replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[s])); }
  function customer(){
    return {
      name: (document.getElementById('cust-name')?.value || 'Valued Customer').trim(),
      phone: (document.getElementById('cust-phone')?.value || '').trim()
    };
  }
  function totals(){
    let p=0,f=0,e=0,x=0;
    (window.cartItems || []).forEach(i=>{p+=Number(i.printCost)||0;f+=Number(i.frameCost)||0;e+=Number(i.finishingCost)||0;x+=(Number(i.totalAutoExpense)||0)+(Number(i.totalOtherExpense)||0);});
    const sub=p+f+e+x;
    const discount=Number(document.getElementById('inp-discount')?.value)||0;
    const gst=Number(document.getElementById('sel-gst')?.value)||0;
    const taxable=Math.max(0,sub-discount);
    const tax=taxable*gst/100;
    const grand=taxable+tax;
    const advance=Number(document.getElementById('inp-advance')?.value)||0;
    const balance=Math.max(0,grand-advance);
    return {p,f,e,x,discount,gst,tax,grand,advance,balance};
  }
  function upiUrl(amount, custName){
    const params = new URLSearchParams({pa:BUSINESS.upi,pn:BUSINESS.name,am:Number(amount||0).toFixed(2),cu:'INR',tn:`Bill payment - ${custName}`});
    return 'upi://pay?' + params.toString();
  }
  function ensurePdfBranding(){
    const tpl=document.getElementById('pdf-template');
    if(!tpl) return;
    let head=tpl.querySelector('.nrj-pdf-brand-head');
    if(!head){
      const oldTitle=tpl.querySelector('.pdf-title');
      if(oldTitle){
        oldTitle.textContent=BUSINESS.name.toUpperCase();
        oldTitle.classList.add('nrj-pdf-brand-head');
      }
      const subs=tpl.querySelectorAll('.pdf-sub');
      if(subs[0]) subs[0].textContent='Flex, Vinyl, Eco-Solvent Printing & Frame Fabrication';
      if(subs[1]) subs[1].textContent=`Mobile: ${BUSINESS.phone} | Email: ${BUSINESS.email}`;
    }
    const right=tpl.querySelector('.pdf-header > div:last-child');
    if(right){
      const t=right.querySelector('div:first-child');
      if(t) t.textContent='BILL / QUOTATION';
    }
    let qr=tpl.querySelector('#pdf-payment-qr');
    if(!qr){
      qr=document.createElement('div');
      qr.id='pdf-payment-qr';
      qr.innerHTML=`<div class="nrj-pdf-qr-card"><div class="nrj-pdf-qr-title">PAYMENT QR</div><div class="nrj-pdf-qr-inner" id="pdf-payment-qr-code"></div><div class="nrj-pdf-qr-amount" id="pdf-payment-qr-amount"></div><div class="nrj-pdf-qr-upi">UPI: ${BUSINESS.upi}</div></div>`;
      const footer=tpl.querySelector('div[style*="Authorized Signatory"]')?.parentElement;
      if(footer) footer.parentElement.insertBefore(qr, footer);
      else tpl.appendChild(qr);
    }
    const t=totals();
    const amount=t.balance>0?t.balance:t.grand;
    const name=customer().name;
    const box=document.getElementById('pdf-payment-qr-code');
    const amountEl=document.getElementById('pdf-payment-qr-amount');
    if(box && window.QRCode){
      box.innerHTML='';
      new QRCode(box,{text:upiUrl(amount,name),width:110,height:110,colorDark:'#111827',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
    }
    if(amountEl) amountEl.textContent=(t.balance>0?'Payable Balance: ':'Total: ')+money(amount);
    const prepared=Array.from(tpl.querySelectorAll('div')).find(el=>el.textContent?.includes('Prepared By:'));
    if(prepared) prepared.textContent='Prepared By: NRJ Graphics';
    const auth=Array.from(tpl.querySelectorAll('div')).find(el=>el.textContent?.includes('Authorized Signatory'));
    if(auth) auth.textContent='Authorized Signatory (NRJ Graphics)';
  }
  function styleSlip(){
    const slip=document.getElementById('slip-body');
    if(!slip) return;
    const h=slip.querySelector('h2'); if(h) h.textContent='NRJ GRAPHICS';
    const logo=slip.querySelector('.receipt-header-logo img'); if(logo){logo.alt='NRJ Graphics';}
    const p=slip.querySelector('h2 + p'); if(p) p.innerHTML='Flex, Vinyl, Eco-Solvent Printing & Frame Fabrication<br>Ph: '+BUSINESS.phone;
    let q=slip.querySelector('#slip-payment-qr');
    if(!q){
      q=document.createElement('div'); q.id='slip-payment-qr'; q.style.cssText='text-align:center;margin-top:10px;';
      q.innerHTML='<div id="slip-payment-qr-code"></div><div id="slip-payment-qr-amount" style="font-weight:700;margin-top:3px"></div><div style="font-size:9px">UPI: '+BUSINESS.upi+'</div>';
      slip.appendChild(q);
    }
    const t=totals(); const amount=t.balance>0?t.balance:t.grand;
    const box=document.getElementById('slip-payment-qr-code');
    if(box && window.QRCode){box.innerHTML='';new QRCode(box,{text:upiUrl(amount,customer().name),width:90,height:90});}
    const a=document.getElementById('slip-payment-qr-amount'); if(a)a.textContent=(t.balance>0?'Balance: ':'Total: ')+money(amount);
  }
  function populatePdf(){
    if(!(window.cartItems||[]).length){alert('Please add at least one job to generate PDF bill.');return false;}
    const c=customer(), t=totals();
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('pdf-cust-name',c.name);set('pdf-cust-phone',c.phone||'N/A');set('pdf-date-txt','Date: '+(typeof getCurrentDateTime==='function'?getCurrentDateTime():new Date().toLocaleString('en-IN')));
    const tbody=document.getElementById('pdf-items-tbody'); if(tbody){tbody.innerHTML='';(window.cartItems||[]).forEach((item,index)=>{const tr=document.createElement('tr');const frame=item.hasFrame?`Frame: ${item.totalPipeFeet} Rft Pipe${item.hasCrossBrace?' + Cross (+) Brace':''}`:'No Frame';const exp=(Number(item.totalAutoExpense||0)+Number(item.totalOtherExpense||0))>0?`<br>Exp: ${money((Number(item.totalAutoExpense)||0)+(Number(item.totalOtherExpense)||0))}`:'';tr.innerHTML=`<td>${index+1}</td><td><strong>${esc(item.title)}</strong><br><small>${esc(item.mediaName)}</small></td><td>${esc(item.widthInput)}x${esc(item.heightInput)} ${esc(item.unit)} (${esc(item.qty)} Pcs)<br><small>${esc(item.chargeableSqFtTotal)} SqFt</small></td><td>${frame}${exp}</td><td style="font-weight:bold;text-align:right">${money(item.itemTotalCost)}</td>`;tbody.appendChild(tr);});}
    set('pdf-sum-print',money(t.p));set('pdf-sum-frame',money(t.f));set('pdf-sum-extras',money(t.e));set('pdf-sum-exp',money(t.x));set('pdf-sum-tax',t.gst+'%');set('pdf-sum-discount',money(t.discount));set('pdf-sum-grand',money(t.grand));set('pdf-sum-adv',money(t.advance));set('pdf-sum-bal',money(t.balance));
    ensurePdfBranding();
    return true;
  }
  async function makePdfBlob(){
    const el=document.getElementById('pdf-template');
    const c=customer();
    return html2pdf().set({margin:0,filename:`NRJ_Graphics_Bill_${c.name.replace(/\s+/g,'_')}.pdf`,image:{type:'jpeg',quality:.98},html2canvas:{scale:2,useCORS:true,scrollX:0,scrollY:0,width:800},jsPDF:{unit:'pt',format:'a4',orientation:'portrait'}}).from(el).outputPdf('blob');
  }
  function shareMessage(c,t){
    return `Namaste ${c.name},\nNRJ Graphics ka bill/quotation attached hai.\nTotal: ${money(t.grand)}\nAdvance: ${money(t.advance)}\nBalance: ${money(t.balance)}\n\nThank you - NRJ Graphics`;
  }
  window.generatePdfQuotation=function(){
    if(!populatePdf()) return;
    const el=document.getElementById('pdf-template');
    const c=customer();
    html2pdf().set({margin:0,filename:`NRJ_Graphics_Bill_${c.name.replace(/\s+/g,'_')}.pdf`,image:{type:'jpeg',quality:.98},html2canvas:{scale:2,useCORS:true,scrollX:0,scrollY:0,width:800},jsPDF:{unit:'pt',format:'a4',orientation:'portrait'}}).from(el).save();
  };
  window.shareWhatsApp=async function(){
    if(!populatePdf()) return;
    const c=customer(),t=totals();
    try{
      const blob=await makePdfBlob();
      const file=new File([blob],`NRJ_Graphics_Bill_${c.name.replace(/\s+/g,'_')}.pdf`,{type:'application/pdf'});
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
        await navigator.share({title:'NRJ Graphics Bill',text:shareMessage(c,t),files:[file]});
        return;
      }
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),5000);
      const wa=`https://wa.me/${c.phone.replace(/\D/g,'')}?text=${encodeURIComponent(shareMessage(c,t)+'\n\nPDF bill download karke WhatsApp par attach kar dein.')}`;
      window.open(wa,'_blank');
    }catch(e){
      console.error(e);
      alert('PDF bill ready hai. Browser ne direct file-share allow nahi kiya, isliye PDF download karke WhatsApp par attach karein.');
      window.generatePdfQuotation();
    }
  };
  document.addEventListener('DOMContentLoaded',()=>{
    styleSlip();
    ensurePdfBranding();
  });
})();
