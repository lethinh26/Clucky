import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("replay", Path(__file__).with_name("replay-kafka-dlt.py"))
replay = importlib.util.module_from_spec(spec)
spec.loader.exec_module(replay)


class ReplayCheck(unittest.TestCase):
    def test_preserves_identity_and_rejects_unsafe_input(self):
        event = {"eventId": "original-id", "correlationId": "original-trace", "eventType": "payment.confirmed",
                 "sourceService": "payment-service", "occurredAt": "2026-11-10T00:00:00Z", "payload": {"orderId": 10, "amount": 200000}}
        record = {"sourceTopic": event["eventType"], "sourceKey": "10", "event": event}
        raw = json.dumps(record).encode()
        metadata, topic, line = replay.prepare(raw)
        self.assertEqual(topic, "payment.confirmed")
        self.assertEqual(metadata["eventId"], "original-id")
        self.assertEqual(json.loads(line.split("\t", 2)[2]), event)
        self.assertIn("X-Correlation-ID:original-trace",line)
        self.assertFalse(metadata["sourceVerified"])
        original = {**event, "payload": {**event["payload"], "paidAt": "2026-11-09T20:00:00Z", "items": [{"productId": 1}]}}
        source = json.dumps(original, separators=(",", ":")).encode()
        record["sha256"] = replay.hashlib.sha256(source).hexdigest()
        verified, _, full_line = replay.prepare(json.dumps(record).encode(),source)
        self.assertTrue(verified["sourceVerified"])
        self.assertEqual(full_line.split("\t",2)[2].rstrip("\n").encode(),source)
        with self.assertRaises(ValueError):
            replay.prepare(json.dumps(record).encode(),b"{}")
        for patch in ({"replayable": False}, {"sourceTopic": "unexpected"}, {"sourceKey": "10\nsecret"}):
            with self.assertRaises(ValueError):
                replay.prepare(json.dumps({**record, **patch}).encode())
        event["payload"]["secret"] = "must-not-pass"
        with self.assertRaises(ValueError):
            replay.prepare(json.dumps(record).encode())


if __name__ == "__main__":
    unittest.main()
