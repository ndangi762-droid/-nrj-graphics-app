from pathlib import Path
from urllib.parse import urlencode
from datetime import datetime, timezone
import math

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
    return (token, shop["shop_id"], user), None


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


def _number(value, default=0.0):
    try:
        number = float(value or 0)
        return number if math.isfinite(number) else default
    except (TypeError, ValueError):
        return default


def _owned_customer(token, shop_id, customer_id):
    if not customer_id:
        return True
    path = f"/rest/v1/customers?id=eq.{customer_id}&shop_id=eq.{shop_id}&select=id&limit=1"
    status, data = _request(path, method="GET", access_token=token)
    return status < 400 and isinstance(data, list) and bool(data)


@router.get("/printup-public-data.js")
async def public_data_js():
    content = (BASE_DIR / "printup-public-data.js").read_text(encoding="utf-8")
    return Response(content=content, media_type="application/javascript")


@router.post("/shop")
async def shop_info(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id, _ = auth
    params = {"select": "*", "id": f"eq.{shop_id}", "limit": "1"}
    status, data = _request(f"/rest/v1/shops?{urlencode(params)}", method="GET", access_token=token)
    return _result(status, data, "Unable to load shop profile.")


@router.post("/shop/update")
async def shop_update(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id, _ = auth
    allowed = {"shop_name", "owner_name", "mobile", "email", "address", "city", "state", "pin_code", "business_type", "gstin", "pan", "logo_url", "invoice_prefix"}
    payload = {key: str(body.get(key, "")).strip() for key in allowed if key in body}
    if "shop_name" in payload and not payload["shop_name"]:
        return JSONResponse({"ok": False, "error": "Shop name is required."}, status_code=400)
    if "owner_name" in payload and not payload["owner_name"]:
        return JSONResponse({"ok": False, "error": "Owner name is required."}, status_code=400)
    if "invoice_prefix" in payload and not payload["invoice_prefix"]:
        payload["invoice_prefix"] = "INV"
    if not payload:
        return JSONResponse({"ok": False, "error": "No shop details were provided."}, status_code=400)
    path = f"/rest/v1/shops?id=eq.{shop_id}"
    status, data = _request(path, method="PATCH", payload=payload, access_token=token)
    return _result(status, data, "Unable to update shop profile.")


@router.post("/customers/list")
async def customers_list(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id, _ = auth
    status, data = _db_select("customers", token, shop_id)
    return _result(status, data, "Unable to load customers.")


@router.post("/customers/create")
async def customers_create(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id, _ = auth
    name = str(body.get("name", "")).strip()
    if not name:
        return JSONResponse({"ok": False, "error": "Customer name is required."}, status_code=400)
    payload = {"shop_id": shop_id, "name": name, "phone": str(body.get("phone", "")).strip(), "email": str(body.get("email", "")).strip(), "address": str(body.get("address", "")).strip(), "notes": str(body.get("notes", "")).strip()}
    status, data = _request("/rest/v1/customers", method="POST", payload=payload, access_token=token)
    return _result(status, data, "Unable to create customer.")


@router.post("/jobs/list")
async def jobs_list(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id, _ = auth
    status, data = _db_select("jobs", token, shop_id, select="*,customers(name,phone)")
    return _result(status, data, "Unable to load jobs.")


@router.post("/jobs/create")
async def jobs_create(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id, _ = auth
    title = str(body.get("title", "")).strip()
    if not title:
        return JSONResponse({"ok": False, "error": "Job title is required."}, status_code=400)
    customer_id = str(body.get("customer_id", "")).strip() or None
    if customer_id and not _owned_customer(token, shop_id, customer_id):
        return JSONResponse({"ok": False, "error": "Customer does not belong to this shop."}, status_code=400)
    total = max(0.0, _number(body.get("total")))
    advance = max(0.0, _number(body.get("advance")))
    expenses = max(0.0, _number(body.get("expenses")))
    if advance > total:
        advance = total
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y%m%d%H%M%S%f")
    job_number = str(body.get("job_number", "")).strip() or f"JOB-{stamp}"
    payload = {"shop_id": shop_id, "customer_id": customer_id, "job_number": job_number, "bill_number": str(body.get("bill_number", "")).strip() or job_number, "title": title, "status": str(body.get("status", "pending")).strip() or "pending", "total": total, "advance": advance, "balance": max(0.0, total - advance), "expenses": expenses, "notes": str(body.get("notes", "")).strip(), "bill_type": str(body.get("bill_type", "bill")).strip() or "bill"}
    status, data = _request("/rest/v1/jobs", method="POST", payload=payload, access_token=token)
    return _result(status, data, "Unable to create job/bill record.")


@router.post("/jobs/status")
async def jobs_status(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id, _ = auth
    job_id = str(body.get("job_id", "")).strip()
    status_value = str(body.get("status", "")).strip()
    allowed = {"pending", "in_progress", "ready", "delivered", "cancelled", "completed"}
    if not job_id or status_value not in allowed:
        return JSONResponse({"ok": False, "error": "Invalid job status."}, status_code=400)
    path = f"/rest/v1/jobs?id=eq.{job_id}&shop_id=eq.{shop_id}"
    status, data = _request(path, method="PATCH", payload={"status": status_value}, access_token=token)
    return _result(status, data, "Unable to update job status.")


@router.post("/payments/list")
async def payments_list(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id, _ = auth
    status, data = _db_select("payments", token, shop_id, select="*,customers(name),jobs(job_number,title)")
    return _result(status, data, "Unable to load payments.")


@router.post("/payments/create")
async def payments_create(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id, _ = auth
    amount = _number(body.get("amount"))
    if amount <= 0:
        return JSONResponse({"ok": False, "error": "Payment amount must be greater than zero."}, status_code=400)
    job_id = str(body.get("job_id", "")).strip() or None
    customer_id = str(body.get("customer_id", "")).strip() or None
    if not job_id:
        return JSONResponse({"ok": False, "error": "Bill / job is required for a payment."}, status_code=400)
    if customer_id and not _owned_customer(token, shop_id, customer_id):
        return JSONResponse({"ok": False, "error": "Customer does not belong to this shop."}, status_code=400)
    rpc_payload = {"p_job_id": job_id, "p_customer_id": customer_id, "p_amount": amount, "p_method": str(body.get("method", "cash")).strip() or "cash", "p_reference": str(body.get("reference", "")).strip(), "p_notes": str(body.get("notes", "")).strip()}
    status, data = _request("/rest/v1/rpc/record_printup_payment", payload=rpc_payload, access_token=token)
    if status >= 400:
        return JSONResponse({"ok": False, "error": "Unable to record payment. Please refresh the bill and try again."}, status_code=400)
    return {"ok": True, "data": data}


@router.post("/services/list")
async def services_list(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id, _ = auth
    status, data = _db_select("services", token, shop_id, extra={"active": "eq.true"}, order="name.asc")
    return _result(status, data, "Unable to load services.")


@router.post("/services/create")
async def services_create(body: dict):
    auth, error = _auth(body)
    if error:
        return error
    token, shop_id, _ = auth
    name = str(body.get("name", "")).strip()
    category = str(body.get("category", "General")).strip() or "General"
    if not name:
        return JSONResponse({"ok": False, "error": "Service name is required."}, status_code=400)
    rate = max(0.0, _number(body.get("rate")))
    payload = {"shop_id": shop_id, "name": name, "category": category, "rate": rate, "active": True}
    status, data = _request("/rest/v1/services", method="POST", payload=payload, access_token=token)
    return _result(status, data, "Unable to create service.")
