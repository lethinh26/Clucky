package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.exception.ResourceNotFoundException;
import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.exception.ErrorCode;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Verifies the target is an existing, active, verified CUSTOMER in Identity.
 * This uses the existing trusted Identity-to-Loyalty contact resolution API,
 * avoiding an orphan wallet for an arbitrary/future numeric user ID.
 */
@Component
public class AdminCustomerProof {
    private final RestClient identity;
    private final InternalServiceCredential credentials;
    private final String baseUrl;

    public AdminCustomerProof(@LoadBalanced RestClient.Builder builder,
            InternalServiceCredential credentials,
            @Value("${clucky.identity.service-url:http://identity-service}") String baseUrl) {
        this.identity = builder.build();
        this.credentials = credentials;
        this.baseUrl = baseUrl;
    }

    public record Contacts(String phoneKey, String emailKey, long phoneBindingVersion) {}

    public void verify(long customerId) {
        try {
            Contacts result = identity.post()
                    .uri(baseUrl + "/internal/identity/loyalty-contacts/resolve")
                    .headers(headers -> headers.setBearerAuth(credentials.token()))
                    .body(Map.of("customerId", customerId))
                    .retrieve().body(Contacts.class);
            if (result == null || (result.phoneKey() == null && result.emailKey() == null)) {
                throw new ResourceNotFoundException("Verified customer does not exist");
            }
        } catch (HttpClientErrorException.NotFound failure) {
            throw new ResourceNotFoundException("Customer not found");
        } catch (RestClientException failure) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
    }
}
