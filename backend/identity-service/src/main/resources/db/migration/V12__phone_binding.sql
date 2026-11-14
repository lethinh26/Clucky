-- V11 has already been deployed; extend the existing opaque Bridge challenge
-- table rather than altering its applied migration.
ALTER TABLE identity_service.sms_otp_challenges
  DROP CONSTRAINT IF EXISTS sms_otp_challenges_purpose_check;
ALTER TABLE identity_service.sms_otp_challenges
  ADD CONSTRAINT sms_otp_challenges_purpose_check
    CHECK (purpose IN ('REGISTER', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'PHONE_BIND'));

-- Stop duplicate ownership of the same Vietnamese number in either historical
-- 0xxxxxxxxx format or canonical +84xxxxxxxxx E.164 format.
CREATE UNIQUE INDEX users_phone_canonical_unique
  ON identity_service.users ((
    CASE WHEN phone ~ '^0[0-9]{9}$'
      THEN '+84' || substring(phone FROM 2)
      ELSE phone
    END
  ))
  WHERE phone IS NOT NULL AND phone <> '';
