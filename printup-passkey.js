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
    id: cred.id,
    rawId: bufToB64(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment || 'platform',
    response: {
      clientDataJSON: bufToB64(cred.response.clientDataJSON),
      attestationObject: bufToB64(cred.response.attestationObject),
      transports: cred.response.getTransports ? cred.response.getTransports() : ['internal']
    },
    clientExtensionResults: cred.getClientExtensionResults ? cred.getClientExtensionResults() : {}
  });
  const authenticationJSON = (cred) => ({
    id: cred.id,
    rawId: bufToB64(cred.rawId),
    type: cred.type,
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

  function applyBrandLogo() {
    const logoUrl = 'https://raw.githubusercontent.com/ndangi762-droid/-nrj-graphics-app/main/nrj_graphics_icon.svg';
    document.querySelectorAll('.pu-brand-mark').forEach(el => {
      el.style.backgroundImage = `url("${logoUrl}")`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.fontSize = '0';
      el.textContent = '';
    });
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
