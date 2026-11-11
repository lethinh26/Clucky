package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class VoucherStoreVerifier {
    private final RestClient client;
    private final String url;
    public VoucherStoreVerifier(@LoadBalanced RestClient.Builder builder,
            @Value("${clucky.catalog.service-url:http://catalog-store-service}") String url) {
        this.client = builder.build(); this.url = url;
    }
    public record Store(Long id) {}
    public void requireExists(Long storeId) {
        if (storeId == null || storeId <= 0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        try {
            var store = client.get().uri(url + "/api/stores/" + storeId).retrieve().body(Store.class);
            if (store == null || !storeId.equals(store.id())) throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        } catch (RestClientResponseException failure) {
            if (failure.getStatusCode().value() == 404) throw new ApiException(ErrorCode.VALIDATION_ERROR);
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        } catch (ApiException failure) { throw failure;
        } catch (Exception failure) { throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE); }
    }
}
