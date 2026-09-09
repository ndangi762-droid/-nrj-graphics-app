from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse, PlainTextResponse, JSONResponse
from pathlib import Path
import os, time, hmac, hashlib, base64, json, re

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
    base64url_to_bytes,
)
from webauthn.helpers import bytes_to_base64url
from webauthn.helpers.structs import (
    AuthenticatorAttachment,
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)
from public_auth import send_otp, verify_otp, get_user, provision_shop

app = FastAPI(title="PRINTUP Secure Billing")
APP_FILE = "app.html"
BASE_DIR = Path(__file__).resolve().parent
RP_ID = os.getenv("PRINTUP_RP_ID", "nrj-graphics-app-1.onrender.com")
RP_ORIGIN = os.getenv("PRINTUP_ORIGIN", "https://nrj-graphics-app-1.onrender.com")


def _password_ok(password: str) -> bool:
    stored = os.getenv("NRJ_PASSWORD_HASH", "")
    try:
        algo, iterations, salt_b64, digest_b64 = stored.split("$")
        if algo != "pbkdf2_sha256": return False
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        expected = base64.urlsafe_b64decode(digest_b64.encode())
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def _token(username: str) -> str:
    secret = os.getenv("NRJ_SESSION_SECRET", "")
    payload = f"{username}:{int(time.time())}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode()


def _public_token(user_id: str, shop_id: str, mobile: str = "") -> str:
    return _signed_blob({"kind": "public", "user_id": user_id, "shop_id": shop_id, "mobile": mobile, "exp": int(time.time()) + 43200})


def _public_auth(request: Request) -> bool:
    data = _read_signed_blob(request.cookies.get("printup_public_session"))
    return bool(data and data.get("kind") == "public" and int(data.get("exp", 0)) > int(time.time()) and data.get("user_id") and data.get("shop_id"))


def _auth(request: Request) -> bool:
    if _public_auth(request): return True
    cookie = request.cookies.get("printup_session")
    if not cookie: return False
    try:
        username, ts, sig = base64.urlsafe_b64decode(cookie.encode()).decode().rsplit(":", 2)
        if username != os.getenv("NRJ_USERNAME", "admin") or time.time() - int(ts) > 43200: return False
        payload = f"{username}:{ts}"
        expected = hmac.new(os.getenv("NRJ_SESSION_SECRET", "").encode(), payload.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, expected)
    except Exception:
        return False


def _signed_blob(payload: dict) -> str:
    raw = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    secret = os.getenv("NRJ_SESSION_SECRET", "")
    sig = hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def _read_signed_blob(value: str | None) -> dict | None:
    if not value or "." not in value: return None
    raw, sig = value.rsplit(".", 1)
    secret = os.getenv("NRJ_SESSION_SECRET", "")
    expected = hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected): return None
    try:
        padded = raw + "=" * (-len(raw) % 4)
        return json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
    except Exception:
        return None


def _normalize_mobile(value: str) -> str | None:
    raw = re.sub(r"\D", "", value or "")
    if len(raw) == 10 and raw[0] in "6789": return "+91" + raw
    if len(raw) == 12 and raw.startswith("91") and raw[2] in "6789": return "+" + raw
    return None


def _with_ui(html: str) -> str:
    tags = [
        '<link rel="stylesheet" href="/printup-ui.css?v=8">',
        '<link rel="stylesheet" href="/printup-uxpilot.css?v=2">',
        '<script src="/printup-dashboard.js?v=8" defer></script>',
        '<script src="/printup-mobile-fix.js?v=7" defer></script>',
        '<script src="/printup-bill-branding.js?v=5" defer></script>',
        '<script src="/printup-newbill-ui.js?v=4" defer></script>',
        '<script src="/printup-paytm-ui.js?v=3" defer></script>',
        '<link rel="stylesheet" href="/printup-uxpilot-final.css?v=1">',
        '<script src="/printup-passkey.js?v=1" defer></script>'
    ]
    for tag in tags:
        marker = tag.split('"')[1].split('?')[0]
        if marker not in html:
            html = html.replace("</head>", tag + "\n</head>", 1)
    return html


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    if not _auth(request): return RedirectResponse("/login", status_code=303)
    return HTMLResponse(_with_ui((BASE_DIR / APP_FILE).read_text(encoding="utf-8")))


@app.get("/login", response_class=HTMLResponse)
async def login_page():
    return HTMLResponse("""<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><title>PRINTUP Login</title><style>body{margin:0;font-family:Inter,Arial,sans-serif;background:linear-gradient(135deg,#f8fafc,#eef1f5);display:grid;place-items:center;min-height:100vh}.box{width:min(380px,calc(100% - 32px));background:#fff;padding:28px;border-radius:22px;box-shadow:0 16px 50px #0001}h1{margin:0 0 6px}p{color:#667085;margin-top:0}label{display:block;margin:16px 0 7px;font-weight:700}input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #ddd;border-radius:12px}button{width:100%;margin-top:20px;padding:14px;border:0;border-radius:12px;background:#111827;color:#fff;font-weight:800}.face-btn{display:none;background:linear-gradient(135deg,#176be9,#0b4da9)}.face-btn.show{display:block}.passkey-note{font-size:12px;text-align:center;margin:10px 0;color:#667085}.signup-link{display:block;text-align:center;margin-top:16px;color:#176be9;font-weight:700;text-decoration:none}</style></head><body><div class='box'><h1>PRINTUP</h1><p>Secure Billing & Business Management</p><form method='post' action='/login'><label>Username</label><input name='username' autocomplete='username' required><label>Password</label><input type='password' name='password' autocomplete='current-password' required><button>Login</button></form><a class='signup-link' href='/signup'>Create new PRINTUP account</a><div class='passkey-note'>Use Face ID on this iPhone for faster secure login.</div><button id='faceLoginBtn' class='face-btn' type='button'> Login with Face ID</button><button id='faceSetupBtn' class='face-btn' type='button' style='background:#0f172a'>Set Up Face ID</button><p id='faceMsg' style='font-size:12px;text-align:center'></p></div><script src='/printup-passkey.js?v=1' defer></script></body></html>""")


@app.get("/signup", response_class=HTMLResponse)
async def signup_page():
    return HTMLResponse("""<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><meta name='theme-color' content='#1468e8'><title>PRINTUP — Create Account</title><style>*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,sans-serif;background:linear-gradient(145deg,#f6f9ff,#edf4ff);min-height:100vh;display:grid;place-items:center;color:#0f172a}.box{width:min(460px,calc(100% - 28px));background:#fff;border:1px solid #e5eaf3;border-radius:24px;padding:24px;box-shadow:0 18px 60px #163b6b18}.brand{display:flex;align-items:center;gap:12px;margin-bottom:20px}.brand img{width:48px;height:48px;border-radius:13px;object-fit:cover}.brand h1{margin:0;font-size:22px}.brand p{margin:3px 0 0;color:#64748b;font-size:12px}.step{display:none}.step.active{display:block}h2{font-size:20px;margin:4px 0 7px}small{color:#64748b}.field{margin-top:14px}.field label{display:block;font-size:12px;font-weight:800;margin-bottom:6px;color:#475569}.field input,.field select{width:100%;padding:13px;border:1px solid #d7deea;border-radius:12px;font-size:15px;background:#fff}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.btn{width:100%;padding:14px;border:0;border-radius:13px;background:#1468e8;color:#fff;font-weight:800;margin-top:18px}.btn.alt{background:#eef4ff;color:#1468e8}.msg{min-height:20px;margin-top:12px;font-size:13px;text-align:center;color:#64748b}.otp{letter-spacing:8px;text-align:center;font-size:22px!important;font-weight:800}.back{display:block;text-align:center;margin-top:14px;color:#1468e8;text-decoration:none;font-size:13px;font-weight:700}</style></head><body><div class='box'><div class='brand'><img src='/nrj_graphics_icon.svg?v=2' onerror="this.style.display='none'"><div><h1>PRINTUP</h1><p>Printing Shop Digital Operating System</p></div></div><div id='step1' class='step active'><h2>Create your shop account</h2><small>Start with your verified mobile number.</small><div class='field'><label>Mobile Number</label><input id='mobile' inputmode='tel' autocomplete='tel' placeholder='98765 43210'></div><button class='btn' id='send'>Send OTP</button><div class='msg' id='msg1'></div><a class='back' href='/login'>Already have an account? Login</a></div><div id='step2' class='step'><h2>Verify mobile</h2><small>Enter the 6-digit OTP sent to your mobile.</small><div class='field'><label>OTP</label><input id='otp' class='otp' inputmode='numeric' maxlength='6' autocomplete='one-time-code'></div><button class='btn' id='verify'>Verify & Continue</button><button class='btn alt' id='resend'>Resend OTP</button><div class='msg' id='msg2'></div></div><div id='step3' class='step'><h2>Create your shop</h2><small>Your account is verified. Add basic business details.</small><div class='field'><label>Owner Name</label><input id='owner' autocomplete='name' placeholder='Your name'></div><div class='field'><label>Shop / Business Name</label><input id='shop' autocomplete='organization' placeholder='ABC Digital Printing'></div><div class='row'><div class='field'><label>City</label><input id='city' autocomplete='address-level2'></div><div class='field'><label>State</label><input id='state' value='Rajasthan' autocomplete='address-level1'></div></div><div class='field'><label>Business Type</label><select id='type'><option>Printing</option><option>Flex & Graphics</option><option>Digital Printing</option><option>Advertising</option><option>Graphics & Printing</option><option>Other</option></select></div><button class='btn' id='create'>Create Shop & Enter PRINTUP</button><div class='msg' id='msg3'></div></div></div><script>let mobile='',accessToken='';const $=id=>document.getElementById(id);function show(n){document.querySelectorAll('.step').forEach(x=>x.classList.remove('active'));$('step'+n).classList.add('active')}function clean(v){return (v||'').replace(/\D/g,'')}function phone(v){let x=clean(v);if(x.length===10&&'6789'.includes(x[0]))return '+91'+x;if(x.length===12&&x.startsWith('91')&&'6789'.includes(x[2]))return '+'+x;return null}async function post(url,data){let r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});let j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||j.message||'Request failed');return j}$('send').onclick=async()=>{mobile=phone($('mobile').value);if(!mobile){$('msg1').textContent='Enter a valid Indian mobile number.';return}try{$('send').disabled=true;await post('/public/otp/send',{mobile});$('msg1').textContent='OTP sent. Check your SMS.';show(2)}catch(e){$('msg1').textContent=e.message}finally{$('send').disabled=false}};$('verify').onclick=async()=>{const otp=$('otp').value.trim();if(!/^\d{6}$/.test(otp)){$('msg2').textContent='Enter the 6-digit OTP.';return}try{$('verify').disabled=true;const j=await post('/public/otp/verify',{mobile,otp});accessToken=j.access_token;if(!accessToken)throw new Error('Authentication session was not returned.');show(3)}catch(e){$('msg2').textContent=e.message}finally{$('verify').disabled=false}};$('resend').onclick=()=>$('send').click();$('create').onclick=async()=>{const shop=$('shop').value.trim(),owner=$('owner').value.trim();if(!owner||!shop){$('msg3').textContent='Owner name and shop name are required.';return}try{$('create').disabled=true;const j=await post('/public/signup/complete',{access_token:accessToken,shop_name:shop,owner_name:owner,mobile,city:$('city').value.trim(),state:$('state').value.trim(),business_type:$('type').value});if(j.ok){location.href='/?welcome=1'}else throw new Error(j.error||'Unable to create shop')}catch(e){$('msg3').textContent=e.message}finally{$('create').disabled=false}};</script></body></html>""")


@app.post("/public/otp/send")
async def public_otp_send(request: Request):
    try:
        body = await request.json()
        mobile = _normalize_mobile(body.get("mobile", ""))
        if not mobile: return JSONResponse({"ok": False, "error": "Enter a valid Indian mobile number."}, status_code=400)
        status, data = send_otp(mobile)
        if status >= 400:
            detail = data.get("msg") or data.get("message") or data.get("error_description") or "Unable to send OTP. Please try again later."
            return JSONResponse({"ok": False, "error": detail}, status_code=429 if status == 429 else 400)
        return {"ok": True}
    except RuntimeError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=503)
    except Exception:
        return JSONResponse({"ok": False, "error": "Unable to send OTP."}, status_code=500)


@app.post("/public/otp/verify")
async def public_otp_verify(request: Request):
    try:
        body = await request.json()
        mobile = _normalize_mobile(body.get("mobile", ""))
        otp = str(body.get("otp", "")).strip()
        if not mobile or not re.fullmatch(r"\d{6}", otp): return JSONResponse({"ok": False, "error": "Invalid mobile or OTP."}, status_code=400)
        status, data = verify_otp(mobile, otp)
        if status >= 400:
            detail = data.get("msg") or data.get("message") or data.get("error_description") or "Invalid or expired OTP."
            return JSONResponse({"ok": False, "error": detail}, status_code=429 if status == 429 else 401)
        session = data.get("session") or {}
        access_token = session.get("access_token") or data.get("access_token")
        if not access_token: return JSONResponse({"ok": False, "error": "OTP verified but no session was returned."}, status_code=502)
        return {"ok": True, "access_token": access_token}
    except RuntimeError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=503)
    except Exception:
        return JSONResponse({"ok": False, "error": "OTP verification failed."}, status_code=500)


@app.post("/public/signup/complete")
async def public_signup_complete(request: Request):
    try:
        body = await request.json()
        access_token = body.get("access_token", "")
        if not access_token: return JSONResponse({"ok": False, "error": "Verified session is required."}, status_code=401)
        user_status, user = get_user(access_token)
        if user_status >= 400 or not user.get("id"): return JSONResponse({"ok": False, "error": "Verified session is invalid or expired."}, status_code=401)
        payload = {
            "p_shop_name": str(body.get("shop_name", "")).strip(),
            "p_owner_name": str(body.get("owner_name", "")).strip(),
            "p_mobile": _normalize_mobile(body.get("mobile", "")) or str(user.get("phone", "")),
            "p_email": str(body.get("email", "")).strip(),
            "p_address": str(body.get("address", "")).strip(),
            "p_city": str(body.get("city", "")).strip(),
            "p_state": str(body.get("state", "")).strip(),
            "p_pin_code": str(body.get("pin_code", "")).strip(),
            "p_business_type": str(body.get("business_type", "")).strip(),
        }
        if not payload["p_shop_name"] or not payload["p_owner_name"]: return JSONResponse({"ok": False, "error": "Owner name and shop name are required."}, status_code=400)
        shop_status, shop = provision_shop(access_token, payload)
        if shop_status >= 400: return JSONResponse({"ok": False, "error": shop.get("message") or shop.get("hint") or "Unable to create shop."}, status_code=400)
        if isinstance(shop, list): shop = shop[0] if shop else {}
        shop_id, shop_code = shop.get("shop_id"), shop.get("shop_code")
        if not shop_id: return JSONResponse({"ok": False, "error": "Shop was not created."}, status_code=500)
        response = JSONResponse({"ok": True, "shop_code": shop_code})
        response.set_cookie("printup_public_session", _public_token(user["id"], shop_id, payload["p_mobile"]), max_age=43200, httponly=True, secure=True, samesite="lax", path="/")
        return response
    except RuntimeError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=503)
    except Exception:
        return JSONResponse({"ok": False, "error": "Unable to complete account setup."}, status_code=500)


@app.post("/public/session")
async def public_session(request: Request):
    try:
        body = await request.json()
        access_token = body.get("access_token", "")
        if not access_token: return JSONResponse({"ok": False, "error": "Session token is required."}, status_code=401)
        user_status, user = get_user(access_token)
        if user_status >= 400 or not user.get("id"): return JSONResponse({"ok": False, "error": "Invalid session."}, status_code=401)
        from public_auth import _request
        status, shop = _request('/rest/v1/rpc/get_current_user_shop', access_token=access_token)
        if status >= 400 or not shop or not shop.get("shop_id"): return JSONResponse({"ok": False, "error": "No PRINTUP shop is linked to this account."}, status_code=403)
        response = JSONResponse({"ok": True, "shop": shop})
        response.set_cookie("printup_public_session", _public_token(user["id"], shop["shop_id"], user.get("phone", "")), max_age=43200, httponly=True, secure=True, samesite="lax", path="/")
        return response
    except Exception:
        return JSONResponse({"ok": False, "error": "Unable to create PRINTUP session."}, status_code=500)


@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    if username == os.getenv("NRJ_USERNAME", "admin") and _password_ok(password):
        response = RedirectResponse("/?passkey_setup=1", status_code=303)
        response.set_cookie("printup_session", _token(username), max_age=43200, httponly=True, secure=True, samesite="lax", path="/")
        return response
    return HTMLResponse("<h3>Invalid login</h3><p><a href='/login'>Try again</a></p>", status_code=401)


@app.post("/passkey/register/options")
async def passkey_register_options(request: Request):
    if not _auth(request): return JSONResponse({"ok": False, "error": "Login required"}, status_code=401)
    username = os.getenv("NRJ_USERNAME", "admin")
    existing = _read_signed_blob(request.cookies.get("printup_passkey"))
    exclude = []
    if existing and existing.get("id"):
        exclude = [PublicKeyCredentialDescriptor(id=base64url_to_bytes(existing["id"]))]
    options = generate_registration_options(rp_id=RP_ID, rp_name="PRINTUP by NRJ Graphics", user_id=hashlib.sha256(("PRINTUP:" + username).encode()).digest(), user_name=username, user_display_name="NRJ Graphics", exclude_credentials=exclude, authenticator_selection=AuthenticatorSelectionCriteria(authenticator_attachment=AuthenticatorAttachment.PLATFORM, resident_key=ResidentKeyRequirement.REQUIRED, user_verification=UserVerificationRequirement.REQUIRED))
    response = JSONResponse(json.loads(options_to_json(options)))
    response.set_cookie("printup_passkey_reg_challenge", _signed_blob({"challenge": bytes_to_base64url(options.challenge), "exp": int(time.time()) + 300}), max_age=300, httponly=True, secure=True, samesite="lax", path="/")
    return response


@app.post("/passkey/register")
async def passkey_register(request: Request):
    if not _auth(request): return JSONResponse({"ok": False, "error": "Login required"}, status_code=401)
    challenge_data = _read_signed_blob(request.cookies.get("printup_passkey_reg_challenge"))
    if not challenge_data or int(challenge_data.get("exp", 0)) < int(time.time()): return JSONResponse({"ok": False, "error": "Registration challenge expired"}, status_code=400)
    credential = await request.json()
    try:
        verification = verify_registration_response(credential=credential, expected_challenge=base64url_to_bytes(challenge_data["challenge"]), expected_rp_id=RP_ID, expected_origin=RP_ORIGIN, require_user_verification=True)
        stored = {"id": bytes_to_base64url(verification.credential_id), "public_key": bytes_to_base64url(verification.credential_public_key), "sign_count": int(verification.sign_count)}
        response = JSONResponse({"ok": True, "message": "Face ID enabled"})
        response.set_cookie("printup_passkey", _signed_blob(stored), max_age=31536000, httponly=True, secure=True, samesite="lax", path="/")
        response.delete_cookie("printup_passkey_reg_challenge", path="/")
        return response
    except Exception:
        return JSONResponse({"ok": False, "error": "Face ID registration failed"}, status_code=400)


@app.get("/passkey/status")
async def passkey_status(request: Request):
    data = _read_signed_blob(request.cookies.get("printup_passkey"))
    return {"supported": True, "registered": bool(data and data.get("id"))}


@app.post("/passkey/login/options")
async def passkey_login_options(request: Request):
    data = _read_signed_blob(request.cookies.get("printup_passkey"))
    if not data or not data.get("id"): return JSONResponse({"ok": False, "error": "Face ID is not set up on this device"}, status_code=404)
    options = generate_authentication_options(rp_id=RP_ID, timeout=60000, allow_credentials=[PublicKeyCredentialDescriptor(id=base64url_to_bytes(data["id"]))], user_verification=UserVerificationRequirement.REQUIRED)
    response = JSONResponse(json.loads(options_to_json(options)))
    response.set_cookie("printup_passkey_auth_challenge", _signed_blob({"challenge": bytes_to_base64url(options.challenge), "exp": int(time.time()) + 120}), max_age=120, httponly=True, secure=True, samesite="lax", path="/")
    return response


@app.post("/passkey/login")
async def passkey_login(request: Request):
    stored = _read_signed_blob(request.cookies.get("printup_passkey"))
    challenge_data = _read_signed_blob(request.cookies.get("printup_passkey_auth_challenge"))
    if not stored or not challenge_data or int(challenge_data.get("exp", 0)) < int(time.time()): return JSONResponse({"ok": False, "error": "Face ID session expired. Try again."}, status_code=400)
    credential = await request.json()
    if credential.get("id") != stored.get("id"): return JSONResponse({"ok": False, "error": "Unknown Face ID credential"}, status_code=401)
    try:
        verification = verify_authentication_response(credential=credential, expected_challenge=base64url_to_bytes(challenge_data["challenge"]), expected_rp_id=RP_ID, expected_origin=RP_ORIGIN, credential_public_key=base64url_to_bytes(stored["public_key"]), credential_current_sign_count=int(stored.get("sign_count", 0)), require_user_verification=True)
        username = os.getenv("NRJ_USERNAME", "admin")
        response = JSONResponse({"ok": True})
        response.set_cookie("printup_session", _token(username), max_age=43200, httponly=True, secure=True, samesite="lax", path="/")
        stored["sign_count"] = int(verification.new_sign_count)
        response.set_cookie("printup_passkey", _signed_blob(stored), max_age=31536000, httponly=True, secure=True, samesite="lax", path="/")
        response.delete_cookie("printup_passkey_auth_challenge", path="/")
        return response
    except Exception:
        return JSONResponse({"ok": False, "error": "Face ID verification failed"}, status_code=401)


@app.get("/logout")
async def logout():
    response = RedirectResponse("/login", status_code=303)
    response.delete_cookie("printup_session", path="/")
    response.delete_cookie("printup_public_session", path="/")
    return response


@app.get("/health", response_class=PlainTextResponse)
async def health(): return "ok"


@app.get("/printup-ui.css")
async def ui_css(): return HTMLResponse((BASE_DIR / "printup-ui.css").read_text(encoding="utf-8"), media_type="text/css")
@app.get("/printup-uxpilot.css")
async def uxpilot_css(): return HTMLResponse((BASE_DIR / "printup-uxpilot.css").read_text(encoding="utf-8"), media_type="text/css")
@app.get("/printup-uxpilot-final.css")
async def uxpilot_final_css(): return HTMLResponse((BASE_DIR / "printup-uxpilot-final.css").read_text(encoding="utf-8"), media_type="text/css")
@app.get("/printup-dashboard.js")
async def dashboard_js(): return HTMLResponse((BASE_DIR / "printup-dashboard.js").read_text(encoding="utf-8"), media_type="application/javascript")
@app.get("/printup-mobile-fix.js")
async def mobile_fix_js(): return HTMLResponse((BASE_DIR / "printup-mobile-fix.js").read_text(encoding="utf-8"), media_type="application/javascript")
@app.get("/printup-bill-branding.js")
async def bill_branding_js(): return HTMLResponse((BASE_DIR / "printup-bill-branding.js").read_text(encoding="utf-8"), media_type="application/javascript")
@app.get("/printup-newbill-ui.js")
async def newbill_ui_js(): return HTMLResponse((BASE_DIR / "printup-newbill-ui.js").read_text(encoding="utf-8"), media_type="application/javascript")
@app.get("/printup-paytm-ui.js")
async def paytm_ui_js(): return HTMLResponse((BASE_DIR / "printup-paytm-ui.js").read_text(encoding="utf-8"), media_type="application/javascript")
@app.get("/printup-passkey.js")
async def passkey_js(): return HTMLResponse((BASE_DIR / "printup-passkey.js").read_text(encoding="utf-8"), media_type="application/javascript")


@app.get("/services", response_class=HTMLResponse)
async def services(request: Request):
    if not _auth(request): return RedirectResponse("/login", status_code=303)
    p = BASE_DIR / "services.html"
    if not p.exists(): return HTMLResponse("<h2>Services</h2><p>Services page is not installed yet.</p>")
    return HTMLResponse(_with_ui(p.read_text(encoding="utf-8")))
