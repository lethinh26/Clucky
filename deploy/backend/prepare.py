import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.parse import urlsplit


def prepare(root, release, raw):
    root = Path(root)
    if not root.is_absolute() or root == Path(root.anchor) or ".." in root.parts:
        raise ValueError("Invalid VPS directory")
    if not re.fullmatch(r"[0-9a-f]{40}-[0-9]+-[0-9]+", release):
        raise ValueError("Invalid release")
    values = json.loads(raw)
    allowed = {
        "POSTGRES_USER", "POSTGRES_PASSWORD", "DB_NAME", "JWT_SECRET", "JWT_ISSUER", "JWT_AUDIENCE",
        "FRONTEND_CUSTOMER_URL", "FRONTEND_ADMIN_URL", "AUTH_COOKIE_SECURE", "CATALOG_SERVICE_TOKEN",
        "SEPAY_WEBHOOK_SECRET", "CLOUDINARY_ENABLED", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET", "MAIL_SENDER_ENABLED", "MAIL_SENDER_USERNAME", "MAIL_SENDER_APP_PASSWORD",
    }
    if not isinstance(values, dict) or set(values) - allowed:
        raise ValueError("Unsupported backend environment keys")
    if any(not isinstance(value, str) or "'" in value or any(ord(char) < 32 for char in value) for value in values.values()):
        raise ValueError("Environment values must be strings without control characters or single quotes")
    for key, minimum in (("JWT_SECRET", 32), ("POSTGRES_PASSWORD", 16)):
        value = values.get(key, "")
        if len(value.encode()) < minimum or any(marker in value.lower() for marker in ("change-me", "replace-", "example", "placeholder", "clucky-dev-secret")):
            raise ValueError("Configure real JWT and database secrets")
    for key in ("FRONTEND_CUSTOMER_URL", "FRONTEND_ADMIN_URL"):
        origin = urlsplit(values.get(key, ""))
        if origin.scheme not in ("http", "https") or not origin.hostname or origin.path or origin.query or origin.fragment or origin.username or origin.password:
            raise ValueError("Configure exact frontend origins, without trailing slash")
    values.setdefault("AUTH_COOKIE_SECURE", "true" if all(values[key].startswith("https://") for key in ("FRONTEND_CUSTOMER_URL", "FRONTEND_ADMIN_URL")) else "false")
    if values["AUTH_COOKIE_SECURE"] not in ("true", "false"):
        raise ValueError("Invalid cookie configuration")
    for key, default in (("POSTGRES_USER", "clucky"), ("DB_NAME", "clucky")):
        values.setdefault(key, default)
        if not re.fullmatch(r"[a-z_][a-z0-9_]{0,62}", values[key]):
            raise ValueError("Invalid database identifier")
    for flag, required in (("CLOUDINARY_ENABLED", ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")),
                           ("MAIL_SENDER_ENABLED", ("MAIL_SENDER_USERNAME", "MAIL_SENDER_APP_PASSWORD"))):
        if values.get(flag, "false") not in ("true", "false") or (values.get(flag) == "true" and any(not values.get(key) for key in required)):
            raise ValueError("Incomplete integration configuration")
    firebase = root / "secrets" / "firebase-service-account.json"
    project = json.loads(firebase.read_text(encoding="utf-8"))["project_id"]
    if not re.fullmatch(r"[a-z][a-z0-9-]{4,28}[a-z0-9]", project):
        raise ValueError("Invalid Firebase project")
    values.update(IMAGE_TAG=release, VPS_WORKDIR=str(root), FIREBASE_PROJECT_ID=project)
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
        if len(sys.argv) != 3:
            raise ValueError("Directory and release required")
        prepare(sys.argv[1], sys.argv[2], sys.stdin.read(65537))
    except (ValueError, OSError, TypeError, KeyError):
        print("Backend environment rejected. Check required secrets/origins, Firebase provisioning, permissions and unchanged database credentials. No secret values were logged.", file=sys.stderr)
        sys.exit(1)
    print("Backend environment prepared with private permissions.")
