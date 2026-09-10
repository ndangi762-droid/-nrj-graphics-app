from pathlib import Path
from urllib.parse import urlencode

from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response

from public_auth import _request, get_current_user_shop, get_user

router = APIRouter(prefix="/api/public", tags=["public-core"])
BASE_DIR = Path(__file__).resolve().parent


def _auth(body):
    token = str(body.get("access_token", "")).strip()
    if not token:
        return None, JSONResponse({"ok": False, "error": "Authentication required."}, status_code=401)
    status, user = get_user(token)
    if status >= 400 or not user.get("id"):
        return None, JSONResponse({"ok": False, "error": "Session expired. Please login again."}, status_code=401)
    status, shop = get_current_user_shop(token)
    if status >= 400 or not isinstance(shop, dict) or not shop.get("shop_id"):
        return None, JSONResponse({"ok": False, "error": "No PRINTUP shop is linked to this account."}, status_code=403)
    return (token, shop["shop_id"]), None


def _db_select(table, token, shop_id, *, select="*", extra=None, order="created_at.desc", limit=200):
    params = {"select": select, "shop_id": f"eq.{shop_id}", "limit": str(limit)}
    if order:
        params["order"] = order
    if extra:
        params.update(extra)
    path = f"/rest/v1/{table}?{urlencode(params)}"
    return _request(path, method="GET", access_token=token)


def _result(status, data, fallback="Database request failed."):
    if status >= 400:
        return JSONResponse({"ok": False, "error": fallback}, status_code=400 if status < 500 else status)
    return {"ok": True, "data": data}


@router.get("/printup-public-data.js")
async def public_data_js():
    content = (BASE_DIR / "printup-public-data.js").read_text(encoding="utf-8")
    return Response(content=content, media_type="application/javascript")


@router.post("/customers/list")
async def customers_list(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id = auth
    status, data = _db_select("customers", token, shop_id)
    return _result(status, data, "Unable to load customers.")


@router.post("/customers/create")
async def customers_create(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id = auth
    name = str(body.get("name", "")).strip()
    if not name:
        return JSONResponse({"ok": False, "error": "Customer name is required."}, status_code=400)
    payload = {
        "shop_id": shop_id,
        "name": name,
        "phone": str(body.get("phone", "")).strip(),
        "email": str(body.get("email", "")).strip(),
        "address": str(body.get("address", "")).strip(),
        "notes": str(body.get("notes", "")).strip(),
    }
    status, data = _request("/rest/v1/customers", method="POST", payload=payload, access_token=token)
    return _result(status, data, "Unable to create customer.")


@router.post("/jobs/list")
async def jobs_list(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id = auth
    status, data = _db_select("jobs", token, shop_id, select="*,customers(name,phone)")
    return _result(status, data, "Unable to load jobs.")


@router.post("/payments/list")
async def payments_list(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id = auth
    status, data = _db_select("payments", token, shop_id)
    return _result(status, data, "Unable to load payments.")


@router.post("/services/list")
async def services_list(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id = auth
    status, data = _db_select("services", token, shop_id, extra={"active": "eq.true"}, order="name.asc")
    return _result(status, data, "Unable to load services.")
