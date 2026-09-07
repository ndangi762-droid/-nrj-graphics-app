import os
import time
import hmac
import hashlib
import base64
import secrets
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse

APP_DIR = Path(__file__).resolve().parent
APP_FILE = APP_DIR / "app.html"

USERNAME = os.getenv("NRJ_USERNAME", "realnrj")
PASSWORD_HASH = os.getenv("NRJ_PASSWORD_HASH", "")
SESSION_SECRET = os.getenv("NRJ_SESSION_SECRET", "")
SESSION_TTL = 60 * 60 * 12  # 12 hours

app = FastAPI(title="NRJ Graphics Secure Billing")


def b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def password_hash(password: str, salt: bytes, rounds: int = 310_000) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, rounds)


def verify_password(password: str) -> bool:
    if not PASSWORD_HASH:
        return False
    try:
        salt_b64, digest_b64 = PASSWORD_HASH.split("$", 1)
        salt = b64d(salt_b64)
        expected = b64d(digest_b64)
        actual = password_hash(password, salt)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def make_session() -> str:
    issued = str(int(time.time())).encode()
    nonce = secrets.token_urlsafe(24).encode()
    payload = issued + b"." + nonce
    sig = hmac.new(SESSION_SECRET.encode(), payload, hashlib.sha256).digest()
    return b64e(payload) + "." + b64e(sig)


def valid_session(token: str | None) -> bool:
    if not token or not SESSION_SECRET:
        return False
    try:
        payload_b64, sig_b64 = token.split(".", 1)
        payload = b64d(payload_b64)
        supplied_sig = b64d(sig_b64)
        expected_sig = hmac.new(SESSION_SECRET.encode(), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(supplied_sig, expected_sig):
            return False
        issued = int(payload.split(b".", 1)[0])
        return 0 <= time.time() - issued <= SESSION_TTL
    except Exception:
        return False


def login_page(error: str = "") -> str:
    error_html = f'<div class="error">{error}</div>' if error else '<div class="error blank"></div>'
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NRJ Graphics — Secure Login</title>
<style>
*{{box-sizing:border-box}}html,body{{margin:0;min-height:100%;font-family:Segoe UI,Arial,sans-serif;color:#efffff}}body{{min-height:100vh;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 72% 20%,rgba(53,208,181,.18),transparent 28%),radial-gradient(circle at 18% 78%,rgba(27,116,150,.18),transparent 32%),linear-gradient(145deg,#061226,#081b33 52%,#041020)}}.card{{width:min(420px,90vw);padding:34px;border:1px solid rgba(53,208,181,.24);border-radius:26px;background:linear-gradient(145deg,rgba(13,42,67,.95),rgba(5,24,43,.95));backdrop-filter:blur(22px);box-shadow:0 30px 90px rgba(0,0,0,.48),0 0 45px rgba(53,208,181,.07);animation:enter .7s ease both}}.brand-mark{{width:68px;height:68px;margin:0 auto 14px;border-radius:20px;display:grid;place-items:center;font-weight:900;color:#03151f;background:linear-gradient(145deg,#35d0b5,#168c80);box-shadow:0 0 32px rgba(53,208,181,.28);animation:pulse 3s ease-in-out infinite}}.brand{{text-align:center;font-weight:900;letter-spacing:2.5px;font-size:21px}}h1{{text-align:center;margin:8px 0 6px;font-size:27px}}p{{text-align:center;color:#8daab8;font-size:13px;margin:0 0 25px}}label{{display:block;font-size:11px;font-weight:700;letter-spacing:.8px;color:#91b3bf;margin:14px 0 7px;text-transform:uppercase}}input{{width:100%;padding:14px 15px;border-radius:12px;border:1px solid rgba(126,190,204,.20);background:rgba(2,14,28,.76);color:#fff;outline:none;font-size:15px;transition:.22s}}input:focus{{border-color:#35d0b5;box-shadow:0 0 0 3px rgba(53,208,181,.10)}}button{{width:100%;margin-top:21px;padding:14px;border:0;border-radius:12px;background:linear-gradient(135deg,#35d0b5,#168c80);color:#04121f;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 12px 30px rgba(43,197,173,.18);transition:.2s}}button:hover{{transform:translateY(-2px);filter:brightness(1.06)}}.error{{min-height:18px;text-align:center;color:#ff7d89;font-size:13px;margin-top:12px}}.blank{{visibility:hidden}}small{{display:block;text-align:center;color:#5f7c89;margin-top:18px}}.status{{display:flex;justify-content:center;gap:7px;align-items:center;color:#7fa4b0;font-size:11px;margin-top:10px}}.dot{{width:7px;height:7px;border-radius:50%;background:#35d0b5;box-shadow:0 0 12px #35d0b5}}@keyframes enter{{from{{opacity:0;transform:translateY(18px) scale(.98)}}to{{opacity:1;transform:none}}}}@keyframes pulse{{50%{{box-shadow:0 0 42px rgba(53,208,181,.40)}}}}
</style></head><body><form class="card" method="post" action="/login"><div class="brand-mark">NRJ</div><div class="brand">NRJ GRAPHICS</div><h1>Secure Login</h1><p>Authorized access to Billing & Production System</p><label>Username</label><input name="username" autocomplete="username" required autofocus><label>Password</label><input name="password" type="password" autocomplete="current-password" required><button type="submit">LOGIN&nbsp;&nbsp;→</button>{error_html}<div class="status"><span class="dot"></span> Secure server connection</div><small>Protected NRJ Graphics Billing System</small></form></body></html>'''


def require_auth(request: Request):
    return valid_session(request.cookies.get("nrj_session"))


@app.get("/", response_class=HTMLResponse)
def root(request: Request):
    if require_auth(request):
        return FileResponse(APP_FILE, media_type="text/html")
    return RedirectResponse("/login", status_code=303)


@app.get("/login", response_class=HTMLResponse)
def login_get():
    return HTMLResponse(login_page())


@app.post("/login", response_class=HTMLResponse)
def login_post(username: str = Form(...), password: str = Form(...)):
    if hmac.compare_digest(username, USERNAME) and verify_password(password):
        response = RedirectResponse("/", status_code=303)
        response.set_cookie(
            "nrj_session", make_session(), max_age=SESSION_TTL, httponly=True,
            secure=(False), samesite="lax", path="/"
        )
        return response
    return HTMLResponse(login_page("Wrong username or password"), status_code=401)


@app.get("/logout")
def logout():
    response = RedirectResponse("/login", status_code=303)
    response.delete_cookie("nrj_session", path="/")
    return response


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/services")
async def services_page(request: Request):
    if not require_auth(request):
        return RedirectResponse("/login", status_code=303)
    return FileResponse(APP_DIR / "services.html", media_type="text/html")
