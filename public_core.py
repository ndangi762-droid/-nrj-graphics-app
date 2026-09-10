from pathlib import Path
from urllib.parse import urlencode
from datetime import datetime, timezone

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
    try:
        total = max(0.0, float(body.get("total", 0) or 0))
        advance = max(0.0, float(body.get("advance", 0) or 0))
        if advance > total:
            advance = total
    except (TypeError, ValueError):
        return JSONResponse({"ok": False, "error": "Enter valid amounts."}, status_code=400)
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y%m%d%H%M%S")
    job_number = str(body.get("job_number", "")).strip() or f"JOB-{stamp}"
    payload = {
        "shop_id": shop_id,
        "customer_id": body.get("customer_id") or None,
        "job_number": job_number,
        "bill_number": str(body.get("bill_number", "")).strip() or job_number,
        "title": title,
        "status": str(body.get("status", "pending")).strip() or "pending",
        "total": total,
        "advance": advance,
        "balance": max(0.0, total - advance),
        "expenses": max(0.0, float(body.get("expenses", 0) or 0)),
        "notes": str(body.get("notes", "")).strip(),
        "bill_type": str(body.get("bill_type", "bill")).strip() or "bill",
    }
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
    try:
        amount = float(body.get("amount", 0) or 0)
    except (TypeError, ValueError):
        amount = 0
    if amount <= 0:
        return JSONResponse({"ok": False, "error": "Payment amount must be greater than zero."}, status_code=400)
    job_id = str(body.get("job_id", "")).strip() or None
    customer_id = str(body.get("customer_id", "")).strip() or None
    payload = {
        "shop_id": shop_id,
        "job_id": job_id,
        "customer_id": customer_id,
        "amount": amount,
        "method": str(body.get("method", "cash")).strip() or "cash",
        "reference": str(body.get("reference", "")).strip(),
        "notes": str(body.get("notes", "")).strip(),
    }
    status, data = _request("/rest/v1/payments", method="POST", payload=payload, access_token=token)
    if status >= 400:
        return _result(status, data, "Unable to record payment.")
    if job_id:
        job_path = f"/rest/v1/jobs?id=eq.{job_id}&shop_id=eq.{shop_id}&select=total,advance,balance"
        job_status, jobs = _request(job_path, method="GET", access_token=token)
        if job_status < 400 and isinstance(jobs, list) and jobs:
            job = jobs[0]
            old_advance = float(job.get("advance") or 0)
            total = float(job.get("total") or 0)
            new_advance = min(total, old_advance + amount)
            new_balance = max(0.0, total - new_advance)
            _request(f"/rest/v1/jobs?id=eq.{job_id}&shop_id=eq.{shop_id}", method="PATCH", payload={"advance": new_advance, "balance": new_balance}, access_token=token)
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
    try:
        rate = float(body.get("rate", 0) or 0)
    except (TypeError, ValueError):
        rate = 0
    payload = {"shop_id": shop_id, "name": name, "category": category, "rate": max(0.0, rate), "active": True}
    status, data = _request("/rest/v1/services", method="POST", payload=payload, access_token=token)
    return _result(status, data, "Unable to create service.")
