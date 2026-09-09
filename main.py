from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse, PlainTextResponse
from pathlib import Path
import os, time, hmac, hashlib, base64

app = FastAPI(title="PRINTUP Secure Billing")
APP_FILE = "app.html"
BASE_DIR = Path(__file__).resolve().parent

def _password_ok(password: str) -> bool:
    stored = os.getenv("NRJ_PASSWORD_HASH", "")
    try:
        algo, iterations, salt_b64, digest_b64 = stored.split("$")
        if algo != "pbkdf2_sha256": return False
        iterations = int(iterations)
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        expected = base64.urlsafe_b64decode(digest_b64.encode())
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
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
        raw = base64.urlsafe_b64decode(cookie.encode()).decode()
        username, ts, sig = raw.rsplit(":", 2)
        if username != os.getenv("NRJ_USERNAME", "admin"): return False
        if time.time() - int(ts) > 12 * 3600: return False
        secret = os.getenv("NRJ_SESSION_SECRET", "")
        payload = f"{username}:{ts}"
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, expected)
    except Exception:
        return False

def _with_ui(html: str) -> str:
    tag = '<link rel="stylesheet" href="/printup-ui.css?v=4">'
    dashboard = '<script src="/printup-dashboard.js?v=4" defer></script>'
    mobile_fix = '<script src="/printup-mobile-fix.js?v=3" defer></script>'
    bill_branding = '<script src="/printup-bill-branding.js?v=1" defer></script>'
    if "printup-ui.css" not in html and "</head>" in html:
        html = html.replace("</head>", tag + "\n" + dashboard + "\n" + mobile_fix + "\n" + bill_branding + "\n</head>", 1)
    else:
        if "printup-dashboard.js" not in html and "</head>" in html:
            html = html.replace("</head>", dashboard + "\n</head>", 1)
        if "printup-mobile-fix.js" not in html and "</head>" in html:
            html = html.replace("</head>", mobile_fix + "\n</head>", 1)
        if "printup-bill-branding.js" not in html and "</head>" in html:
            html = html.replace("</head>", bill_branding + "\n</head>", 1)
    return html

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    if not _auth(request): return RedirectResponse("/login", status_code=303)
    return HTMLResponse(_with_ui((BASE_DIR / APP_FILE).read_text(encoding="utf-8")))

@app.get("/login", response_class=HTMLResponse)
async def login_page():
    return HTMLResponse("""<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><title>PRINTUP Login</title><style>body{margin:0;font-family:Inter,Arial,sans-serif;background:#f4f5f7;display:grid;place-items:center;min-height:100vh}.box{width:min(380px,calc(100% - 32px));background:#fff;padding:28px;border-radius:20px;box-shadow:0 16px 50px #0001}h1{margin:0 0 6px;color:#17191c}p{color:#666;margin-top:0}label{display:block;margin:16px 0 7px;font-weight:700}input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #ddd;border-radius:10px}button{width:100%;margin-top:20px;padding:14px;border:0;border-radius:10px;background:#17191c;color:#fff;font-weight:800}</style></head><body><form class='box' method='post'><h1>PRINTUP</h1><p>Secure Billing & Business Management</p><label>Username</label><input name='username' autocomplete='username' required><label>Password</label><input type='password' name='password' autocomplete='current-password' required><button>Login</button></form></body></html>""")

@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    if username == os.getenv("NRJ_USERNAME", "admin") and _password_ok(password):
        response = RedirectResponse("/", status_code=303)
        response.set_cookie("printup_session", _token(username), max_age=43200, httponly=True, secure=True, samesite="lax", path="/")
        return response
    return HTMLResponse("<h3>Invalid login</h3><p><a href='/login'>Try again</a></p>", status_code=401)

@app.get("/logout")
async def logout():
    response = RedirectResponse("/login", status_code=303)
    response.delete_cookie("printup_session", path="/")
    return response

@app.get("/health", response_class=PlainTextResponse)
async def health(): return "ok"

@app.get("/printup-ui.css")
async def ui_css():
    return HTMLResponse((BASE_DIR / "printup-ui.css").read_text(encoding="utf-8"), media_type="text/css")

@app.get("/printup-dashboard.js")
async def dashboard_js():
    return HTMLResponse((BASE_DIR / "printup-dashboard.js").read_text(encoding="utf-8"), media_type="application/javascript")

@app.get("/printup-mobile-fix.js")
async def mobile_fix_js():
    return HTMLResponse((BASE_DIR / "printup-mobile-fix.js").read_text(encoding="utf-8"), media_type="application/javascript")

@app.get("/printup-bill-branding.js")
async def bill_branding_js():
    return HTMLResponse((BASE_DIR / "printup-bill-branding.js").read_text(encoding="utf-8"), media_type="application/javascript")

@app.get("/services", response_class=HTMLResponse)
async def services(request: Request):
    if not _auth(request): return RedirectResponse("/login", status_code=303)
    p = BASE_DIR / "services.html"
    if not p.exists(): return HTMLResponse("<h2>Services</h2><p>Services page is not installed yet.</p>")
    return HTMLResponse(_with_ui(p.read_text(encoding="utf-8")))
