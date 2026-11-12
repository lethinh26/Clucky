SET search_path TO payment_service, public;

-- V5: Seed counter payment receipts and sample bank transactions for shift cash register
INSERT INTO counter_payment_receipts (
    id, receipt_code, order_id, order_code, queue_number, store_id,
    method, total_due, cash_amount, cash_tendered, cash_change, rounding_difference,
    bank_amount_declared, bank_amount_reconciled, bank_ref_code, bank_tx_id,
    status, manual_acceptance, discrepancy_amount, exception_reason,
    staff_id, staff_name, print_count, idempotency_key, version,
    created_at, updated_at
) VALUES
 (10, 'REC-POS-0012', 12, 'CLK-POS-0012', 12, 1,
  'CASH', 218000, 218000, 220000, 2000, 0,
  0, 0, NULL, NULL,
  'RECONCILED', FALSE, 0, NULL,
  3, 'Nguyễn Văn Thu Ngân', 1, 'IDEM-REC-CLK-POS-0012', 0,
  now() - interval '10 minutes', now() - interval '10 minutes'),

 (11, 'REC-POS-0013', 13, 'CLK-POS-0013', 13, 1,
  'BANK_TRANSFER', 129000, 0, 0, 0, 0,
  129000, 129000, 'CLK-POS-0013', 'MB-TX-88801',
  'RECONCILED', FALSE, 0, NULL,
  3, 'Nguyễn Văn Thu Ngân', 1, 'IDEM-REC-CLK-POS-0013', 0,
  now() - interval '5 minutes', now() - interval '5 minutes'),

 (12, 'REC-POS-0014', 14, 'CLK-POS-0014', 14, 1,
  'CASH', 164000, 164000, 200000, 36000, 0,
  0, 0, NULL, NULL,
  'RECONCILED', FALSE, 0, NULL,
  3, 'Nguyễn Văn Thu Ngân', 1, 'IDEM-REC-CLK-POS-0014', 0,
  now() - interval '2 minutes', now() - interval '2 minutes'),

 (13, 'REC-POS-0015', 15, 'CLK-POS-0015', 15, 1,
  'BANK_TRANSFER', 329000, 0, 0, 0, 0,
  329000, 0, 'CLK-POS-0015', NULL,
  'PENDING_RECONCILIATION', TRUE, 0, 'Khách đã đưa xem giao dịch thành công trên app ngân hàng',
  3, 'Nguyễn Văn Thu Ngân', 1, 'IDEM-REC-CLK-POS-0015', 0,
  now() - interval '3 minutes', now() - interval '3 minutes'),

 (14, 'REC-POS-0016', 16, 'CLK-POS-0016', 16, 1,
  'CASH', 144000, 144000, 150000, 6000, 0,
  0, 0, NULL, NULL,
  'RECONCILED', FALSE, 0, NULL,
  3, 'Nguyễn Văn Thu Ngân', 2, 'IDEM-REC-CLK-POS-0016', 0,
  now() - interval '20 minutes', now() - interval '20 minutes'),

 (15, 'REC-POS-0017', 17, 'CLK-POS-0017', 17, 1,
  'SPLIT', 129000, 50000, 50000, 0, 0,
  79000, 79000, 'CLK-POS-0017', 'MB-TX-88802',
  'RECONCILED', FALSE, 0, NULL,
  3, 'Nguyễn Văn Thu Ngân', 3, 'IDEM-REC-CLK-POS-0017', 0,
  now() - interval '35 minutes', now() - interval '35 minutes')
ON CONFLICT (id) DO NOTHING;

-- Seed Bank Transactions
INSERT INTO bank_transactions (
    id, bank_tx_id, bank_account, amount, content, received_at, matched_order_code, raw_payload
) VALUES
 (10, 'MB-TX-88801', '0387654321', 129000, 'CLU-POS-0013', now() - interval '5 minutes', 'CLK-POS-0013', '{"provider":"MBBank","channel":"QR"}'::jsonb),
 (11, 'MB-TX-88802', '0387654321', 79000, 'CLU-POS-0017', now() - interval '35 minutes', 'CLK-POS-0017', '{"provider":"MBBank","channel":"QR"}'::jsonb),
 (12, 'MB-TX-88803', '0387654321', 329000, 'THANH TOAN CLU-POS-0015', now() - interval '1 minute', NULL, '{"provider":"MBBank","channel":"APP"}'::jsonb),
 (13, 'MB-TX-88804', '0387654321', 50000, 'CK KHONG RO NOI DUNG', now() - interval '15 minutes', NULL, '{"provider":"MBBank","channel":"IBANK"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('payment_service.counter_payment_receipts', 'id'), COALESCE((SELECT MAX(id) FROM payment_service.counter_payment_receipts), 1));
SELECT setval(pg_get_serial_sequence('payment_service.bank_transactions', 'id'), COALESCE((SELECT MAX(id) FROM payment_service.bank_transactions), 1));
