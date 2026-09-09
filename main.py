from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from pathlib import Path
import os, hmac, hashlib, base64, time

app = FastAPI(title="PRINTUP Secure Billing")
APP_FILE = "app.html"
SESSION_COOKIE = "printup_session"
SESSION_TTL = 12 * 60 * 60


def _password_ok(password: str) -> bool:
    stored = os.getenv("NRJ_PASSWORD_HASH", "")
    if not stored:
        return False
    try:
        algorithm, iterations, salt_b64, hash_b64 = stored.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        expected = base64.b64decode(hash_b64)
        salt = base64.b64decode(salt_b64)
        derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
        return hmac.compare_digest(derived, expected)
    except Exception:
        return False


def _session_token(username: str, expires: int) -> str:
    secret = os.getenv("NRJ_SESSION_SECRET", "")
    payload = f"{username}|{expires}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}|{sig}"


def _authenticated(request: Request) -> bool:
    token = request.cookies.get(SESSION_COOKIE, "")
    secret = os.getenv("NRJ_SESSION_SECRET", "")
    if not token or not secret:
        return False
    try:
        username, expires_s, sig = token.rsplit("|", 2)
        expires = int(expires_s)
        if expires < int(time.time()):
            return False
        expected = hmac.new(secret.encode(), f"{username}|{expires}".encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, expected) and hmac.compare_digest(username, os.getenv("NRJ_USERNAME", ""))
    except Exception:
        return False


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    if not _authenticated(request):
        return RedirectResponse("/login", status_code=303)
    path = Path(APP_FILE)
    if not path.exists():
        return HTMLResponse("PRINTUP app file missing", status_code=500)
    return HTMLResponse(path.read_text(encoding="utf-8"))


@app.get("/login", response_class=HTMLResponse)
async def login_page():
    return HTMLResponse('''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>PRINTUP Login</title><style>body{margin:0;background:#101114;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh}.box{width:min(380px,88vw);padding:28px;border-radius:22px;background:#191b20;box-shadow:0 20px 60px #0008}h1{margin:0 0 8px}p{color:#aaa}input,button{box-sizing:border-box;width:100%;padding:14px;margin-top:10px;border-radius:12px;border:1px solid #333;background:#111318;color:#fff}button{background:#ffd21a;color:#111;font-weight:800;border:0;cursor:pointer}</style></head><body><form class="box" method="post"><h1>PRINTUP</h1><p>Secure business login</p><input name="username" placeholder="Username" autocomplete="username" required><input name="password" type="password" placeholder="Password" autocomplete="current-password" required><button>LOGIN</button></form></body></html>''')


@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    configured_user = os.getenv("NRJ_USERNAME", "")
    if configured_user and hmac.compare_digest(username, configured_user) and _password_ok(password):
        expires = int(time.time()) + SESSION_TTL
        response = RedirectResponse("/", status_code=303)
        response.set_cookie(SESSION_COOKIE, _session_token(username, expires), max_age=SESSION_TTL, httponly=True, secure=True, samesite="lax", path="/")
        return response
    return HTMLResponse("Invalid login. <a href='/login'>Try again</a>", status_code=401)


@app.get("/logout")
async def logout():
    response = RedirectResponse("/login", status_code=303)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return response


@app.get("/health")
async def health():
    return JSONResponse({"status": "ok", "app": "PRINTUP"})


@app.get("/services", response_class=HTMLResponse)
async def services(request: Request):
    if not _authenticated(request):
        return RedirectResponse("/login", status_code=303)
    path = Path("services.html")
    if not path.exists():
        return HTMLResponse("services.html missing", status_code=404)
    return HTMLResponse(path.read_text(encoding="utf-8"))
