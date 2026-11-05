import json
import os
from pathlib import Path
import tempfile
import unittest

from prepare import prepare


class BackendEnvironmentTest(unittest.TestCase):
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
        self.assertIn("POSTGRES_PASSWORD='" + self.values["POSTGRES_PASSWORD"] + "'", content)
        if os.name == "posix":
            self.assertEqual(target.stat().st_mode & 0o777, 0o600)

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
