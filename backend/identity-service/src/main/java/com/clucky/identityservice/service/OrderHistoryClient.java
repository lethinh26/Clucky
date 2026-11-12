package com.clucky.identityservice.service;

import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class OrderHistoryClient {
    private final RestClient client;
    public OrderHistoryClient(RestClient.Builder builder) {
        this.client = builder.baseUrl("http://cart-order-service").build();
    }
    public JsonNode getCustomerOrders(Long customerId, int page, int size) {
        try {
            JsonNode body = client.get().uri(uri -> uri.path("/api/orders/internal/customer-history")
                    .queryParam("customerId", customerId).queryParam("page", page).queryParam("size", size).build())
                    .retrieve().onStatus(HttpStatusCode::isError, (req, res) -> {
                        throw new UpstreamStatusException(res.getStatusCode().value());
                    }).body(JsonNode.class);
            if (body == null) throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            return body;
        } catch (UpstreamStatusException e) {
            throw new ApiException(ErrorCode.fromStatus(e.status));
        } catch (RestClientException e) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
    }
    private static final class UpstreamStatusException extends RuntimeException {
        final int status; UpstreamStatusException(int status) { this.status = status; }
    }
}
