import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.parse import urlsplit


class BackendEnvironmentError(ValueError):
    pass

def validate_environment(raw):
    try:
        values = json.loads(raw)
    except json.JSONDecodeError:
        raise BackendEnvironmentError("BACKEND_ENV_JSON must contain valid JSON") from None
    allowed = {
        "POSTGRES_USER", "POSTGRES_PASSWORD", "DB_NAME", "JWT_SECRET", "JWT_ISSUER", "JWT_AUDIENCE",
        "FRONTEND_CUSTOMER_URL", "FRONTEND_ADMIN_URL", "AUTH_COOKIE_SECURE",
        "SEPAY_API_KEY", "CLOUDINARY_ENABLED", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET", "MAIL_SENDER_ENABLED", "MAIL_SENDER_USERNAME", "MAIL_SENDER_APP_PASSWORD",
        "REPORT_REVENUE_EVENT", "MAPBOX_GEOCODING_TOKEN", "MAPBOX_DIRECTIONS_TOKEN",
        "BRIDGE_API_KEY",
        "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", "VITE_MAPBOX_ACCESS_TOKEN",
    }
    if not isinstance(values, dict):
        raise BackendEnvironmentError("BACKEND_ENV_JSON must be a JSON object")
    if set(values) - allowed:
        raise BackendEnvironmentError("BACKEND_ENV_JSON contains unsupported keys; use only keys listed in deploy/backend/README.md")
    for key, value in values.items():
        if not isinstance(value, str) or "'" in value or any(ord(char) < 32 for char in value):
            raise BackendEnvironmentError(f"{key} must be a string without control characters or single quotes")
    for key, minimum in (("JWT_SECRET", 32), ("POSTGRES_PASSWORD", 16)):
        value = values.get(key, "")
        if len(value.encode()) < minimum:
            raise BackendEnvironmentError(f"{key} is required and must contain at least {minimum} UTF-8 bytes")
        if any(marker in value.lower() for marker in ("change-me", "replace-", "example", "placeholder", "clucky-dev-secret")):
            raise BackendEnvironmentError(f"{key} must not contain placeholder text")
    for key, port in (("FRONTEND_CUSTOMER_URL", ""), ("FRONTEND_ADMIN_URL", ":8081")):
        if not values.get(key):
            host = os.environ.get("VPS_HOST", "")
            if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?", host):
                raise BackendEnvironmentError("VPS_HOST must be a hostname or IPv4 address without scheme, port or path when frontend URLs are omitted")
            values[key] = f"https://{host}{port}"
        try:
            origin = urlsplit(values.get(key, ""))
        except ValueError:
            raise BackendEnvironmentError(f"{key} must be a valid HTTP(S) origin") from None
        if origin.scheme not in ("http", "https") or not origin.hostname or origin.path or origin.query or origin.fragment or origin.username or origin.password:
            raise BackendEnvironmentError(f"{key} must be an exact HTTP(S) origin without path, trailing slash, query, fragment or credentials")
    values.setdefault("AUTH_COOKIE_SECURE", "true" if all(values[key].startswith("https://") for key in ("FRONTEND_CUSTOMER_URL", "FRONTEND_ADMIN_URL")) else "false")
    if values["AUTH_COOKIE_SECURE"] not in ("true", "false"):
        raise BackendEnvironmentError('AUTH_COOKIE_SECURE must be the string "true" or "false"')
    if values["AUTH_COOKIE_SECURE"] == "true" and any(not values[key].startswith("https://") for key in ("FRONTEND_CUSTOMER_URL", "FRONTEND_ADMIN_URL")):
        raise BackendEnvironmentError("Secure cookies require HTTPS frontend origins; match the public reverse proxy scheme")
    for key, default in (("POSTGRES_USER", "clucky"), ("DB_NAME", "clucky")):
        values.setdefault(key, default)
        if not re.fullmatch(r"[a-z_][a-z0-9_]{0,62}", values[key]):
            raise BackendEnvironmentError(f"{key} must match [a-z_][a-z0-9_]{{0,62}}")
    for flag, required in (("CLOUDINARY_ENABLED", ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")),
                           ("MAIL_SENDER_ENABLED", ("MAIL_SENDER_USERNAME", "MAIL_SENDER_APP_PASSWORD"))):
        if values.get(flag, "false") not in ("true", "false"):
            raise BackendEnvironmentError(f'{flag} must be the string "true" or "false"')
        if values.get(flag) == "true":
            for key in required:
                if not values.get(key):
                    raise BackendEnvironmentError(f"{key} is required when {flag} is true")
    if values.get("REPORT_REVENUE_EVENT", "false") not in ("false", "order.completed", "payment.confirmed"):
        raise BackendEnvironmentError("REPORT_REVENUE_EVENT must be false, order.completed or payment.confirmed")
    for name in ("MAPBOX_GEOCODING_TOKEN", "MAPBOX_DIRECTIONS_TOKEN"):
        mapbox_token = values.get(name, "")
        if mapbox_token and (not mapbox_token.startswith(("pk.", "sk.")) or len(mapbox_token) <= 3 or any(char.isspace() for char in mapbox_token)):
            raise BackendEnvironmentError(f"{name} must be a pk. or sk. Mapbox token without whitespace")
    for name in ("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", "VITE_MAPBOX_ACCESS_TOKEN"):
        token = values.get(name, "")
        if token and (not token.startswith("pk.") or len(token) <= 3 or any(char.isspace() for char in token)):
            raise BackendEnvironmentError(f"{name} must be a public pk. Mapbox token without whitespace; never use a secret token in a frontend build")
    return values

def prepare(root, release, raw):
    root = Path(root)
    if not root.is_absolute() or root == Path(root.anchor) or ".." in root.parts:
        raise ValueError("Invalid VPS directory")
    if not re.fullmatch(r"[0-9a-f]{40}-[0-9]+-[0-9]+", release):
        raise ValueError("Invalid release")
    values = validate_environment(raw)
    values.pop("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", None)
    values.pop("VITE_MAPBOX_ACCESS_TOKEN", None)
    firebase = root / "secrets" / "firebase-service-account.json"
    project = json.loads(firebase.read_text(encoding="utf-8"))["project_id"]
    if not re.fullmatch(r"[a-z][a-z0-9-]{4,28}[a-z0-9]", project):
        raise ValueError("Invalid Firebase project")
    values.update(IMAGE_TAG=release, VPS_WORKDIR=str(root), FIREBASE_PROJECT_ID=project)
    values["FIREBASE_CREDENTIAL_REVISION"] = hashlib.sha256(firebase.read_bytes()).hexdigest()
    directory = root / "backend" / "incoming" / release
    if any(path.is_symlink() for path in (directory, *directory.parents)):
        raise ValueError("Deployment directory cannot be a symlink")
    current = root / "backend" / "current"
    if current.exists():
        prior = current.resolve()
        if prior.parent != root / "backend" / "releases":
            raise ValueError("Invalid current release")
        old = dict(line.split("=", 1) for line in (prior / "runtime.env").read_text().splitlines())
        for key in ("POSTGRES_PASSWORD", "POSTGRES_USER", "DB_NAME"):
            if old.get(key) != "'" + values[key] + "'":
                raise ValueError("Database credentials cannot change without an explicit database migration")
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(directory, 0o700)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=directory, delete=False) as output:
            temporary = Path(output.name)
            os.chmod(temporary, 0o600)
            output.write("".join(f"{key}='{value}'\n" for key, value in sorted(values.items())))
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, directory / "runtime.env")
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        if sys.argv[1:] == ["--validate"]:
            validate_environment(sys.stdin.read(65537))
            print("Backend environment configuration valid. No files changed.")
            sys.exit(0)
        elif len(sys.argv) != 3:
            raise ValueError("Directory and release required")
        prepare(sys.argv[1], sys.argv[2], sys.stdin.read(65537))
    except BackendEnvironmentError as error:
        print(f"Backend environment rejected: {error}. No secret values were logged.", file=sys.stderr)
        sys.exit(1)
    except (ValueError, OSError, TypeError, KeyError):
        print("Backend environment rejected. Check required secrets/origins, Firebase provisioning, permissions and unchanged database credentials. No secret values were logged.", file=sys.stderr)
        sys.exit(1)
    print("Backend environment prepared with private permissions.")
