package com.clucky.identityservice.dto.auth;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** Client's explicit acknowledgement of two exact published revisions. */
public record LegalConsentRequest(
        @NotNull @AssertTrue Boolean accepted,
        @NotNull @Positive Integer termsVersion,
        @NotNull @Positive Integer privacyVersion
) {}
