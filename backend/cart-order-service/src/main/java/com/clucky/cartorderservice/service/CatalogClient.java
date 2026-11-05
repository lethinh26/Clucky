package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.cart.CartItemDto;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;

@Component
public class CatalogClient {
    private static final Logger LOG = LoggerFactory.getLogger(CatalogClient.class);

    private final RestClient restClient;
    private final String catalogServiceUrl;

    public CatalogClient(
            RestClient restClient,
            @Value("${clucky.catalog.service-url:http://catalog-store-service}") String catalogServiceUrl
    ) {
        this.restClient = restClient;
        this.catalogServiceUrl = catalogServiceUrl;
    }

    public record ValidateItemRequest(
            Long productId,
            Long comboId,
            Integer quantity,
            List<Long> optionIds,
            List<Long> toppingIds
    ) {}

    public record CatalogValidationRequest(
            Long storeId,
            List<ValidateItemRequest> items
    ) {}

    public record ValidatedCatalogItem(
            Long productId,
            Long comboId,
            String name,
            BigDecimal unitPrice,
            BigDecimal extraPrice,
            Integer quantity,
            BigDecimal lineTotal,
            boolean available,
            String reason
    ) {}

    public record CatalogValidationResponse(
            boolean valid,
            boolean storeOpen,
            String message,
            BigDecimal subtotal,
            List<ValidatedCatalogItem> items
    ) {}

    public CatalogValidationResponse validateItems(Long storeId, List<CartItemDto> items) {
        if (storeId == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "storeId is required");
        }
        if (items == null || items.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Cart items cannot be empty");
        }

        List<ValidateItemRequest> itemRequests = items.stream().map(it -> new ValidateItemRequest(
                it.getProductId(),
                it.getComboId(),
                it.getQuantity() != null ? it.getQuantity() : 1,
                it.getOptionIds() != null ? it.getOptionIds() : List.of(),
                it.getToppingIds() != null ? it.getToppingIds() : List.of()
        )).toList();

        CatalogValidationRequest requestBody = new CatalogValidationRequest(storeId, itemRequests);

        try {
            CatalogValidationResponse response = restClient.post()
                    .uri(catalogServiceUrl + "/api/catalog/internal/validate-items")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(CatalogValidationResponse.class);

            if (response == null) {
                LOG.error("Catalog service returned null response for storeId={}", storeId);
                throw new ApiException(ErrorCode.INTERNAL_ERROR, "Dịch vụ danh mục phản hồi không hợp lệ");
            }

            return response;
        } catch (ApiException e) {
            throw e;
        } catch (Exception ex) {
            LOG.warn("Failed to reach catalog service at {}: {}", catalogServiceUrl, ex.getMessage());
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE, "Không thể kết nối đến dịch vụ Catalog để xác minh giá và tồn kho");
        }
    }
}
