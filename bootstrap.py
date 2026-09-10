from main import app
from starlette.responses import Response

from public_core import router as public_core_router

app.include_router(public_core_router)


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
        tag = b'<script src="/api/public/printup-public-data.js?v=1" defer></script>'
        body = body.replace(b"</head>", tag + b"\n</head>", 1)

    headers = dict(response.headers)
    headers.pop("content-length", None)
    return Response(content=body, status_code=response.status_code, headers=headers, media_type="text/html")
