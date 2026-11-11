package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.AccessGuard;
import com.clucky.cartorderservice.config.CurrentActor;
import com.clucky.cartorderservice.dto.CreatePartyOrderRequest;
import com.clucky.cartorderservice.dto.PageResponse;
import com.clucky.cartorderservice.dto.PartyOrderStatus;
import com.clucky.cartorderservice.dto.PartyOrderResponse;
import com.clucky.cartorderservice.dto.Role;
import com.clucky.cartorderservice.dto.UpdatePartyOrderStatusRequest;
import com.clucky.cartorderservice.entity.PartyOrder;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.mapper.DomainMapper;
import com.clucky.cartorderservice.repository.PartyOrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClientException;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class PartyOrderService {
    private static final Logger LOG = LoggerFactory.getLogger(PartyOrderService.class);

    private final PartyOrderRepository partyOrderRepository;
    private final AccessGuard accessGuard;
    private final RestClient restClient;
    private final String catalogServiceUrl;

    public PartyOrderService(PartyOrderRepository partyOrderRepository, AccessGuard accessGuard,
            RestClient restClient,
            @Value("${clucky.catalog.service-url:http://catalog-store-service}") String catalogServiceUrl) {
        this.partyOrderRepository = partyOrderRepository;
        this.accessGuard = accessGuard;
        this.restClient = restClient;
        this.catalogServiceUrl = catalogServiceUrl;
    }

    @Transactional
    public PartyOrderResponse createPartyOrder(CreatePartyOrderRequest request) {
        if (request.expectedDate() == null || !request.expectedDate().isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")))) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.CUSTOMER) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        Long customerId = actor.userId();
        try {
            JsonNode store = restClient.get().uri(catalogServiceUrl + "/api/stores/{id}", request.storeId())
                    .retrieve().body(JsonNode.class);
            if (store == null || store.path("id").asLong() != request.storeId()
                    || !"OPEN".equals(store.path("status").asText())) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Chi nhánh không còn nhận yêu cầu đặt tiệc");
            }
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 404) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        } catch (RestClientException ex) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        }

        PartyOrder entity = new PartyOrder();
        entity.setCustomerId(customerId);
        entity.setStoreId(request.storeId());
        entity.setContactName(request.contactName().trim());
        entity.setPhone(request.phone().trim());
        entity.setContactEmail(request.contactEmail().trim());
        entity.setExpectedDate(request.expectedDate());
        entity.setExpectedTime(request.expectedTime());
        entity.setGuestCount(request.guestCount());
        entity.setPackageCode(request.packageCode());
        entity.setContent(request.content().trim());
        entity.setStatus(PartyOrderStatus.NEW.name());
        entity.setUpdatedAt(java.time.Instant.now());

        entity = partyOrderRepository.save(entity);
        LOG.info("event=party_order_created id={} customerId={} storeId={}",
                entity.getId(), customerId, entity.getStoreId());

        return DomainMapper.toResponse(entity);
    }

    public PageResponse<PartyOrderResponse> getMyPartyOrders(Pageable pageable) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.CUSTOMER) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        Page<PartyOrder> page = partyOrderRepository.findByCustomerIdOrderByIdDesc(actor.userId(), pageable);
        return PageResponse.from(page.map(DomainMapper::toResponse));
    }

    public PageResponse<PartyOrderResponse> getStorePartyOrders(Long storeId, String status, Pageable pageable) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STAFF && actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        Long effectiveStoreId = accessGuard.effectiveStore(storeId);
        String normalizedStatus = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : null;

        Page<PartyOrder> page = partyOrderRepository.findPartyOrders(effectiveStoreId, normalizedStatus, pageable);
        return PageResponse.from(page.map(DomainMapper::toResponse));
    }

    public PartyOrderResponse getPartyOrderById(Long id) {
        PartyOrder entity = partyOrderRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        CurrentActor actor = CurrentActor.require();
        if (actor.role() == Role.ADMIN) {
            return DomainMapper.toResponse(entity);
        }

        if (actor.role() == Role.CUSTOMER) {
            if (entity.getCustomerId() == null || !entity.getCustomerId().equals(actor.userId())) {
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
            return DomainMapper.toResponse(entity);
        }

        if (actor.role() == Role.STAFF || actor.role() == Role.STORE_MANAGER) {
            accessGuard.requireStore(entity.getStoreId());
            return DomainMapper.toResponse(entity);
        }

        throw new ApiException(ErrorCode.FORBIDDEN);
    }

    @Transactional
    public PartyOrderResponse updateStatus(Long id, UpdatePartyOrderStatusRequest request) {
        PartyOrder entity = partyOrderRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        accessGuard.requireStore(entity.getStoreId());

        String current = entity.getStatus() != null ? entity.getStatus().toUpperCase() : "NEW";
        String target = request.status().trim().toUpperCase();

        if (current.equals(target)) {
            return DomainMapper.toResponse(entity);
        }

        boolean valid = switch (current) {
            case "NEW" -> "CONTACTED".equals(target) || "CANCELLED".equals(target);
            case "CONTACTED" -> "QUOTED".equals(target) || "CANCELLED".equals(target);
            case "QUOTED" -> "CONFIRMED".equals(target) || "CANCELLED".equals(target);
            case "CONFIRMED" -> "CLOSED".equals(target) || "CANCELLED".equals(target);
            default -> false;
        };

        if (!valid) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        String note = request.note() == null ? "" : request.note().trim();
        if (("CONTACTED".equals(target) || "QUOTED".equals(target) || "CANCELLED".equals(target)) && note.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Cần ghi chú nội dung liên hệ hoặc lý do thay đổi");
        }
        if ("QUOTED".equals(target)) {
            if (request.quoteAmount() == null || request.quoteAmount().signum() <= 0
                    || request.quoteAmount().stripTrailingZeros().scale() > 0
                    || request.quoteAmount().compareTo(new java.math.BigDecimal("999999999999")) > 0
                    || request.paymentMethod() == null
                    || !java.util.Set.of("BANK_TRANSFER", "CASH").contains(request.paymentMethod())) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "Báo giá phải có số tiền và phương thức thanh toán hợp lệ");
            }
            entity.setQuoteAmount(request.quoteAmount());
            entity.setPaymentMethod(request.paymentMethod());
        }
        if ("CONFIRMED".equals(target) && (entity.getQuoteAmount() == null || entity.getPaymentMethod() == null)) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        if (!note.isBlank()) entity.setConsultationNote(note);

        entity.setStatus(target);
        entity.setUpdatedAt(java.time.Instant.now());
        entity = partyOrderRepository.save(entity);

        LOG.info("event=party_order_status_updated id={} storeId={} from={} to={}",
                entity.getId(), entity.getStoreId(), current, target);

        return DomainMapper.toResponse(entity);
    }
}
