import json
import os
from pathlib import Path
import re
import sys
import tempfile


def install(root, raw):
    credential = json.loads(raw)
    if not isinstance(credential, dict) or credential.get("type") != "service_account":
        raise ValueError("Expected a service account")
    project = credential.get("project_id", "")
    if not isinstance(project, str) or not re.fullmatch(r"[a-z][a-z0-9-]{4,28}[a-z0-9]", project):
        raise ValueError("Invalid project ID")
    private_key = credential.get("private_key", "")
    if not isinstance(private_key, str) or not private_key.startswith("-----BEGIN PRIVATE KEY-----\n") or not private_key.rstrip().endswith("-----END PRIVATE KEY-----"):
        raise ValueError("Invalid private key format")
    email = credential.get("client_email", "")
    if not isinstance(email, str) or not re.fullmatch(r"[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.iam\.gserviceaccount\.com", email):
        raise ValueError("Invalid service account email")
    if credential.get("token_uri") not in ("https://oauth2.googleapis.com/token", "https://accounts.google.com/o/oauth2/token"):
        raise ValueError("Invalid token endpoint")

    root = Path(root)
    if not root.is_absolute() or ".." in root.parts or root == Path(root.anchor) or not root.is_dir():
        raise ValueError("Invalid deployment directory")
    directory = root / "secrets"
    if any(path.is_symlink() for path in (directory, *directory.parents)):
        raise ValueError("Symlinks are not allowed in the secret directory path")
    directory.mkdir(mode=0o700, exist_ok=True)
    os.chmod(directory, 0o700)
    account_file = directory / "firebase-service-account.json"
    env_file = directory / "firebase.env"
    if any(path.is_symlink() or (path.exists() and not path.is_file()) for path in (account_file, env_file)):
        raise ValueError("Invalid secret destination")
    if account_file.exists():
        previous = json.loads(account_file.read_text(encoding="utf-8"))
        if not isinstance(previous, dict) or previous.get("project_id") != project:
            raise ValueError("Project changes require a separate migration")

    environment = (
        "FIREBASE_AUTH_ENABLED=true\n"
        f"FIREBASE_PROJECT_ID={project}\n"
        "GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase-service-account.json\n"
    )
    for destination, content in ((env_file, environment), (account_file, json.dumps(credential) + "\n")):
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=directory, delete=False) as output:
                temporary = Path(output.name)
                os.chmod(temporary, 0o600)
                output.write(content)
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, destination)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("Deployment directory required")
        install(sys.argv[1], sys.stdin.read(65537))
    except (ValueError, OSError, TypeError):
        print("Firebase credential installation failed. Check JSON, destination permissions and project consistency; existing credential was not replaced by a partial file.", file=sys.stderr)
        sys.exit(1)
    print("Firebase credential and firebase.env installed with restricted permissions. Identity was not restarted.")
