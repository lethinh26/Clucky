package com.clucky.auditservice;

import org.junit.jupiter.api.Test;

class AuditSelfCheckTest {
    @Test
    void enforcesScopeAndRedactsSensitiveDetails() throws Exception {
        AuditSelfCheck.main(new String[0]);
    }
}
