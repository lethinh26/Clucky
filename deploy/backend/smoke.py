import json
import os
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def response(url, headers=None, body=None):
    request = Request(url, headers=headers or {}, data=body)
    try:
        with urlopen(request, timeout=15) as result:
            return result.status, result.headers.get("Content-Type", ""), result.read()
    except HTTPError as failure:
        return failure.code, failure.headers.get("Content-Type", ""), failure.read()


def check(origin, scope):
    status, content_type, _ = response(origin + "/login")
    if status != 200 or "text/html" not in content_type:
        raise RuntimeError(f"{scope}: public login page is not ready ({status})")
    headers = {"Origin": origin, "X-Clucky-Client": scope, "Content-Type": "application/json"}
    status, content_type, body = response(origin + "/api/auth/login", headers, b"{}")
    if status != 400 or "application/json" not in content_type or json.loads(body).get("code") != "VALIDATION_ERROR":
        raise RuntimeError(f"{scope}: invalid login must reach validation, not fail origin/proxy checks ({status})")
    status, _, _ = response(origin + "/api/auth/login", {**headers, "Origin": "https://untrusted.invalid"}, b"{}")
    if status != 403:
        raise RuntimeError(f"{scope}: untrusted origin was not rejected ({status})")
    status, content_type, body = response(origin + "/api/catalog/products?page=0&size=1")
    if status != 200 or "application/json" not in content_type:
        raise RuntimeError(f"{scope}: public catalog does not reach Gateway ({status})")
    json.loads(body)


if __name__ == "__main__":
    for scope, variable in (("customer", "FRONTEND_CUSTOMER_URL"), ("admin", "FRONTEND_ADMIN_URL")):
        for attempt in range(6):
            try:
                check(os.environ[variable], scope)
                print(f"{scope}: HTTPS, public page, Gateway and auth-origin checks passed")
                break
            except (RuntimeError, URLError, TimeoutError, ValueError) as failure:
                if attempt == 5:
                    raise SystemExit(str(failure))
                time.sleep(5)
