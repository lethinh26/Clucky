import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

from release_gate import active_release, changed_files, documentation_only, should_deploy


class ReleaseGateTest(unittest.TestCase):
    def test_only_known_documentation_paths_can_skip_deployment(self):
        self.assertTrue(documentation_only([
            "README.md", "START.md", "AGENTS.md", "docs/setup.md",
            "architechture/docs/requirements.md", "architechture/diagrams/network.png",
        ]))
        for changed in ([], ["backend/identity-service/src/Auth.java"],
                        ["config-repo/application.yml"], [".github/workflows/frontend-ci.yml"],
                        ["frontend/nextjs/public/README.md"],
                        ["docs/setup.md", "deploy/backend/compose.yml"],
                        ["architechture/database/schema.sql"]):
            with self.subTest(changed=changed):
                self.assertFalse(documentation_only(changed))

    def test_git_diff_covers_multiple_commits_and_non_documentation(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)

            def git(*args):
                return subprocess.check_output(
                    ["git", *args], cwd=root, stderr=subprocess.DEVNULL,
                ).decode().strip()

            git("init", "-q")
            git("config", "user.name", "CI Test")
            git("config", "user.email", "ci@example.invalid")
            (root / "README.md").write_text("initial", encoding="utf-8")
            git("add", ".")
            git("commit", "-qm", "baseline")
            baseline = git("rev-parse", "HEAD")

            (root / "README.md").write_text("documentation", encoding="utf-8")
            git("add", ".")
            git("commit", "-qm", "docs update")
            docs_commit = git("rev-parse", "HEAD")

            previous = Path.cwd()
            try:
                os.chdir(root)
                self.assertEqual(changed_files(baseline, docs_commit), ["README.md"])
                self.assertTrue(documentation_only(changed_files(baseline, docs_commit)))

                (root / "backend").mkdir()
                (root / "backend" / "feature.java").write_text("class Feature {}", encoding="utf-8")
                git("add", ".")
                git("commit", "-qm", "backend update")
                code_commit = git("rev-parse", "HEAD")
                self.assertEqual(set(changed_files(baseline, code_commit)), {"README.md", "backend/feature.java"})
                self.assertFalse(documentation_only(changed_files(baseline, code_commit)))
            finally:
                os.chdir(previous)

    def test_docs_push_skips_only_when_active_release_has_no_pending_code(self):
        previous = "a" * 40
        current = "b" * 40
        deployed = "c" * 40
        with patch("release_gate.changed_files", side_effect=[
            ["README.md"], ["README.md", "docs/guide.md"],
        ]) as diff, patch("release_gate.active_release", return_value=deployed) as active:
            self.assertFalse(should_deploy("push", previous, current))
            self.assertEqual(diff.call_count, 2)
            active.assert_called_once()

        with patch("release_gate.changed_files", side_effect=[
            ["README.md"], ["README.md", "backend/payment-service/src/Payment.java"],
        ]):
            with patch("release_gate.active_release", return_value=deployed):
                self.assertTrue(should_deploy("push", previous, current))

    def test_explicit_dispatch_and_unverified_states_always_deploy(self):
        with patch("release_gate.changed_files") as diff, patch("release_gate.active_release") as active:
            self.assertTrue(should_deploy("workflow_dispatch", "", "a" * 40))
            diff.assert_not_called()
            active.assert_not_called()

        for change in (None, [], ["config-repo/application.yml"],
                       [".github/workflows/frontend-ci.yml"]):
            with self.subTest(change=change), patch("release_gate.changed_files", return_value=change):
                with patch("release_gate.active_release") as active:
                    self.assertTrue(should_deploy("push", "a" * 40, "b" * 40))
                    active.assert_not_called()

        with patch("release_gate.changed_files", return_value=["docs/guide.md"]):
            with patch("release_gate.active_release", return_value=None):
                self.assertTrue(should_deploy("push", "a" * 40, "b" * 40))

        with patch("release_gate.changed_files", side_effect=[["README.md"], None]):
            with patch("release_gate.active_release", return_value="c" * 40):
                self.assertTrue(should_deploy("push", "a" * 40, "b" * 40))

    def test_remote_requires_pinned_ssh_and_verified_probe(self):
        env = {
            "VPS_HOST": "example.org", "VPS_USER": "deploy", "VPS_PORT": "8686",
            "VPS_WORKDIR": "/opt/clucky",
            "SSH_PRIVATE_KEY": "test-private-key", "SSH_KNOWN_HOSTS": "verified-host",
        }
        with patch("release_gate.run", return_value=SimpleNamespace(
                returncode=0, stdout=("a" * 40 + "\n").encode()
        )) as ssh:
            self.assertEqual(active_release(env), "a" * 40)
            command = ssh.call_args.args[0]
            self.assertIn("StrictHostKeyChecking=yes", command)
            self.assertTrue(any("UserKnownHostsFile=" in part for part in command))
            self.assertEqual(command[-1], "python3 - '/opt/clucky'")
            self.assertIn(b"verify_services", ssh.call_args.kwargs["input"])

        for output in ("unverified\n", "a" * 40 + "\nerror"):
            with self.subTest(output=output), patch("release_gate.run", return_value=SimpleNamespace(
                    returncode=0, stdout=output.encode()
            )):
                self.assertIsNone(active_release(env))
        with patch("release_gate.run", return_value=SimpleNamespace(returncode=1, stdout=b"")):
            self.assertIsNone(active_release(env))
        self.assertIsNone(active_release({**env, "VPS_HOST": "bad;host"}))
        self.assertIsNone(active_release({**env, "SSH_KNOWN_HOSTS": ""}))

    def test_main_emits_gate_output_for_both_paths(self):
        from release_gate import main

        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "github-output"
            environment = {
                "GITHUB_OUTPUT": str(output),
                "GITHUB_EVENT_NAME": "push",
                "PUSH_BEFORE": "a" * 40,
                "GITHUB_SHA": "b" * 40,
            }
            with patch.dict(os.environ, environment), patch(
                "release_gate.should_deploy", return_value=False
            ):
                main()
            self.assertEqual(output.read_text(), "should_deploy=false\n")
            with patch.dict(os.environ, environment), patch(
                "release_gate.should_deploy", return_value=True
            ):
                main()
            with patch.dict(os.environ, environment), patch(
                "release_gate.should_deploy", side_effect=RuntimeError("unavailable")
            ):
                main()
            self.assertEqual(
                output.read_text(),
                "should_deploy=false\nshould_deploy=true\nshould_deploy=true\n",
            )


if __name__ == "__main__":
    unittest.main()
