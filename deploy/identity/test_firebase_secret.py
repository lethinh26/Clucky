import json
import os
from pathlib import Path
import tempfile
import unittest

from firebase_secret import install


class FirebaseSecretTest(unittest.TestCase):
    def test_private_install_rotation_and_invalid_input_preserve_old_credential(self):
        credential = {
            "type": "service_account",
            "project_id": "clucky-test",
            "client_email": "test@clucky-test.iam.gserviceaccount.com",
            "private_key": "-----BEGIN PRIVATE KEY-----\ntest-placeholder\n-----END PRIVATE KEY-----\n",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        with tempfile.TemporaryDirectory() as root:
            install(root, json.dumps(credential))
            directory = Path(root) / "secrets"
            target = directory / "firebase-service-account.json"
            self.assertEqual(json.loads(target.read_text()), credential)
            self.assertIn("FIREBASE_PROJECT_ID=clucky-test", (directory / "firebase.env").read_text())
            if os.name == "posix":
                self.assertEqual(directory.stat().st_mode & 0o777, 0o700)
                self.assertEqual(target.stat().st_mode & 0o777, 0o600)
                self.assertEqual((directory / "firebase.env").stat().st_mode & 0o777, 0o600)
            for invalid in ("not-json", "[]", json.dumps({**credential, "project_id": "another-project"}),
                            json.dumps({**credential, "token_uri": "https://untrusted.example/token"})):
                with self.assertRaises(ValueError):
                    install(root, invalid)
                self.assertEqual(json.loads(target.read_text()), credential)
            credential["private_key_id"] = "rotated-test-key"
            install(root, json.dumps(credential))
            self.assertEqual(json.loads(target.read_text()), credential)
            self.assertEqual({path.name for path in directory.iterdir()}, {"firebase.env", "firebase-service-account.json"})

    @unittest.skipUnless(os.name == "posix", "VPS symlink protection")
    def test_symlink_directory_cannot_redirect_the_secret(self):
        with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as outside:
            (Path(root) / "secrets").symlink_to(outside, target_is_directory=True)
            credential = {
                "type": "service_account", "project_id": "clucky-test",
                "client_email": "test@clucky-test.iam.gserviceaccount.com",
                "private_key": "-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
            with self.assertRaises(ValueError):
                install(root, json.dumps(credential))
            self.assertEqual(list(Path(outside).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
