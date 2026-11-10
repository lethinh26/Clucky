import argparse
import datetime
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess


TOPICS = {
    "order.created": "cart-order-service", "order.status-changed": "cart-order-service",
    "order.completed": "cart-order-service", "order.cancelled": "cart-order-service",
    "order.payment-resolved": "cart-order-service", "payment.received": "payment-service",
    "payment.confirmed": "payment-service", "payment.failed": "payment-service",
}
TOKEN = re.compile(r"[A-Za-z0-9._-]{1,160}\Z")
FIELDS = set("orderId orderCode customerId storeId paymentId collectionId operationType actorId actorRole orderVersion amount receivedAmount totalAmount cashAmount declaredTransfer expiresAt status previousStatus paymentStatus decision reason paymentExpired orderDecisionFinal outcome type method paymentMethod shippingFee receiverName receiverPhone deliveryAddress latitude longitude customerName customerEmail email statDate".split())


def unique_object(pairs):
    result = {}
    for name, value in pairs:
        if name in result:
            raise ValueError("Duplicate JSON property")
        result[name] = value
    return result


def prepare(raw, source=None):
    if len(raw) > 1_000_000:
        raise ValueError("DLT record too large")
    record = json.loads(raw, object_pairs_hook=unique_object)
    if not isinstance(record, dict) or record.get("replayable") is False:
        raise ValueError("This quarantine record requires source investigation, not automatic replay")
    topic, key, event = record.get("sourceTopic"), record.get("sourceKey"), record.get("event")
    if not isinstance(topic, str) or topic not in TOPICS or not isinstance(event, dict):
        raise ValueError("Unsupported replay topic or missing event")
    if not isinstance(key, str) or not re.fullmatch(r"[A-Za-z0-9._:-]{1,160}", key):
        raise ValueError("Original aggregate key required")
    if event.get("eventType") != topic or event.get("sourceService") != TOPICS[topic]:
        raise ValueError("Event source/type mismatch")
    if set(event) != {"eventId", "correlationId", "eventType", "sourceService", "occurredAt", "payload"}:
        raise ValueError("Incomplete or unexpected event envelope")
    for field in ("eventId", "correlationId"):
        if not isinstance(event[field], str) or not TOKEN.fullmatch(event[field]):
            raise ValueError("Original event and correlation identity required")
    timestamp = datetime.datetime.fromisoformat(event["occurredAt"].replace("Z", "+00:00"))
    if timestamp.tzinfo is None:
        raise ValueError("Event timestamp must include timezone")
    payload = event["payload"]
    if not isinstance(payload, dict) or not set(payload).issubset(FIELDS):
        raise ValueError("Only the quarantined allowlisted payload can be replayed")
    if any(isinstance(value, (dict, list)) for value in payload.values()):
        raise ValueError("Unexpected nested payload")
    if type(payload.get("orderId")) is not int or payload["orderId"] <= 0 or key != str(payload["orderId"]):
        raise ValueError("Order identity must match the original aggregate key")
    encoded = json.dumps(event, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    metadata = {name: record.get(name) for name in ("sourceTopic", "partition", "offset", "consumerService", "sha256")}
    metadata.update(eventId=event["eventId"], correlationId=event["correlationId"], fileSha256=hashlib.sha256(raw).hexdigest())
    metadata["sourceVerified"] = False
    if source is not None:
        if len(source) > 1_000_000:
            raise ValueError("Original event too large")
        if hashlib.sha256(source).hexdigest() != record.get("sha256"):
            source = source.rstrip(b"\r\n")
        if hashlib.sha256(source).hexdigest() != record.get("sha256"):
            raise ValueError("Original Kafka value does not match the quarantine hash")
        original = json.loads(source, object_pairs_hook=unique_object)
        if not isinstance(original, dict) or any(original.get(field) != event[field] for field in event if field != "payload"):
            raise ValueError("Original envelope does not match quarantine identity")
        if not isinstance(original.get("payload"), dict) or any(original["payload"].get(field) != value for field, value in payload.items()):
            raise ValueError("Original payload does not match quarantine evidence")
        encoded = source.decode("utf-8")
        if "\n" in encoded or "\r" in encoded:
            raise ValueError("Original producer value must be a single JSON line; do not reformat it")
        metadata["sourceVerified"] = True
    headers = "X-Correlation-ID:" + event["correlationId"] + ",X-Event-ID:" + event["eventId"]
    return metadata, topic, headers + "\t" + key + "\t" + encoded + "\n"


def main():
    parser = argparse.ArgumentParser(description="Dry-run by default. Replays ONE sanitized DLT record, preserving original identities.")
    parser.add_argument("record", type=Path)
    parser.add_argument("--publish", action="store_true")
    parser.add_argument("--expected-sha256")
    parser.add_argument("--reason")
    parser.add_argument("--source-record", type=Path, help="Original Kafka value; its SHA-256 must match DLT. Required for publish.")
    parser.add_argument("--container", default="clucky-local-kafka-1")
    parser.add_argument("--bootstrap", default="kafka:29092")
    parser.add_argument("--audit", type=Path, default=Path("secrets/kafka-replay-audit.jsonl"))
    args = parser.parse_args()
    try:
        with args.record.open("rb") as source:
            raw = source.read(1_000_001)
        original = None
        if args.source_record:
            with args.source_record.open("rb") as source:
                original = source.read(1_000_001)
        metadata, topic, line = prepare(raw, original)
        if not args.publish:
            print(json.dumps({"mode": "DRY_RUN", **metadata}, ensure_ascii=False))
            return
        if args.expected_sha256 != metadata["fileSha256"] or not args.reason or not 1 <= len(args.reason.strip()) <= 500:
            raise ValueError("Publish requires the dry-run file hash and a reason (1..500 characters)")
        if not metadata["sourceVerified"]:
            raise ValueError("Never publish a partial sanitized envelope; original source value is required")
        if args.audit.resolve() == args.record.resolve():
            raise ValueError("Audit path must not overwrite the DLT source")
        if args.audit.resolve() == args.source_record.resolve():
            raise ValueError("Audit path must not overwrite the original source")
        args.audit.parent.mkdir(parents=True, exist_ok=True)
        metadata.update(operator=getpass.getuser(), reason=args.reason.strip(), at=datetime.datetime.now(datetime.timezone.utc).isoformat())
        with args.audit.open("a", encoding="utf-8") as audit:
            def record_outcome(outcome):
                audit.write(json.dumps({**metadata, "outcome": outcome}, ensure_ascii=False) + "\n")
                audit.flush()
                os.fsync(audit.fileno())
            record_outcome("REQUESTED")
            try:
                result = subprocess.run(["docker", "exec", "-i", args.container, "/opt/kafka/bin/kafka-console-producer.sh",
                    "--bootstrap-server", args.bootstrap, "--topic", topic, "--sync", "--property", "parse.key=true", "--property", "parse.headers=true",
                    "--property", "key.separator=\t", "--producer-property", "acks=all", "--producer-property", "enable.idempotence=true"],
                    input=line, text=True, encoding="utf-8", capture_output=True, timeout=45, check=False)
                if result.returncode != 0 or "ERROR" in result.stderr:
                    raise RuntimeError("Producer did not confirm publication")
                record_outcome("BROKER_ACKNOWLEDGED")
            except (OSError, subprocess.SubprocessError, RuntimeError):
                record_outcome("UNKNOWN_REVIEW_BEFORE_RETRY")
                raise RuntimeError("Publication not confirmed. Inspect audit and consumer state before retrying the same event.") from None
        print("Broker acknowledged one replay. Consumer business outcome still requires readback.")
    except (OSError, ValueError, TypeError, AttributeError, RuntimeError):
        parser.exit(1, "Replay refused or not confirmed. Inspect the local input, arguments and audit; no payload/credentials printed.\n")


if __name__ == "__main__":
    main()
