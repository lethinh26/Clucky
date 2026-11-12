import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).parent / "backend"))
from prepare import validate_environment

BACKEND = (
    "config-server", "discovery-server", "identity-service", "catalog-store-service",
    "cart-order-service", "payment-service", "promotion-loyalty-service", "shipping-service",
    "notification-service", "review-report-service", "audit-service", "api-gateway",
)
FRONTEND = {"customer": "nextjs", "admin": "react"}
IMAGE_PATTERN = r"ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+/[a-z0-9-]+:input-[a-f0-9]{64}"


def build_args(service, environment, backend):
    if service in BACKEND:
        return {"SERVICE_NAME": service}
    if service == "admin":
        return {"VITE_API_URL": environment.get("PUBLIC_API_URL", ""),
                "VITE_MAPBOX_ACCESS_TOKEN": backend.get("VITE_MAPBOX_ACCESS_TOKEN", "")}
    if service != "customer":
        raise ValueError("Unknown image service")
    return {
        "NEXT_PUBLIC_API_URL": environment.get("PUBLIC_API_URL", ""),
        "NEXT_PUBLIC_FIREBASE_API_KEY": environment.get("FIREBASE_API_KEY", ""),
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN": environment.get("FIREBASE_AUTH_DOMAIN", ""),
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID": environment.get("FIREBASE_PROJECT_ID", ""),
        "NEXT_PUBLIC_M3_DEMO_ENABLED": environment.get("CUSTOMER_DEMO_ENABLED", "false"),
        "NEXT_PUBLIC_PAYMENT_SIMULATION_ENABLED": "false",
        "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN": backend.get("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", ""),
    }


def fingerprint(service, files, arguments, refresh=""):
    selected = {}
    for name, object_id in files.items():
        include = name in ("deploy/images.py", ".github/workflows/frontend-ci.yml")
        if service in BACKEND:
            include |= name in ("deploy/backend/Dockerfile", "deploy/backend/runtime.Dockerfile")
            if name.startswith("backend/"):
                component = name.split("/")[1]
                include |= component not in BACKEND or component == service or name.endswith(".gradle")
        else:
            include |= name.startswith(f"frontend/{FRONTEND[service]}/")
        if include:
            selected[name] = object_id
    return hashlib.sha256(json.dumps([selected, arguments, refresh], sort_keys=True).encode()).hexdigest()


def image_digest(image, required=False):
    if not re.fullmatch(IMAGE_PATTERN, image):
        raise ValueError("Invalid registry image reference")
    result = subprocess.run(["docker", "buildx", "imagetools", "inspect", image], capture_output=True, text=True)
    match = re.search(r"^Digest:\s+(sha256:[a-f0-9]{64})\s*$", result.stdout, re.MULTILINE)
    if result.returncode == 0 and match:
        return match[1]
    if required:
        raise ValueError(f"Cannot resolve published image: {image}")
    return None


def plan():
    repository = os.environ["GITHUB_REPOSITORY"].lower()
    if not re.fullmatch(r"[a-z0-9_.-]+/[a-z0-9_.-]+", repository):
        raise ValueError("Invalid repository")
    backend = validate_environment(os.environ["BACKEND_ENV_JSON"])
    for name in ("FIREBASE_API_KEY", "FIREBASE_AUTH_DOMAIN", "FIREBASE_PROJECT_ID"):
        if not os.environ.get(name):
            raise ValueError(f"Set {name} before deploying")
    if not all(backend.get(name) for name in ("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", "VITE_MAPBOX_ACCESS_TOKEN")):
        raise ValueError("Set both public Mapbox tokens before deploying")
    entries = subprocess.check_output(["git", "ls-tree", "-rz", "HEAD"]).decode().split("\0")
    files = {entry.split("\t", 1)[1]: entry.split("\t", 1)[0] for entry in entries if entry}
    configuration = subprocess.check_output(["git", "rev-parse", "HEAD:config-repo"], text=True).strip()
    images = {}
    builds = []
    for service in (*FRONTEND, *BACKEND):
        arguments = build_args(service, os.environ, backend)
        if any(any(ord(char) < 32 for char in value) for value in arguments.values()):
            raise ValueError("Build arguments cannot contain control characters")
        key = fingerprint(service, files, arguments, os.environ.get("IMAGE_CACHE_EPOCH", ""))
        image = f"ghcr.io/{repository}/{service}:input-{key}"
        digest = image_digest(image)
        images[service] = {"image": image, "digest": digest, "arguments": arguments}
        if digest is None:
            builds.append(service)
        print(f"{service}: {'reuse' if digest else 'build'}")
    Path("release-plan.json").write_text(json.dumps({"images": images, "configuration": configuration, "builds": builds}) + "\n")
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
        output.write(f"builds={json.dumps(list(range(len(builds))))}\n")
        output.write(f"release_id={os.environ['RELEASE_ID']}\n")

def select_build(index):
    release = json.loads(Path("release-plan.json").read_text())
    if not index.isdecimal() or int(index) >= len(release["builds"]):
        raise ValueError("Invalid build index")
    service = release["builds"][int(index)]
    if service not in (*BACKEND, *FRONTEND):
        raise ValueError("Unknown image service")
    image = release["images"][service]["image"]
    if not re.fullmatch(IMAGE_PATTERN, image):
        raise ValueError("Invalid registry image reference")
    context = "backend" if service in BACKEND else f"frontend/{FRONTEND[service]}"
    dockerfile = "deploy/backend/runtime.Dockerfile" if service in BACKEND else f"{context}/Dockerfile"
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
        for name, value in {"service": service, "context": context, "dockerfile": dockerfile, "image": image}.items():
            output.write(f"{name}={value}\n")


def bundle():
    release = json.loads(Path("release-plan.json").read_text())
    if set(release["images"]) != set(BACKEND) | set(FRONTEND):
        raise ValueError("Release must contain every service")
    configuration = release["configuration"]
    if not re.fullmatch(r"[a-f0-9]{40}", configuration):
        raise ValueError("Invalid configuration revision")
    services = {}
    for service, record in release["images"].items():
        if not re.fullmatch(IMAGE_PATTERN, record["image"]):
            raise ValueError("Invalid registry image reference")
        digest = record["digest"] or image_digest(record["image"], required=True)
        if not re.fullmatch(r"sha256:[a-f0-9]{64}", digest):
            raise ValueError("Invalid image digest")
        services[service] = {"image": record["image"].split(":")[0] + "@" + digest}
        if service in BACKEND:
            services[service]["labels"] = {"com.clucky.configuration": configuration}
    services["config-server"]["volumes"] = [
        f"${{VPS_WORKDIR}}/backend/configs/{configuration}:/config-repo:ro"
    ]
    services["identity-service"]["labels"]["com.clucky.firebase-credential"] = "${FIREBASE_CREDENTIAL_REVISION:?Credential revision is required}"
    for directory, names in (("backend-bundle", BACKEND), ("bundle", FRONTEND)):
        Path(directory).mkdir(exist_ok=True)
        Path(directory, "images.json").write_text(json.dumps({"services": {name: services[name] for name in names}}, indent=2) + "\n")
    Path("backend-bundle/configuration-revision").write_text(configuration + "\n")


if __name__ == "__main__":
    if sys.argv[1:] == ["plan"]:
        plan()
    elif sys.argv[1:] == ["bundle"]:
        bundle()
    elif len(sys.argv) == 3 and sys.argv[1] == "select":
        select_build(sys.argv[2])
    elif len(sys.argv) == 3 and sys.argv[1] == "args":
        service = sys.argv[2]
        arguments = json.loads(Path("release-plan.json").read_text())["images"][service]["arguments"]
        if set(arguments) != set(build_args(service, {}, {})) or any(
            not isinstance(value, str) or any(ord(char) < 32 for char in value)
            for value in arguments.values()
        ):
            raise ValueError("Invalid build arguments in release plan")
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
            output.write("args<<CLUCKY_BUILD_ARGS\n")
            output.write("\n".join(f"{name}={value}" for name, value in arguments.items()))
            output.write("\nCLUCKY_BUILD_ARGS\n")
    else:
        sys.exit("Usage: images.py plan | bundle | select INDEX | args SERVICE")
