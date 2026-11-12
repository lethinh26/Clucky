import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from prepare import prepare, validate_environment


class BackendEnvironmentTest(unittest.TestCase):
    def test_report_policy_requires_explicit_supported_selection(self):
        for policy in ("false", "order.completed", "payment.confirmed"):
            values = validate_environment(json.dumps({**self.values, "REPORT_REVENUE_EVENT": policy}))
            self.assertEqual(policy, values["REPORT_REVENUE_EVENT"])
        with self.assertRaises(ValueError):
            validate_environment(json.dumps({**self.values, "REPORT_REVENUE_EVENT": "first-arrival"}))

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / "secrets").mkdir()
        (self.root / "secrets/firebase-service-account.json").write_text(json.dumps({"project_id": "clucky-test"}))
        self.release = "a" * 40 + "-100-1"
        self.values = {
            "POSTGRES_PASSWORD": "database-test-credential-123",
            "JWT_SECRET": "jwt-test-credential-at-least-32-bytes-123",
            "FRONTEND_CUSTOMER_URL": "https://customer.test",
            "FRONTEND_ADMIN_URL": "https://admin.test",
        }

    def test_private_environment_derives_firebase_and_preserves_literal_values(self):
        self.values["POSTGRES_PASSWORD"] = 'database$literal#value="123"'
        prepare(self.root, self.release, json.dumps(self.values))
        target = self.root / "backend/incoming" / self.release / "runtime.env"
        content = target.read_text()
        self.assertIn("AUTH_COOKIE_SECURE='true'", content)
        self.assertIn("FIREBASE_PROJECT_ID='clucky-test'", content)
        revision = hashlib.sha256((self.root / "secrets/firebase-service-account.json").read_bytes()).hexdigest()
        self.assertIn("FIREBASE_CREDENTIAL_REVISION='" + revision + "'", content)
        self.assertIn("POSTGRES_PASSWORD='" + self.values["POSTGRES_PASSWORD"] + "'", content)
        if os.name == "posix":
            self.assertEqual(target.stat().st_mode & 0o777, 0o600)

    def test_missing_frontend_urls_are_derived_from_vps_host_and_written_to_runtime(self):
        settings = {key: value for key, value in self.values.items() if not key.startswith("FRONTEND_")}
        with patch.dict(os.environ, {"VPS_HOST": "192.0.2.10"}):
            values = validate_environment(json.dumps(settings))
            self.assertEqual(values["FRONTEND_CUSTOMER_URL"], "http://192.0.2.10")
            self.assertEqual(values["FRONTEND_ADMIN_URL"], "http://192.0.2.10:8081")
            self.assertEqual(values["AUTH_COOKIE_SECURE"], "false")
            prepare(self.root, self.release, json.dumps(settings))
        content = (self.root / "backend/incoming" / self.release / "runtime.env").read_text()
        self.assertIn("FRONTEND_CUSTOMER_URL='http://192.0.2.10'", content)
        self.assertIn("FRONTEND_ADMIN_URL='http://192.0.2.10:8081'", content)

    def test_explicit_domains_override_host_and_empty_origin_uses_default(self):
        with patch.dict(os.environ, {"VPS_HOST": "new-vps.test"}):
            values = validate_environment(json.dumps(self.values))
            self.assertEqual(values["FRONTEND_CUSTOMER_URL"], "https://customer.test")
            self.assertEqual(values["FRONTEND_ADMIN_URL"], "https://admin.test")
            self.assertEqual(values["AUTH_COOKIE_SECURE"], "true")
            values = validate_environment(json.dumps({**self.values, "FRONTEND_ADMIN_URL": ""}))
            self.assertEqual(values["FRONTEND_CUSTOMER_URL"], "https://customer.test")
            self.assertEqual(values["FRONTEND_ADMIN_URL"], "http://new-vps.test:8081")
            self.assertEqual(values["AUTH_COOKIE_SECURE"], "false")

    def test_url_defaults_reject_missing_host_and_host_injection(self):
        settings = {key: value for key, value in self.values.items() if not key.startswith("FRONTEND_")}
        for host in ("", "https://vps.test", "vps.test:8686", "vps.test/path", "user@vps.test", "vps.test\nINJECTED=true", "vps.test'", " vps.test"):
            with self.subTest(host=host), patch.dict(os.environ, {"VPS_HOST": host}):
                with self.assertRaisesRegex(ValueError, "VPS_HOST"):
                    validate_environment(json.dumps(settings))

    def test_preflight_uses_vps_host_without_exposing_it(self):
        settings = {key: value for key, value in self.values.items() if not key.startswith("FRONTEND_")}
        command = [sys.executable, str(Path(__file__).with_name("prepare.py")), "--validate"]
        result = subprocess.run(command, input=json.dumps(settings), text=True, capture_output=True,
                                env={**os.environ, "VPS_HOST": "192.0.2.10"}, cwd=self.root)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("192.0.2.10", result.stdout + result.stderr)
        self.assertFalse((self.root / "backend").exists())

    def test_mapbox_geocoding_token_is_written_to_backend_environment(self):
        for token in ("pk.test-geocoding", "sk.test-geocoding"):
            with self.subTest(token_type=token[:3]):
                prepare(self.root, self.release, json.dumps({**self.values, "MAPBOX_GEOCODING_TOKEN": token}))
                content = (self.root / "backend/incoming" / self.release / "runtime.env").read_text()
                self.assertIn(f"MAPBOX_GEOCODING_TOKEN='{token}'", content)

    def test_mapbox_geocoding_token_rejects_invalid_values(self):
        for token in ("not-a-mapbox-token", "pk.", " pk.test", "pk.test ", "sk.test token"):
            with self.subTest(token=token):
                with self.assertRaisesRegex(ValueError, "MAPBOX_GEOCODING_TOKEN"):
                    validate_environment(json.dumps({**self.values, "MAPBOX_GEOCODING_TOKEN": token}))

    def test_shared_secret_keeps_frontend_mapbox_tokens_out_of_backend_runtime(self):
        settings = {**self.values, "MAPBOX_GEOCODING_TOKEN": "sk.server-mapbox",
                    "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN": "pk.customer-mapbox", "VITE_MAPBOX_ACCESS_TOKEN": "pk.admin-mapbox"}
        values = validate_environment(json.dumps(settings))
        self.assertEqual(values["NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"], "pk.customer-mapbox")
        self.assertEqual(values["VITE_MAPBOX_ACCESS_TOKEN"], "pk.admin-mapbox")
        prepare(self.root, self.release, json.dumps(settings))
        content = (self.root / "backend/incoming" / self.release / "runtime.env").read_text()
        self.assertIn("MAPBOX_GEOCODING_TOKEN='sk.server-mapbox'", content)
        for name in ("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", "VITE_MAPBOX_ACCESS_TOKEN"):
            self.assertNotIn(name, content)
            self.assertNotIn(settings[name], content)

    def test_frontend_mapbox_tokens_cannot_contain_secrets_or_whitespace(self):
        for name in ("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", "VITE_MAPBOX_ACCESS_TOKEN"):
            for token in ("sk.private-value", "pk.", " pk.test", "pk.test ", "pk.test token"):
                with self.subTest(name=name, token=token):
                    with self.assertRaisesRegex(ValueError, name):
                        validate_environment(json.dumps({**self.values, name: token}))

    def test_retired_service_tokens_are_not_accepted_as_deployment_configuration(self):
        for name in ("CATALOG_SERVICE_TOKEN", "PROMOTION_SERVICE_TOKEN", "LOYALTY_INTERNAL_TOKEN"):
            with self.subTest(name=name):
                with self.assertRaisesRegex(ValueError, "unsupported keys"):
                    validate_environment(json.dumps({**self.values, name: "unused-credential"}))

    def test_invalid_values_do_not_replace_existing_environment(self):
        prepare(self.root, self.release, json.dumps(self.values))
        target = self.root / "backend/incoming" / self.release / "runtime.env"
        original = target.read_text()
        for change in ({"JWT_SECRET": "short"}, {"POSTGRES_PASSWORD": "a'quoted-password-123456"},
                       {"JAVA_TOOL_OPTIONS": "untrusted"}, {"FRONTEND_CUSTOMER_URL": "https://customer.test/path"},
                       {"POSTGRES_PASSWORD": "line\nbreak"}, {"MAIL_SENDER_ENABLED": "true"}):
            with self.assertRaises(ValueError):
                prepare(self.root, self.release, json.dumps({**self.values, **change}))
            self.assertEqual(target.read_text(), original)
        with self.assertRaises(ValueError):
            prepare(self.root, "../../outside", json.dumps(self.values))

    def test_preflight_reports_only_safe_field_names_without_writing_files(self):
        command = [sys.executable, str(Path(__file__).with_name("prepare.py")), "--validate"]
        cases = (
            ({"JWT_SECRET": "private-value"}, "JWT_SECRET"),
            ({"AUTH_COOKIE_SECURE": True}, "AUTH_COOKIE_SECURE"),
            ({"private-key": "private-value"}, "unsupported keys"),
            ({"FRONTEND_CUSTOMER_URL": "https://[private-value"}, "FRONTEND_CUSTOMER_URL"),
            ({"MAIL_SENDER_ENABLED": "true"}, "MAIL_SENDER_USERNAME"),
            ({"MAPBOX_GEOCODING_TOKEN": "private-value"}, "MAPBOX_GEOCODING_TOKEN"),
            ({"NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN": "sk.private-value"}, "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"),
            ({"VITE_MAPBOX_ACCESS_TOKEN": "sk.private-value"}, "VITE_MAPBOX_ACCESS_TOKEN"),
        )
        for change, expected in cases:
            result = subprocess.run(command, input=json.dumps({**self.values, **change}), text=True,
                                    capture_output=True, cwd=self.root)
            self.assertEqual(result.returncode, 1)
            self.assertIn(expected, result.stderr)
            self.assertNotIn("private-value", result.stdout + result.stderr)
            self.assertNotIn("private-key", result.stdout + result.stderr)
        result = subprocess.run(command, input=json.dumps(self.values), text=True,
                                capture_output=True, cwd=self.root)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.root / "backend").exists())

    @unittest.skipUnless(os.name == "posix", "VPS release symlinks")
    def test_database_identity_cannot_change_during_redeployment(self):
        prepare(self.root, self.release, json.dumps(self.values))
        releases = self.root / "backend/releases"
        releases.mkdir()
        (self.root / "backend/incoming" / self.release).rename(releases / self.release)
        (self.root / "backend/current").symlink_to("releases/" + self.release)
        next_release = "b" * 40 + "-101-1"
        with self.assertRaises(ValueError):
            prepare(self.root, next_release, json.dumps({**self.values, "POSTGRES_PASSWORD": "different-database-password"}))
        prepare(self.root, next_release, json.dumps(self.values))
        self.assertTrue((self.root / "backend/incoming" / next_release / "runtime.env").is_file())


if __name__ == "__main__":
    unittest.main()
