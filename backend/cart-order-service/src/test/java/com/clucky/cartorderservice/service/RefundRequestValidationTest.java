package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.dto.CreateRefundRequest;
import com.clucky.cartorderservice.dto.UpdateBankDetailsRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RefundRequestValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void createRefundRequestDeserializesJsonAliasesCorrectly() throws Exception {
        String json = """
                {
                  "orderId": 100,
                  "reason": "Customer cancelled order",
                  "bankBin": "970436",
                  "bankName": "Vietcombank",
                  "accountNumber": "0011001234567",
                  "accountHolderName": "NGUYEN VAN A"
                }
                """;
        var request = mapper.readValue(json, CreateRefundRequest.class);

        assertEquals(100L, request.orderId());
        assertEquals("Customer cancelled order", request.reason());
        assertEquals("970436", request.bankBin());
        assertEquals("Vietcombank", request.bankName());
        assertEquals("0011001234567", request.bankAccountNo());
        assertEquals("NGUYEN VAN A", request.bankAccountName());

        var violations = validator.validate(request);
        assertTrue(violations.isEmpty(), "Expected valid DTO, got: " + violations);
    }

    @Test
    void updateBankDetailsRequestDeserializesJsonAliasesCorrectly() throws Exception {
        String json = """
                {
                  "bankBin": "970436",
                  "bankName": "Vietcombank",
                  "accountNumber": "0011001234567",
                  "accountHolderName": "NGUYEN VAN A",
                  "expectedBankDetailsVersion": 2
                }
                """;
        var request = mapper.readValue(json, UpdateBankDetailsRequest.class);

        assertEquals("970436", request.bankBin());
        assertEquals("Vietcombank", request.bankName());
        assertEquals("0011001234567", request.bankAccountNo());
        assertEquals("NGUYEN VAN A", request.bankAccountName());
        assertEquals(2, request.expectedBankDetailsVersion());

        var violations = validator.validate(request);
        assertTrue(violations.isEmpty(), "Expected valid DTO, got: " + violations);
    }

    @Test
    void validationRejectsInvalidBankBinOrAccountNo() {
        var invalidBin = new CreateRefundRequest(1L, "reason", "12345", "VCB", "123456", "NAME");
        assertFalse(validator.validate(invalidBin).isEmpty());

        var invalidAlphaBin = new CreateRefundRequest(1L, "reason", "VCB123", "VCB", "123456", "NAME");
        assertFalse(validator.validate(invalidAlphaBin).isEmpty());

        var invalidAccountNo = new CreateRefundRequest(1L, "reason", "970436", "VCB", "123-456-abc", "NAME");
        assertFalse(validator.validate(invalidAccountNo).isEmpty());

        var valid = new CreateRefundRequest(1L, "reason", "970436", "VCB", "1234567890", "NAME");
        assertTrue(validator.validate(valid).isEmpty());
    }
}

