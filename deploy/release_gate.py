"""Skip an already-deployed documentation-only push; fail open to deployment."""

import os
from pathlib import Path
import re
import subprocess
import tempfile


COMMIT_PATTERN = re.compile(r"[0-9a-f]{40}\Z")
DOC_FILES = {"README.md", "START.md", "AGENTS.md", "CONTEXT.md"}
DOC_DIRECTORIES = ("docs/", "architechture/docs/", "architechture/diagrams/")
WORKDIR_PATTERN = re.compile(r"/([A-Za-z0-9_-][A-Za-z0-9._-]*/)*[A-Za-z0-9_-][A-Za-z0-9._-]*\Z")


def documentation_only(paths):
    """Classify only known non-runtime documentation locations as docs."""
    return bool(paths) and all(
        path in DOC_FILES or any(path.startswith(prefix) for prefix in DOC_DIRECTORIES)
        for path in paths
    )


def run(args, *, timeout=30, input=None):
    try:
        return subprocess.run(args, input=input, capture_output=True, timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return None


def changed_files(base, head):
    """Compare complete Git trees, including multi-commit pushes and deletions."""
    if not COMMIT_PATTERN.fullmatch(base) or not COMMIT_PATTERN.fullmatch(head):
        return None
    if base == "0" * 40 or head == "0" * 40:
        return None
    known = run(["git", "cat-file", "-e", f"{base}^{{commit}}"])
    if known is None or known.returncode:
        fetched = run(["git", "fetch", "--no-tags", "--depth=1", "origin", base], timeout=45)
        if fetched is None or fetched.returncode:
            return None
    diff = run(["git", "diff", "--no-renames", "--name-only", "-z", base, head, "--"])
    if diff is None or diff.returncode:
        return None
    # Git paths are byte sequences. An undecodable path is not safely classified
    # as documentation, so return None and keep the production release.
    try:
        paths = diff.stdout.decode("utf-8").split("\0")
    except UnicodeDecodeError:
        return None
    return [path for path in paths if path]


def active_release(environment):
    """Verify live image digests, health and release links through pinned SSH."""
    host = environment.get("VPS_HOST", "")
    user = environment.get("VPS_USER", "")
    port = environment.get("VPS_PORT", "8686")
    root = environment.get("VPS_WORKDIR", "/opt/clucky")
    key = environment.get("SSH_PRIVATE_KEY", "")
    hosts = environment.get("SSH_KNOWN_HOSTS", "")
    if not (
        re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.-]*", host)
        and re.fullmatch(r"[a-z_][a-z0-9_-]*", user)
        and port.isdecimal() and 1 <= int(port) <= 65535
        and WORKDIR_PATTERN.fullmatch(root) and key and hosts
    ):
        return None

    # Send the audited read-only probe over stdin; install nothing on the VPS.
    # The workdir is validated above before interpolation into the command.
    command = f"python3 - '{root}'"
    probe = Path(__file__).with_name("release_probe.py").read_bytes()
    with tempfile.TemporaryDirectory() as temporary:
        identity = Path(temporary) / "ssh_key"
        known_hosts = Path(temporary) / "known_hosts"
        # Restrict secret material at creation, matching the deploy job's
        # umask 077 rather than narrowing permissions after the write.
        for destination, content in ((identity, key), (known_hosts, hosts)):
            handle = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(handle, "w", encoding="utf-8") as output:
                output.write(content.replace("\r", "").rstrip("\n") + "\n")
        result = run([
            "ssh", "-p", port, "-i", str(identity),
            "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes",
            "-o", "StrictHostKeyChecking=yes",
            "-o", f"UserKnownHostsFile={known_hosts}",
            "-o", "ConnectTimeout=10", "-o", "ServerAliveInterval=10",
            "-o", "ServerAliveCountMax=2",
            f"{user}@{host}", command,
        ], timeout=45, input=probe)

    if result is None or result.returncode:
        return None
    try:
        revision = result.stdout.decode("utf-8").strip()
    except UnicodeDecodeError:
        return None
    return revision if COMMIT_PATTERN.fullmatch(revision) else None


def should_deploy(event, before, head, environment=None):
    """Manual dispatch and any uncertain state always keep the release path."""
    if event != "push":
        return True
    current_change = changed_files(before, head)
    if not documentation_only(current_change):
        return True

    deployed_sha = active_release(environment or os.environ)
    if deployed_sha is None:
        return True
    pending_changes = changed_files(deployed_sha, head)
    # An empty diff means production already contains the desired tree.
    return pending_changes is None or (bool(pending_changes) and not documentation_only(pending_changes))


def main():
    event = os.environ.get("GITHUB_EVENT_NAME", "")
    before = os.environ.get("PUSH_BEFORE", "")
    head = os.environ.get("GITHUB_SHA", "")
    try:
        deploy = should_deploy(event, before, head)
    except Exception:
        # Gating is an optimization. Any unexpected probe failure must leave
        # the existing production deployment and backup path available.
        deploy = True
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
        output.write(f"should_deploy={'true' if deploy else 'false'}\n")
    print(
        "Production release required; retaining image planning and backup."
        if deploy else "Documentation-only push matches active production; skip release and database backup."
    )


if __name__ == "__main__":
    main()
