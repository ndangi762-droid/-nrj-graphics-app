"""PRINTUP production entrypoint.

Render continues to use ``uvicorn main:app``. The legacy main.py is loaded
unchanged, then the Phase 2 router is attached without rewriting the stable
billing/UI implementation.
"""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from fastapi.responses import Response

_LEGACY_PATH = Path(__file__).resolve().parent.parent / "main.py"
_SPEC = spec_from_file_location("printup_legacy_main", _LEGACY_PATH)
if _SPEC is None or _SPEC.loader is None:
    raise RuntimeError("PRINTUP legacy application could not be loaded")
_LEGACY = module_from_spec(_SPEC)
_SPEC.loader.exec_module(_LEGACY)

app = _LEGACY.app

from public_core import router as public_core_router  # noqa: E402

app.include_router(public_core_router)


@app.get("/printup-public-data.css")
async def public_data_css():
    return Response(content=(Path(__file__).resolve().parent.parent / "printup-public-data.css").read_text(encoding="utf-8"), media_type="text/css")


@app.middleware("http")
async def inject_public_data_bridge(request, call_next):
    response = await call_next(request)
    content_type = response.headers.get("content-type", "")
    if "text/html" not in content_type:
        return response

    body = b""
    async for chunk in response.body_iterator:
        body += chunk

    marker = b"/api/public/printup-public-data.js"
    if marker not in body and b"</head>" in body:
        tags = (
            b'<link rel="stylesheet" href="/printup-public-data.css?v=1">\n'
            b'<script src="/api/public/printup-public-data.js?v=2" defer></script>\n'
            b'<script src="/printup-history-actions.js?v=1" defer></script>'
        )
        body = body.replace(b"</head>", tags + b"\n</head>", 1)

    headers = dict(response.headers)
    headers.pop("content-length", None)
    return Response(content=body, status_code=response.status_code, headers=headers, media_type="text/html")
