(() => {
  const $ = (id) => document.getElementById(id);
  const msg = (text, good=false) => {
    const el = $('faceMsg');
    if (el) { el.textContent = text; el.style.color = good ? '#059669' : '#b42318'; }
  };
  const b64ToBuf = (s) => {
    const pad = '='.repeat((4 - (s.length % 4)) % 4);
    const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, c => c.charCodeAt(0)).buffer;
  };
  const bufToB64 = (buf) => {
    const bytes = new Uint8Array(buf);
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };
  const registrationJSON = (cred) => ({
    id: cred.id, rawId: bufToB64(cred.rawId), type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment || 'platform',
    response: {
      clientDataJSON: bufToB64(cred.response.clientDataJSON),
      attestationObject: bufToB64(cred.response.attestationObject),
      transports: cred.response.getTransports ? cred.response.getTransports() : ['internal']
    },
    clientExtensionResults: cred.getClientExtensionResults ? cred.getClientExtensionResults() : {}
  });
  const authenticationJSON = (cred) => ({
    id: cred.id, rawId: bufToB64(cred.rawId), type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment || 'platform',
    response: {
      clientDataJSON: bufToB64(cred.response.clientDataJSON),
      authenticatorData: bufToB64(cred.response.authenticatorData),
      signature: bufToB64(cred.response.signature),
      userHandle: cred.response.userHandle ? bufToB64(cred.response.userHandle) : null
    },
    clientExtensionResults: cred.getClientExtensionResults ? cred.getClientExtensionResults() : {}
  });
  const supported = () => !!(window.PublicKeyCredential && navigator.credentials && window.isSecureContext);
  const iconUrl = '/nrj_graphics_icon.svg?v=2';

  function applyBrandLogo() {
    document.querySelectorAll('.pu-brand-mark').forEach(el => {
      el.style.backgroundImage = `url("${iconUrl}")`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.fontSize = '0';
      el.textContent = '';
    });
  }

  function applyLoginBrand() {
    if (!$('faceLoginBtn') && !$('faceSetupBtn')) return;
    if (!document.querySelector('#printupLoginIcon')) {
      const box = document.querySelector('.box');
      const title = box && box.querySelector('h1');
      if (box && title) {
        const img = document.createElement('img');
        img.id = 'printupLoginIcon';
        img.src = iconUrl;
        img.alt = 'PRINTUP by NRJ Production';
        img.style.cssText = 'display:block;width:118px;height:118px;object-fit:cover;border-radius:27px;margin:0 auto 18px;box-shadow:0 16px 32px rgba(20,104,232,.22)';
        box.insertBefore(img, title);
        title.style.textAlign = 'center';
        title.style.fontSize = '28px';
        title.style.letterSpacing = '1px';
        const sub = box.querySelector('p');
        if (sub) sub.style.textAlign = 'center';
      }
    }
    if (!document.querySelector('link[data-printup-icon]')) {
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon'; link.href = iconUrl; link.setAttribute('data-printup-icon','1');
      document.head.appendChild(link);
      const fav = document.createElement('link');
      fav.rel = 'icon'; fav.href = iconUrl; fav.setAttribute('data-printup-icon','1');
      document.head.appendChild(fav);
    }
  }

  function installPublicOtpLogin() {
    if (location.pathname !== '/login' || document.querySelector('#publicOtpLogin')) return;
    const box = document.querySelector('.box');
    if (!box) return;

    const card = document.createElement('div');
    card.id = 'publicOtpLogin';
    card.style.cssText = 'margin-top:20px;padding-top:18px;border-top:1px solid #e7ebf2;font-family:Inter,system-ui,sans-serif';
    card.innerHTML = `
      <div style="font-weight:800;color:#102a56;font-size:15px;margin-bottom:5px">Public account login</div>
      <div style="font-size:12px;color:#667085;margin-bottom:10px">Login with the mobile number used for your PRINTUP shop.</div>
      <input id="publicLoginMobile" inputmode="tel" autocomplete="tel" placeholder="98765 43210" style="width:100%;box-sizing:border-box;padding:13px;border:1px solid #d7deea;border-radius:12px;font-size:15px">
      <button id="publicLoginSend" type="button" style="width:100%;margin-top:10px;padding:13px;border:0;border-radius:12px;background:#1468e8;color:#fff;font-weight:800">Send Login OTP</button>
      <div id="publicLoginOtpWrap" style="display:none;margin-top:10px">
        <input id="publicLoginOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit OTP" style="width:100%;box-sizing:border-box;padding:13px;border:1px solid #d7deea;border-radius:12px;font-size:18px;text-align:center;letter-spacing:6px;font-weight:800">
        <button id="publicLoginVerify" type="button" style="width:100%;margin-top:10px;padding:13px;border:0;border-radius:12px;background:#0f172a;color:#fff;font-weight:800">Verify & Login</button>
        <button id="publicLoginResend" type="button" style="width:100%;margin-top:8px;padding:10px;border:0;background:transparent;color:#1468e8;font-weight:800">Resend OTP</button>
      </div>
      <div id="publicLoginMsg" style="min-height:18px;margin-top:8px;font-size:12px;text-align:center;color:#667085"></div>`;
    box.appendChild(card);

    const clean = (v) => (v || '').replace(/\D/g, '');
    const normalize = (v) => {
      const x = clean(v);
      if (x.length === 10 && '6789'.includes(x[0])) return '+91' + x;
      if (x.length === 12 && x.startsWith('91') && '6789'.includes(x[2])) return '+' + x;
      return null;
    };
    const setMsg = (text, good=false) => {
      const el = $('publicLoginMsg');
      if (el) { el.textContent = text; el.style.color = good ? '#059669' : '#667085'; }
    };
    let mobile = '';

    const post = async (url, data) => {
      const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.message || 'Request failed');
      return j;
    };

    const send = async () => {
      mobile = normalize($('publicLoginMobile').value);
      if (!mobile) { setMsg('Enter a valid Indian mobile number.'); return; }
      try {
        $('publicLoginSend').disabled = true;
        await post('/public/otp/send', { mobile });
        $('publicLoginOtpWrap').style.display = 'block';
        setMsg('OTP sent. Check your SMS.', true);
        $('publicLoginOtp').focus();
      } catch (e) {
        setMsg(e.message || 'Unable to send OTP.');
      } finally {
        $('publicLoginSend').disabled = false;
      }
    };

    const verify = async () => {
      const otp = $('publicLoginOtp').value.trim();
      if (!/^\d{6}$/.test(otp)) { setMsg('Enter the 6-digit OTP.'); return; }
      try {
        $('publicLoginVerify').disabled = true;
        const verified = await post('/public/otp/verify', { mobile, otp });
        if (!verified.access_token) throw new Error('Authentication session was not returned.');
        const session = await post('/public/session', { access_token: verified.access_token });
        if (!session.ok) throw new Error(session.error || 'Unable to create PRINTUP session.');
        setMsg('Login successful. Opening PRINTUP…', true);
        location.href = '/';
      } catch (e) {
        setMsg(e.message || 'OTP login failed.');
      } finally {
        $('publicLoginVerify').disabled = false;
      }
    };

    $('publicLoginSend').onclick = send;
    $('publicLoginVerify').onclick = verify;
    $('publicLoginResend').onclick = send;
    $('publicLoginMobile').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    $('publicLoginOtp').addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
  }

  function showSetupCard() {
    if ($('passkeySetupCard')) return;
    const card = document.createElement('div');
    card.id = 'passkeySetupCard';
    card.style.cssText = 'position:fixed;left:16px;right:16px;bottom:90px;z-index:9999;background:#fff;border:1px solid #dbe5f2;border-radius:20px;padding:18px;box-shadow:0 18px 50px #102a5630;font-family:Inter,system-ui,sans-serif';
    card.innerHTML = '<strong style="font-size:17px;color:#102a56">Enable Face ID 🔐</strong><div style="margin:7px 0 13px;color:#667085;font-size:13px">Use Face ID on this iPhone for faster secure PRINTUP login.</div><button id="homeFaceSetup" style="border:0;border-radius:13px;background:#1468e8;color:#fff;padding:12px 16px;font-weight:800;width:100%">Set Up Face ID</button><button id="closeFaceSetup" style="border:0;background:transparent;color:#718096;padding:10px;width:100%;font-weight:700">Later</button>';
    document.body.appendChild(card);
    $('homeFaceSetup').onclick = setupFaceID;
    $('closeFaceSetup').onclick = () => card.remove();
  }

  async function setupFaceID() {
    if (!supported()) return msg('Face ID requires Safari/HTTPS on this iPhone.');
    try {
      msg('Face ID prompt opening…', true);
      const r = await fetch('/passkey/register/options', { method: 'POST' });
      const opts = await r.json();
      if (!r.ok) throw new Error(opts.error || 'Could not start Face ID setup');
      opts.challenge = b64ToBuf(opts.challenge);
      if (opts.user && opts.user.id) opts.user.id = b64ToBuf(opts.user.id);
      if (opts.excludeCredentials) opts.excludeCredentials = opts.excludeCredentials.map(c => ({...c, id: b64ToBuf(c.id)}));
      const cred = await navigator.credentials.create({ publicKey: opts });
      const vr = await fetch('/passkey/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(registrationJSON(cred)) });
      const result = await vr.json();
      if (!vr.ok || !result.ok) throw new Error(result.error || 'Face ID setup failed');
      msg('Face ID enabled successfully.', true);
      const modal = $('passkeySetupCard'); if (modal) modal.remove();
    } catch (e) {
      if (e && e.name === 'NotAllowedError') msg('Face ID was cancelled or not allowed.');
      else msg(e.message || 'Face ID setup failed.');
    }
  }

  async function loginFaceID() {
    if (!supported()) return msg('Face ID requires Safari/HTTPS on this iPhone.');
    try {
      msg('Waiting for Face ID…', true);
      const r = await fetch('/passkey/login/options', { method: 'POST' });
      const opts = await r.json();
      if (!r.ok) throw new Error(opts.error || 'Face ID is not set up');
      opts.challenge = b64ToBuf(opts.challenge);
      if (opts.allowCredentials) opts.allowCredentials = opts.allowCredentials.map(c => ({...c, id: b64ToBuf(c.id)}));
      const cred = await navigator.credentials.get({ publicKey: opts });
      const vr = await fetch('/passkey/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(authenticationJSON(cred)) });
      const result = await vr.json();
      if (!vr.ok || !result.ok) throw new Error(result.error || 'Face ID login failed');
      window.location.href = '/';
    } catch (e) {
      if (e && e.name === 'NotAllowedError') msg('Face ID was cancelled or timed out.');
      else msg(e.message || 'Face ID login failed.');
    }
  }

  async function init() {
    applyBrandLogo();
    applyLoginBrand();
    installPublicOtpLogin();
    const loginBtn = $('faceLoginBtn');
    const setupBtn = $('faceSetupBtn');
    if (loginBtn || setupBtn) {
      if (!supported()) return;
      try {
        const r = await fetch('/passkey/status');
        const s = await r.json();
        if (loginBtn && s.registered) loginBtn.classList.add('show');
        if (setupBtn && !s.registered) setupBtn.classList.add('show');
        if (loginBtn) loginBtn.onclick = loginFaceID;
        if (setupBtn) setupBtn.onclick = setupFaceID;
      } catch (_) {}
      return;
    }
    if (!supported()) return;
    try {
      const r = await fetch('/passkey/status');
      const s = await r.json();
      if (!s.registered) {
        if (new URLSearchParams(location.search).get('passkey_setup') === '1') setTimeout(showSetupCard, 500);
        else setTimeout(showSetupCard, 1200);
      }
    } catch (_) {}
  }
  document.addEventListener('DOMContentLoaded', init);
})();
