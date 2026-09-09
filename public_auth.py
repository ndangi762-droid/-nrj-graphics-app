import json, os, urllib.error, urllib.request

def _config():
    url = os.getenv('SUPABASE_URL', '').rstrip('/')
    key = os.getenv('SUPABASE_ANON_KEY', '')
    if not url or not key:
        raise RuntimeError('Public authentication is not configured')
    return url, key

def _request(path, method='POST', payload=None, access_token=None):
    url, anon_key = _config()
    body = None if payload is None else json.dumps(payload).encode()
    headers = {'apikey': anon_key, 'Content-Type': 'application/json'}
    if access_token:
        headers['Authorization'] = f'Bearer {access_token}'
    req = urllib.request.Request(url + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=12) as res:
            raw = res.read().decode()
            return res.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode(errors='replace')
        try:
            data = json.loads(raw)
        except Exception:
            data = {'message': raw}
        return exc.code, data

def send_otp(mobile: str):
    return _request('/auth/v1/otp', payload={'phone': mobile, 'create_user': True})

def verify_otp(mobile: str, token: str):
    return _request('/auth/v1/verify', payload={'phone': mobile, 'token': token, 'type': 'sms'})

def get_user(access_token: str):
    return _request('/auth/v1/user', method='GET', access_token=access_token)

def provision_shop(access_token: str, shop: dict):
    return _request('/rest/v1/rpc/provision_shop_for_current_user', payload=shop, access_token=access_token)
