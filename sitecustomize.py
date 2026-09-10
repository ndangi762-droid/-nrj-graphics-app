"""PRINTUP process bootstrap.

Loaded automatically by Python before Uvicorn imports main.py. Keeps legacy main.py
stable while supplying a small production asset fallback and suppressing the known
embedded-JavaScript SyntaxWarning from the signup page.
"""
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=SyntaxWarning)

try:
    from fastapi.responses import FileResponse, Response
    from fastapi import FastAPI

    _original_init = FastAPI.__init__

    def _printup_init(self, *args, **kwargs):
        _original_init(self, *args, **kwargs)
        base = Path.cwd()

        def _file(path, media):
            target = base / path
            if not target.exists():
                return Response(status_code=404)
            return FileResponse(target, media_type=media)

        assets = {
            "/manifest.json": ("manifest.json", "application/manifest+json"),
            "/service-worker.js": ("service-worker.js", "application/javascript"),
            "/favicon.svg": ("favicon.svg", "image/svg+xml"),
            "/favicon.ico": ("nrj_graphics_icon.svg", "image/svg+xml"),
            "/nrj_graphics_icon.svg": ("nrj_graphics_icon.svg", "image/svg+xml"),
            "/printup_icon_64.png": ("nrj_graphics_icon.svg", "image/svg+xml"),
        }
        for route, (filename, media) in assets.items():
            async def asset_endpoint(_route=route, _filename=filename, _media=media):
                return _file(_filename, _media)
            self.add_api_route(route, asset_endpoint, methods=["GET"], include_in_schema=False)

    FastAPI.__init__ = _printup_init
except Exception:
    pass
