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
            return FileResponse(target, media_type=media)

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
                tag = b'<script src="/printup-services-catalog.js?v=1" defer></script>'
                if marker in body and tag not in body:
                    body = body.replace(marker, tag + b"\n" + marker, 1)
                headers = dict(response.headers)
                headers.pop("content-length", None)
                return Response(content=body, status_code=response.status_code, headers=headers, media_type="text/html")

        self.add_middleware(_PrintupHtmlInject)

    FastAPI.__init__ = _printup_init
except Exception:
    pass
