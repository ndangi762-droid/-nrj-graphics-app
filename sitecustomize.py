"""PRINTUP process bootstrap.

Loaded automatically by Python before Uvicorn imports main.py. Supplies reliable
production asset routes and keeps the premium public login UI available.
"""
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=SyntaxWarning)

try:
    from fastapi.responses import FileResponse, Response, HTMLResponse
    from fastapi import FastAPI

    _original_init = FastAPI.__init__

    def _printup_init(self, *args, **kwargs):
        _original_init(self, *args, **kwargs)
        base = Path(__file__).resolve().parent

        def _file(path, media):
            target = base / path
            if not target.is_file():
                return Response(status_code=404)
            return FileResponse(target, media_type=media)

        # Use one known-good icon asset for all legacy icon URLs. This avoids
        # depending on the missing legacy NRJ SVG/PNG files.
        assets = {
            "/manifest.json": ("manifest.json", "application/manifest+json"),
            "/service-worker.js": ("service-worker.js", "application/javascript"),
            "/favicon.svg": ("printup-icon.svg", "image/svg+xml"),
            "/favicon.ico": ("printup-icon.svg", "image/svg+xml"),
            "/nrj_graphics_icon.svg": ("printup-icon.svg", "image/svg+xml"),
            "/printup_icon_64.png": ("printup-icon.svg", "image/svg+xml"),
            "/printup-icon.svg": ("printup-icon.svg", "image/svg+xml"),
        }
        for route, (filename, media) in assets.items():
            async def asset_endpoint(_filename=filename, _media=media):
                return _file(_filename, _media)
            self.add_api_route(route, asset_endpoint, methods=["GET"], include_in_schema=False)

        async def premium_login():
            return HTMLResponse(r'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#1468e8"><link rel="manifest" href="/manifest.json"><title>PRINTUP Login</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#101b3a}body{min-height:100vh;display:grid;place-items:center;background:#05070c;padding:0}.login-shell{position:relative;width:min(390px,100vw);min-height:844px;overflow:hidden;background:linear-gradient(180deg,#f5f8ff 0%,#edf4ff 100%);border-radius:0 0 34px 34px;box-shadow:0 28px 80px rgba(16,42,86,.25)}.login-shell:before{content:"";position:absolute;z-index:0;left:-100px;top:-55px;width:630px;height:460px;border-radius:48% 52% 54% 46%;background:linear-gradient(145deg,#d9e7ff 0%,#c8dcfb 58%,#eaf2ff 100%);transform:rotate(7deg)}.login-shell:after{content:"";position:absolute;z-index:0;left:-165px;bottom:-55px;width:730px;height:365px;border-radius:50%;background:linear-gradient(160deg,rgba(201,220,250,.8),rgba(222,235,255,.25));transform:rotate(-7deg)}.wave{position:absolute;z-index:0;right:-145px;top:335px;width:535px;height:535px;border:2px solid rgba(82,151,245,.14);border-radius:50%}.wave.w2{right:-110px;top:345px;width:465px;height:465px}.wave.w3{right:-75px;top:355px;width:395px;height:395px}.top-accent{position:absolute;z-index:3;top:0;left:0;right:0;height:7px;background:#1468e8}.content{position:relative;z-index:2;padding:55px 40px 22px;min-height:844px;display:flex;flex-direction:column}.logo{display:block;width:90px;height:90px;border-radius:24px;object-fit:cover;margin:0 auto 12px;box-shadow:0 14px 32px rgba(20,104,232,.2)}h1{font-size:30px;line-height:1.2;letter-spacing:.2px;text-align:center;margin:0;font-weight:800;color:#101b3a}.tagline{text-align:center;font-size:13px;color:#71809a;margin:4px 0 0}.welcome{margin-top:38px}.welcome h2{font-size:26px;line-height:1.3;margin:0 0 2px;font-weight:800;color:#101b3a}.welcome p{font-size:14px;color:#71809a;margin:0}.field-label{font-size:12px;font-weight:700;margin:23px 0 7px;color:#101b3a}.mobile-field{height:54px;background:rgba(255,255,255,.96);border-radius:15px;display:flex;align-items:center;padding:0 17px}.country{font-size:15px;font-weight:700;padding-right:13px}.divider{height:28px;width:1px;background:#d9e1ed}.mobile-field input{border:0;outline:0;background:transparent;flex:1;min-width:0;margin-left:14px;font:400 15px Inter,system-ui;color:#71809a;letter-spacing:.35px}.primary{height:54px;border:0;border-radius:15px;background:#1468e8;color:#fff;font:700 16px Inter,system-ui;cursor:pointer;margin-top:19px;box-shadow:0 10px 22px rgba(20,104,232,.18);position:relative}.primary .arrow{position:absolute;right:12px;top:10px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.17);display:grid;place-items:center;font-size:20px}.or{display:flex;align-items:center;gap:12px;margin:22px 0 18px;color:#71809a;font-size:12px;justify-content:center}.or i{display:block;height:1px;width:75px;background:rgba(113,128,154,.35)}.passkey{height:56px;width:100%;border:0;border-radius:15px;background:rgba(255,255,255,.96);display:flex;align-items:center;padding:0 17px;color:#101b3a;font:600 14px Inter,system-ui;cursor:pointer;text-align:left}.passkey-icon{font-size:21px;color:#1468e8;margin-right:14px}.passkey .chev{margin-left:auto;color:#1468e8;font-size:22px}.benefits{display:flex;justify-content:space-between;margin-top:20px;color:#71809a;font-size:10px}.benefit{display:flex;align-items:center;gap:6px;max-width:92px}.benefit b{color:#1468e8;font-size:16px}.signup{margin-top:19px;min-height:86px;border-radius:18px;background:rgba(231,240,253,.88);display:flex;align-items:center;padding:15px 16px}.signup-copy{flex:1}.signup-copy small{display:block;color:#71809a;font-size:11px;font-weight:600;margin-bottom:5px}.signup-copy strong{display:block;font-size:15px;line-height:1.25;color:#101b3a}.signup button{height:45px;padding:0 14px;border:0;border-radius:14px;background:#fff;color:#1468e8;font:600 11px Inter;cursor:pointer}.footer{text-align:center;margin-top:auto;color:#71809a;font-size:10px}.motto{font-size:8px;letter-spacing:3px;margin-top:12px;color:#71809a}#publicOtpLogin{display:none}.face-hidden{position:absolute;left:-9999px;top:-9999px}.msg{min-height:18px;text-align:center;font-size:11px;color:#667085;margin-top:7px}.otp-panel{display:none}.otp-panel input{width:100%;height:54px;margin-top:10px;border:0;border-radius:15px;text-align:center;font:800 22px Inter;letter-spacing:8px;background:#fff;color:#102a56}.otp-panel button{width:100%;height:48px;border:0;border-radius:14px;margin-top:8px;background:#0f172a;color:#fff;font:700 14px Inter}.otp-panel button:last-child{background:transparent;color:#1468e8}@media(max-width:390px){.login-shell{border-radius:0}.content{padding-left:24px;padding-right:24px}.benefits{gap:5px}}
</style></head><body><div class="login-shell"><div class="top-accent"></div><div class="wave"></div><div class="wave w2"></div><div class="wave w3"></div><div class="content"><img id="printupLoginIcon" class="logo" src="/printup-icon.svg" alt="PRINTUP by NRJ Production"><h1>PRINTUP</h1><p class="tagline">Your print business, simplified.</p><div class="welcome"><h2>Welcome back, Boss</h2><p>Login with your mobile number</p></div><label class="field-label" for="publicLoginMobile">Mobile Number</label><div class="mobile-field"><span class="country">+91</span><span class="divider"></span><input id="publicLoginMobile" inputmode="tel" autocomplete="tel" placeholder="98765 43210" maxlength="12"></div><button class="primary" id="publicLoginSend" type="button">Send OTP<span class="arrow">→</span></button><div class="otp-panel" id="publicLoginOtpWrap"><input id="publicLoginOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit OTP"><button id="publicLoginVerify" type="button">Verify &amp; Login</button><button id="publicLoginResend" type="button">Resend OTP</button></div><div class="msg" id="publicLoginMsg"></div><div class="or"><i></i><span>or continue with</span><i></i></div><button class="passkey" id="faceLoginBtn" type="button"><span class="passkey-icon">◉</span><span>Continue with Face ID / Passkey</span><span class="chev">›</span></button><button class="passkey face-hidden" id="faceSetupBtn" type="button">Set Up Face ID</button><p id="faceMsg" class="msg"></p><div class="benefits"><div class="benefit"><b>◇</b><span>Secure login</span></div><div class="benefit"><b>▣</b><span>No password required</span></div><div class="benefit"><b>ϟ</b><span>Fast &amp; Easy</span></div></div><div class="signup"><div class="signup-copy"><small>New to PRINTUP?</small><strong>Create your shop account</strong></div><button type="button" onclick="location.href='/signup'">Sign up</button></div><div class="footer">© PRINTUP by NRJ Production<div class="motto">PRINTING A BETTER TOMORROW</div></div></div></div><script>
(()=>{const $=id=>document.getElementById(id);const clean=v=>(v||'').replace(/\D/g,'');const normalize=v=>{const x=clean(v);if(x.length===10&&'6789'.includes(x[0]))return '+91'+x;if(x.length===12&&x.startsWith('91')&&'6789'.includes(x[2]))return '+'+x;return null};let mobile='';const msg=(t,g=false)=>{const e=$('publicLoginMsg');if(e){e.textContent=t;e.style.color=g?'#059669':'#667085'}};const post=async(u,d)=>{const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||j.message||'Request failed');return j};$('publicLoginSend').onclick=async()=>{mobile=normalize($('publicLoginMobile').value);if(!mobile){msg('Enter a valid Indian mobile number.');return}try{$('publicLoginSend').disabled=true;await post('/public/otp/send',{mobile});$('publicLoginOtpWrap').style.display='block';msg('OTP sent. Check your SMS.',true);$('publicLoginOtp').focus()}catch(e){msg(e.message||'Unable to send OTP.')}finally{$('publicLoginSend').disabled=false}};$('publicLoginVerify').onclick=async()=>{const otp=$('publicLoginOtp').value.trim();if(!/^\d{6}$/.test(otp)){msg('Enter the 6-digit OTP.');return}try{$('publicLoginVerify').disabled=true;const v=await post('/public/otp/verify',{mobile,otp});if(!v.access_token)throw new Error('Authentication session was not returned.');const s=await post('/public/session',{access_token:v.access_token});if(!s.ok)throw new Error(s.error||'Unable to create PRINTUP session.');msg('Login successful. Opening PRINTUP…',true);location.href='/'}catch(e){msg(e.message||'OTP login failed.')}finally{$('publicLoginVerify').disabled=false}};$('publicLoginResend').onclick=()=>$('publicLoginSend').click();$('publicLoginMobile').addEventListener('keydown',e=>{if(e.key==='Enter')$('publicLoginSend').click()});$('publicLoginOtp').addEventListener('keydown',e=>{if(e.key==='Enter')$('publicLoginVerify').click()})})()
</script><script src="/printup-passkey.js?v=1" defer></script></body></html>''')
        self.add_api_route("/login", premium_login, methods=["GET"], include_in_schema=False)

    FastAPI.__init__ = _printup_init
except Exception:
    pass
