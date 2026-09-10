import json, os, re, urllib.error, urllib.request

SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://bjdxaknxhllhbtpckrza.supabase.co').rstrip('/')
SUPABASE_PUBLISHABLE_KEY = os.getenv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_ndgujsCl7qR_H_6Kvkk7Qw_deT4FYZk')
_REQUEST_TIMEOUT = float(os.getenv('PRINTUP_AUTH_TIMEOUT', '12'))


def _request(path, method='POST', payload=None, access_token=None):
    body = None if payload is None else json.dumps(payload).encode()
    headers = {
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
    if access_token:
        headers['Authorization'] = f'Bearer {access_token}'
    req = urllib.request.Request(SUPABASE_URL + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=_REQUEST_TIMEOUT) as res:
            raw = res.read().decode()
            return res.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode(errors='replace')
        try:
            data = json.loads(raw)
        except Exception:
            data = {'message': raw}
        return exc.code, data
    except (urllib.error.URLError, TimeoutError) as exc:
        return 503, {'error': 'Authentication service temporarily unavailable'}
    except (ValueError, json.JSONDecodeError):
        return 502, {'error': 'Invalid authentication service response'}


def normalize_mobile(mobile: str) -> str:
    """Normalize Indian mobile input to E.164 while accepting an already-prefixed number."""
    value = re.sub(r'[^0-9+]', '', str(mobile or '').strip())
    if value.startswith('00'):
        value = '+' + value[2:]
    if value.startswith('+'):
        digits = value[1:]
        if not digits.isdigit() or not 8 <= len(digits) <= 15:
            raise ValueError('Invalid mobile number')
        return '+' + digits
    digits = re.sub(r'\D', '', value)
    if len(digits) == 10 and digits[0] in '6789':
        return '+91' + digits
    if digits.startswith('91') and len(digits) == 12 and digits[2] in '6789':
        return '+' + digits
    raise ValueError('Enter a valid 10-digit mobile number')


def send_otp(mobile: str):
    return _request('/auth/v1/otp', payload={'phone': normalize_mobile(mobile), 'create_user': True})


def verify_otp(mobile: str, token: str):
    return _request('/auth/v1/verify', payload={'phone': normalize_mobile(mobile), 'token': str(token or '').strip(), 'type': 'sms'})


def get_user(access_token: str):
    return _request('/auth/v1/user', method='GET', access_token=access_token)


def provision_shop(access_token: str, shop: dict):
    return _request('/rest/v1/rpc/provision_shop_for_current_user', payload=shop, access_token=access_token)


def get_current_user_shop(access_token: str):
    return _request('/rest/v1/rpc/get_current_user_shop', access_token=access_token)
