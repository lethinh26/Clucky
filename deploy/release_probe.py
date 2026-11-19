"""Read-only production probe sent to the VPS over pinned SSH stdin.

Print the deployed commit only when backend and frontend release links,
running application images and health states agree with the saved manifests.
"""

import json
import os
from pathlib import Path
import re
import subprocess
import sys


RELEASE_PATTERN = re.compile(r"releases/([0-9a-f]{40})-[0-9]+-[0-9]+\Z")
BACKEND = (
    "config-server", "discovery-server", "identity-service", "catalog-store-service",
    "cart-order-service", "payment-service", "promotion-loyalty-service", "shipping-service",
    "notification-service", "review-report-service", "audit-service", "api-gateway",
)
FRONTEND = ("customer", "admin")
IMAGE_PATTERN = re.compile(r"ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+/[a-z0-9-]+@sha256:[a-f0-9]{64}\Z")


def docker_output(*args):
    result = subprocess.run(
        ["docker", *args], capture_output=True, text=True, timeout=20, check=False,
    )
    if result.returncode:
        raise RuntimeError("Cannot verify running Docker containers")
    return result.stdout


def verify_services(root, group, project, names):
    path = root / group / "current" / "images.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))["services"]
    if set(manifest) != set(names):
        raise ValueError("Incomplete image manifest")
    identifiers = docker_output(
        "ps", "--quiet", "--filter", f"label=com.docker.compose.project={project}",
    ).splitlines()
    if not identifiers:
        raise RuntimeError("No running application containers")
    containers = json.loads(docker_output("inspect", *identifiers))
    actual = {}
    for container in containers:
        labels = container["Config"]["Labels"] or {}
        name = labels.get("com.docker.compose.service")
        if name in manifest:
            if name in actual:
                raise RuntimeError("Duplicate service container")
            actual[name] = container
    if set(actual) != set(names):
        raise RuntimeError("Application container missing")

    for name in names:
        expected = manifest[name]
        expected_image = expected["image"]
        container = actual[name]
        if not IMAGE_PATTERN.fullmatch(expected_image):
            raise ValueError("Release manifest lacks an immutable digest")
        if container["Config"]["Image"] != expected_image:
            raise RuntimeError("Running image differs from active release")
        if container["State"].get("Health", {}).get("Status") != "healthy":
            raise RuntimeError("Application health is not verified")
        labels = container["Config"]["Labels"] or {}
        for label, value in expected.get("labels", {}).items():
            # The Firebase revision placeholder is resolved from private
            # runtime.env by Compose and should not be expanded by this probe.
            if not value.startswith("${") and labels.get(label) != value:
                raise RuntimeError("Active configuration label differs")


def deployed_commit(root):
    root = Path(root)
    targets = []
    for group in ("backend", "frontend"):
        target = os.readlink(root / group / "current")
        if not RELEASE_PATTERN.fullmatch(target):
            raise ValueError("Invalid active release link")
        targets.append(target)
    if targets[0] != targets[1]:
        raise ValueError("Backend and frontend releases differ")
    verify_services(root, "backend", "clucky-backend", BACKEND)
    verify_services(root, "frontend", "clucky-frontend", FRONTEND)
    return RELEASE_PATTERN.fullmatch(targets[0]).group(1)


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("VPS root is required")
        print(deployed_commit(sys.argv[1]))
    except (OSError, ValueError, KeyError, TypeError, RuntimeError,
            subprocess.TimeoutExpired, json.JSONDecodeError):
        # Never print Docker inspect output, which can contain private env vars.
        sys.exit(1)
