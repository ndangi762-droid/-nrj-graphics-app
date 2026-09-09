import json, os, urllib.error, urllib.request

SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://bjdxaknxhllhbtpckrza.supabase.co').rstrip('/')
SUPABASE_PUBLISHABLE_KEY = os.getenv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_ndgujsCl7qR_H_6Kvkk7Qw_deT4FYZk')

def _request(path, method='POST', payload=None, access_token=None):
    body = None if payload is None else json.dumps(payload).encode()
    headers = {'apikey': SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json'}
    if access_token:
        headers['Authorization'] = f'Bearer {access_token}'
    req = urllib.request.Request(SUPABASE_URL + path, data=body, headers=headers, method=method)
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

def get_current_user_shop(access_token: str):
    return _request('/rest/v1/rpc/get_current_user_shop', access_token=access_token)
