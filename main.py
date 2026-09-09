from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse, PlainTextResponse, JSONResponse
from pathlib import Path
import os, time, hmac, hashlib, base64, json

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


def _auth(request: Request) -> bool:
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
    return HTMLResponse("""<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><title>PRINTUP Login</title><style>body{margin:0;font-family:Inter,Arial,sans-serif;background:linear-gradient(135deg,#f8fafc,#eef1f5);display:grid;place-items:center;min-height:100vh}.box{width:min(380px,calc(100% - 32px));background:#fff;padding:28px;border-radius:22px;box-shadow:0 16px 50px #0001}h1{margin:0 0 6px}p{color:#667085;margin-top:0}label{display:block;margin:16px 0 7px;font-weight:700}input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #ddd;border-radius:12px}button{width:100%;margin-top:20px;padding:14px;border:0;border-radius:12px;background:#111827;color:#fff;font-weight:800}.face-btn{display:none;background:linear-gradient(135deg,#176be9,#0b4da9)}.face-btn.show{display:block}.passkey-note{font-size:12px;text-align:center;margin:10px 0;color:#667085}</style></head><body><div class='box'><h1>PRINTUP</h1><p>Secure Billing & Business Management</p><form method='post' action='/login'><label>Username</label><input name='username' autocomplete='username' required><label>Password</label><input type='password' name='password' autocomplete='current-password' required><button>Login</button></form><div class='passkey-note'>Use Face ID on this iPhone for faster secure login.</div><button id='faceLoginBtn' class='face-btn' type='button'> Login with Face ID</button><button id='faceSetupBtn' class='face-btn' type='button' style='background:#0f172a'>Set Up Face ID</button><p id='faceMsg' style='font-size:12px;text-align:center'></p></div><script src='/printup-passkey.js?v=1' defer></script></body></html>""")


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
    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name="PRINTUP by NRJ Graphics",
        user_id=hashlib.sha256(("PRINTUP:" + username).encode()).digest(),
        user_name=username,
        user_display_name="NRJ Graphics",
        exclude_credentials=exclude,
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.PLATFORM,
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
    )
    response = JSONResponse(json.loads(options_to_json(options)))
    response.set_cookie("printup_passkey_reg_challenge", _signed_blob({"challenge": bytes_to_base64url(options.challenge), "exp": int(time.time()) + 300}), max_age=300, httponly=True, secure=True, samesite="lax", path="/")
    return response


@app.post("/passkey/register")
async def passkey_register(request: Request):
    if not _auth(request): return JSONResponse({"ok": False, "error": "Login required"}, status_code=401)
    challenge_data = _read_signed_blob(request.cookies.get("printup_passkey_reg_challenge"))
    if not challenge_data or int(challenge_data.get("exp", 0)) < int(time.time()):
        return JSONResponse({"ok": False, "error": "Registration challenge expired"}, status_code=400)
    credential = await request.json()
    try:
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge_data["challenge"]),
            expected_rp_id=RP_ID,
            expected_origin=RP_ORIGIN,
            require_user_verification=True,
        )
        stored = {
            "id": bytes_to_base64url(verification.credential_id),
            "public_key": bytes_to_base64url(verification.credential_public_key),
            "sign_count": int(verification.sign_count),
        }
        response = JSONResponse({"ok": True, "message": "Face ID enabled"})
        response.set_cookie("printup_passkey", _signed_blob(stored), max_age=31536000, httponly=True, secure=True, samesite="lax", path="/")
        response.delete_cookie("printup_passkey_reg_challenge", path="/")
        return response
    except Exception as exc:
        return JSONResponse({"ok": False, "error": "Face ID registration failed"}, status_code=400)


@app.get("/passkey/status")
async def passkey_status(request: Request):
    data = _read_signed_blob(request.cookies.get("printup_passkey"))
    return {"supported": True, "registered": bool(data and data.get("id"))}


@app.post("/passkey/login/options")
async def passkey_login_options(request: Request):
    data = _read_signed_blob(request.cookies.get("printup_passkey"))
    if not data or not data.get("id"):
        return JSONResponse({"ok": False, "error": "Face ID is not set up on this device"}, status_code=404)
    options = generate_authentication_options(
        rp_id=RP_ID,
        timeout=60000,
        allow_credentials=[PublicKeyCredentialDescriptor(id=base64url_to_bytes(data["id"]))],
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    response = JSONResponse(json.loads(options_to_json(options)))
    response.set_cookie("printup_passkey_auth_challenge", _signed_blob({"challenge": bytes_to_base64url(options.challenge), "exp": int(time.time()) + 120}), max_age=120, httponly=True, secure=True, samesite="lax", path="/")
    return response


@app.post("/passkey/login")
async def passkey_login(request: Request):
    stored = _read_signed_blob(request.cookies.get("printup_passkey"))
    challenge_data = _read_signed_blob(request.cookies.get("printup_passkey_auth_challenge"))
    if not stored or not challenge_data or int(challenge_data.get("exp", 0)) < int(time.time()):
        return JSONResponse({"ok": False, "error": "Face ID session expired. Try again."}, status_code=400)
    credential = await request.json()
    if credential.get("id") != stored.get("id"):
        return JSONResponse({"ok": False, "error": "Unknown Face ID credential"}, status_code=401)
    try:
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge_data["challenge"]),
            expected_rp_id=RP_ID,
            expected_origin=RP_ORIGIN,
            credential_public_key=base64url_to_bytes(stored["public_key"]),
            credential_current_sign_count=int(stored.get("sign_count", 0)),
            require_user_verification=True,
        )
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
