import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from release_probe import deployed_commit, verify_services


class ProductionProbeTest(unittest.TestCase):
    def test_probe_accepts_only_matching_healthy_digest_and_labels(self):
        image = "ghcr.io/example/clucky/customer@sha256:" + "b" * 64
        revision = "c" * 40
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            manifest = root / "frontend/current/images.json"
            manifest.parent.mkdir(parents=True)
            manifest.write_text(json.dumps({"services": {
                "customer": {
                    "image": image,
                    "labels": {"com.clucky.configuration": revision,
                               "com.clucky.firebase-credential": "${FIREBASE_CREDENTIAL_REVISION:?required}"},
                },
            }}), encoding="utf-8")
            container = {
                "Config": {
                    "Image": image,
                    "Labels": {
                        "com.docker.compose.service": "customer",
                        "com.clucky.configuration": revision,
                    },
                },
                "State": {"Health": {"Status": "healthy"}},
            }

            def docker_response(*args):
                if args[0] == "ps":
                    return "id1\n"
                self.assertEqual(args, ("inspect", "id1"))
                return json.dumps([container])

            with patch("release_probe.docker_output", side_effect=docker_response):
                verify_services(root, "frontend", "clucky-frontend", ("customer",))
                for field, updated in (
                    ("Image", "ghcr.io/example/clucky/customer@sha256:" + "d" * 64),
                    ("Image", "ghcr.io/example/clucky/customer:latest"),
                    ("Health", "unhealthy"),
                    ("Config", "incorrect-revision"),
                ):
                    with self.subTest(field=field, updated=updated):
                        original_image = container["Config"]["Image"]
                        original_health = container["State"]["Health"]["Status"]
                        original_revision = container["Config"]["Labels"]["com.clucky.configuration"]
                        if field == "Image":
                            container["Config"]["Image"] = updated
                        elif field == "Health":
                            container["State"]["Health"]["Status"] = updated
                        else:
                            container["Config"]["Labels"]["com.clucky.configuration"] = updated
                        with self.assertRaises(RuntimeError):
                            verify_services(root, "frontend", "clucky-frontend", ("customer",))
                        container["Config"]["Image"] = original_image
                        container["State"]["Health"]["Status"] = original_health
                        container["Config"]["Labels"]["com.clucky.configuration"] = original_revision

            manifest.write_text(json.dumps({"services": {
                "customer": {"image": "ghcr.io/example/clucky/customer:latest"},
            }}), encoding="utf-8")
            with patch("release_probe.docker_output", side_effect=docker_response):
                with self.assertRaises(ValueError):
                    verify_services(root, "frontend", "clucky-frontend", ("customer",))

    def test_mismatched_backend_frontend_links_fail_open(self):
        base = "a" * 40
        same = "releases/" + base + "-100-1"
        previous = "releases/" + base + "-99-1"
        with patch("release_probe.os.readlink", side_effect=[same, previous]):
            with patch("release_probe.verify_services") as verify:
                with self.assertRaises(ValueError):
                    deployed_commit("/opt/clucky")
                verify.assert_not_called()
        with patch("release_probe.os.readlink", side_effect=[same, same]):
            with patch("release_probe.verify_services") as verify:
                self.assertEqual(deployed_commit("/opt/clucky"), base)
                self.assertEqual(verify.call_count, 2)


if __name__ == "__main__":
    unittest.main()
