import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from images import BACKEND, FRONTEND, build_args, bundle, fingerprint, image_digest


class ImageInputsTest(unittest.TestCase):
    def setUp(self):
        self.files = {
            "backend/build.gradle": "shared",
            "backend/identity-service/build.gradle": "identity-build",
            "backend/identity-service/src/Auth.java": "identity",
            "backend/payment-service/src/Payment.java": "payment",
            "frontend/nextjs/app/page.tsx": "customer",
            "frontend/react/src/App.tsx": "admin",
            "deploy/backend/runtime.Dockerfile": "dockerfile",
            "config-repo/application.yml": "configuration",
        }

    def test_only_changed_component_is_invalidated(self):
        changed = {**self.files, "backend/payment-service/src/Payment.java": "new"}
        for service in ("identity-service", "customer", "admin"):
            self.assertEqual(fingerprint(service, self.files, {}), fingerprint(service, changed, {}))
        self.assertNotEqual(fingerprint("payment-service", self.files, {}), fingerprint("payment-service", changed, {}))

    def test_shared_build_changes_invalidate_backend(self):
        for path in ("backend/build.gradle", "backend/identity-service/build.gradle", "deploy/backend/runtime.Dockerfile"):
            changed = {**self.files, path: "new"}
            self.assertNotEqual(fingerprint("payment-service", self.files, {}), fingerprint("payment-service", changed, {}))
            self.assertEqual(fingerprint("customer", self.files, {}), fingerprint("customer", changed, {}))

    def test_deleted_files_and_reverts_do_not_depend_on_previous_deploy(self):
        changed = dict(self.files)
        del changed["frontend/nextjs/app/page.tsx"]
        original = fingerprint("customer", self.files, {})
        self.assertNotEqual(original, fingerprint("customer", changed, {}))
        self.assertEqual(original, fingerprint("customer", dict(self.files), {}))

    def test_build_arguments_and_cache_epoch_invalidate_images(self):
        original = fingerprint("customer", self.files, {"NEXT_PUBLIC_API_URL": "/api"})
        self.assertNotEqual(original, fingerprint("customer", self.files, {"NEXT_PUBLIC_API_URL": "https://api.test"}))
        self.assertNotEqual(original, fingerprint("customer", self.files, {"NEXT_PUBLIC_API_URL": "/api"}, "refresh"))

    def test_runtime_configuration_does_not_rebuild_image(self):
        changed = {**self.files, "config-repo/application.yml": "new"}
        self.assertEqual(fingerprint("identity-service", self.files, {}), fingerprint("identity-service", changed, {}))

    def test_public_arguments_are_scoped_to_the_frontend(self):
        environment = {"FIREBASE_API_KEY": "public-key", "PUBLIC_API_URL": "/api"}
        backend = {"NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN": "pk.customer", "VITE_MAPBOX_ACCESS_TOKEN": "pk.admin"}
        self.assertEqual(build_args("identity-service", environment, backend), {"SERVICE_NAME": "identity-service"})
        self.assertNotIn("NEXT_PUBLIC_FIREBASE_API_KEY", build_args("admin", environment, backend))
        self.assertEqual(build_args("customer", environment, backend)["NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"], "pk.customer")

    def test_registry_digest_must_exist_before_activation(self):
        image = "ghcr.io/owner/clucky/customer:input-" + "a" * 64
        with patch("images.subprocess.run") as run:
            run.return_value.returncode = 1
            run.return_value.stdout = ""
            self.assertIsNone(image_digest(image))
            with self.assertRaises(ValueError):
                image_digest(image, required=True)
            run.return_value.returncode = 0
            run.return_value.stdout = "Digest: sha256:" + "b" * 64 + "\n"
            self.assertEqual(image_digest(image), "sha256:" + "b" * 64)
        with self.assertRaises(ValueError):
            image_digest("ghcr.io/owner/clucky/customer:latest")

    def test_release_pins_all_services_and_stable_configuration_mount(self):
        plan = {
            "images": {service: {"image": f"ghcr.io/owner/clucky/{service}:input-" + "a" * 64,
                                  "digest": "sha256:" + "b" * 64} for service in (*BACKEND, *FRONTEND)},
            "configuration": "c" * 40,
        }
        previous = Path.cwd()
        with tempfile.TemporaryDirectory() as temporary:
            try:
                os.chdir(temporary)
                Path("release-plan.json").write_text(json.dumps(plan))
                with patch("images.image_digest") as lookup:
                    bundle()
                    lookup.assert_not_called()
                backend = json.loads(Path("backend-bundle/images.json").read_text())["services"]
                frontend = json.loads(Path("bundle/images.json").read_text())["services"]
                self.assertEqual(set(backend), set(BACKEND))
                self.assertEqual(set(frontend), set(FRONTEND))
                self.assertIn("@sha256:", backend["payment-service"]["image"])
                self.assertEqual(backend["config-server"]["volumes"], ["${VPS_WORKDIR}/backend/configs/" + "c" * 40 + ":/config-repo:ro"])
                self.assertIn("FIREBASE_CREDENTIAL_REVISION", backend["identity-service"]["labels"]["com.clucky.firebase-credential"])
                plan["images"]["customer"]["image"] = "untrusted:latest"
                Path("release-plan.json").write_text(json.dumps(plan))
                with self.assertRaises(ValueError):
                    bundle()
            finally:
                os.chdir(previous)


if __name__ == "__main__":
    unittest.main()
