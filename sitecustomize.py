"""PRINTUP production asset bootstrap."""
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=SyntaxWarning)

try:
    from fastapi.responses import FileResponse, Response
    from fastapi import FastAPI
    from starlette.middleware.base import BaseHTTPMiddleware

    _original_init = FastAPI.__init__

    def _printup_init(self, *args, **kwargs):
        _original_init(self, *args, **kwargs)
        base = Path(__file__).resolve().parent

        def _file(path, media):
            target = base / path
            if not target.is_file():
                return Response(status_code=404)
            return FileResponse(target, media_type=media, headers={"Cache-Control": "no-store, max-age=0"})

        assets = {
            "/manifest.json": ("manifest.json", "application/manifest+json"),
            "/service-worker.js": ("service-worker.js", "application/javascript"),
            "/favicon.svg": ("printup-icon.svg", "image/svg+xml"),
            "/favicon.ico": ("printup-icon.svg", "image/svg+xml"),
            "/nrj_graphics_icon.svg": ("printup-icon.svg", "image/svg+xml"),
            "/printup_icon_64.png": ("printup-icon.svg", "image/svg+xml"),
            "/printup-icon.svg": ("printup-icon.svg", "image/svg+xml"),
            "/printup-services-catalog.js": ("printup-services-catalog.js", "application/javascript"),
        }
        for route, (filename, media) in assets.items():
            async def asset_endpoint(_filename=filename, _media=media):
                return _file(_filename, _media)
            self.add_api_route(route, asset_endpoint, methods=["GET"], include_in_schema=False)

        class _PrintupHtmlInject(BaseHTTPMiddleware):
            async def dispatch(self, request, call_next):
                response = await call_next(request)
                content_type = response.headers.get("content-type", "")
                if "text/html" not in content_type:
                    return response
                chunks = []
                async for chunk in response.body_iterator:
                    chunks.append(chunk)
                body = b"".join(chunks)
                marker = b"</body>"
                tag = b'''<script src="/printup-services-catalog.js?v=3" defer></script><script>(function(){if(window.__puDrawer)return;window.__puDrawer=1;function boot(){if(document.getElementById("puAccountDrawer"))return;var btn=document.querySelector(".pu-brand-mark");if(!btn)return;btn.setAttribute("aria-label","Open PRINTUP menu");btn.style.cursor="pointer";var st=document.createElement("style");st.textContent=".pu-drawer-overlay{position:fixed;inset:0;background:rgba(12,20,35,.42);opacity:0;pointer-events:none;transition:.28s;z-index:1998;backdrop-filter:blur(2px)}.pu-drawer{position:fixed;top:0;right:0;height:100dvh;width:min(370px,92vw);background:#fff;border-radius:28px 0 0 28px;transform:translateX(105%);transition:transform .32s cubic-bezier(.22,1,.36,1);z-index:1999;box-shadow:-18px 0 50px rgba(15,35,70,.2);overflow:auto}.pu-drawer.open{transform:none}.pu-drawer-overlay.open{opacity:1;pointer-events:auto}.pu-drawer-head{padding:22px 20px 16px;background:linear-gradient(145deg,#0b4da9,#1468e8);color:#fff;border-radius:28px 0 0 28px}.pu-drawer-top{display:flex;align-items:center;gap:12px}.pu-drawer-logo{width:48px;height:48px;border-radius:16px;background:#fff;color:#111;display:grid;place-items:center;font-size:24px;font-weight:1000}.pu-drawer-title{font-size:20px;font-weight:950}.pu-drawer-title small{display:block;font-size:10px;opacity:.78;margin-top:2px}.pu-drawer-close{margin-left:auto;width:38px;height:38px;border:0;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;font-size:20px}.pu-drawer-shop{margin-top:18px;padding:13px 14px;border-radius:17px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2)}.pu-drawer-shop b{display:block;font-size:13px}.pu-drawer-shop span{display:block;margin-top:4px;font-size:10px;opacity:.82}.pu-drawer-body{padding:16px}.pu-drawer-section{margin:0 4px 8px;color:#8491a6;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.6px}.pu-drawer-item{width:100%;display:flex;align-items:center;gap:12px;padding:12px 10px;border:0;background:#fff;border-radius:15px;text-align:left;color:#172b4d;font:inherit;cursor:pointer}.pu-drawer-item:active{background:#f2f6fc}.pu-drawer-icon{width:36px;height:36px;border-radius:12px;background:#edf4ff;color:#1468e8;display:grid;place-items:center;font-weight:900}.pu-drawer-item b{font-size:12px}.pu-drawer-item small{display:block;color:#8a96a8;font-size:9px;margin-top:2px}.pu-drawer-item .arr{margin-left:auto;color:#a0aaba;font-size:18px}.pu-drawer-divider{height:1px;background:#edf1f5;margin:10px 4px}.pu-drawer-foot{padding:6px 4px 24px;color:#98a3b3;font-size:9px;text-align:center}";document.head.appendChild(st);var ov=document.createElement("div");ov.className="pu-drawer-overlay";ov.id="puAccountDrawerOverlay";var d=document.createElement("aside");d.className="pu-drawer";d.id="puAccountDrawer";d.innerHTML="<div class=\"pu-drawer-head\"><div class=\"pu-drawer-top\"><div class=\"pu-drawer-logo\">P</div><div class=\"pu-drawer-title\">PRINTUP<small>Print business, simplified.</small></div><button class=\"pu-drawer-close\" aria-label=\"Close\">×</button></div><div class=\"pu-drawer-shop\"><b>My Shop</b><span>Manage your shop and billing workspace</span></div></div><div class=\"pu-drawer-body\"><div class=\"pu-drawer-section\">Account</div><button class=\"pu-drawer-item\" data-go=\"profile\"><span class=\"pu-drawer-icon\">●</span><span><b>Shop Profile</b><small>Shop, owner & contact details</small></span><span class=\"arr\">›</span></button><button class=\"pu-drawer-item\" data-go=\"services\"><span class=\"pu-drawer-icon\">◈</span><span><b>Services</b><small>Manage printing services</small></span><span class=\"arr\">›</span></button><button class=\"pu-drawer-item\" data-go=\"payment\"><span class=\"pu-drawer-icon\">₹</span><span><b>Payments & UPI</b><small>Payment records and settings</small></span><span class=\"arr\">›</span></button><div class=\"pu-drawer-divider\"></div><div class=\"pu-drawer-section\">App</div><button class=\"pu-drawer-item\" data-go=\"about\"><span class=\"pu-drawer-icon\">ⓘ</span><span><b>About PRINTUP</b><small>Version and app information</small></span><span class=\"arr\">›</span></button><button class=\"pu-drawer-item\" data-go=\"help\"><span class=\"pu-drawer-icon\">?</span><span><b>Help & Support</b><small>Get help with PRINTUP</small></span><span class=\"arr\">›</span></button><button class=\"pu-drawer-item\" data-go=\"reviews\"><span class=\"pu-drawer-icon\">★</span><span><b>Rate PRINTUP</b><small>Share your feedback</small></span><span class=\"arr\">›</span></button><div class=\"pu-drawer-divider\"></div><button class=\"pu-drawer-item\" data-go=\"logout\"><span class=\"pu-drawer-icon\">↪</span><span><b>Sign out</b><small>Return to login</small></span><span class=\"arr\">›</span></button><div class=\"pu-drawer-foot\">PRINTUP • Your print business, simplified.</div></div>";document.body.appendChild(ov);document.body.appendChild(d);function close(){d.classList.remove("open");ov.classList.remove("open")}function open(){d.classList.add("open");ov.classList.add("open")}btn.addEventListener("click",open);ov.addEventListener("click",close);d.querySelector(".pu-drawer-close").addEventListener("click",close);d.querySelectorAll("[data-go]").forEach(function(x){x.addEventListener("click",function(){var target=x.dataset.go;close();if(target==="logout"){location.href="/login";return}var nav=document.querySelector('[data-nav=\"'+target+'\"]');if(nav)nav.click()})})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();})();</script>'''
                if marker in body and b'__puDrawer' not in body:
                    body = body.replace(marker, tag + b"\n" + marker, 1)
                headers = dict(response.headers)
                headers.pop("content-length", None)
                return Response(content=body, status_code=response.status_code, headers=headers, media_type="text/html")

        self.add_middleware(_PrintupHtmlInject)

    FastAPI.__init__ = _printup_init
except Exception:
    pass
