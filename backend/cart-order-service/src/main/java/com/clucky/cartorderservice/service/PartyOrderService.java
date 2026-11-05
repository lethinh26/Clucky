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

import java.time.LocalDate;

@Service
public class PartyOrderService {
    private static final Logger LOG = LoggerFactory.getLogger(PartyOrderService.class);

    private final PartyOrderRepository partyOrderRepository;
    private final AccessGuard accessGuard;

    public PartyOrderService(PartyOrderRepository partyOrderRepository, AccessGuard accessGuard) {
        this.partyOrderRepository = partyOrderRepository;
        this.accessGuard = accessGuard;
    }

    @Transactional
    public PartyOrderResponse createPartyOrder(CreatePartyOrderRequest request) {
        if (request.expectedDate() == null || !request.expectedDate().isAfter(LocalDate.now())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.CUSTOMER) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        Long customerId = actor.userId();

        PartyOrder entity = new PartyOrder();
        entity.setCustomerId(customerId);
        entity.setStoreId(request.storeId());
        entity.setContactName(request.contactName().trim());
        entity.setPhone(request.phone().trim());
        entity.setExpectedDate(request.expectedDate());
        entity.setGuestCount(request.guestCount());
        entity.setContent(request.content().trim());
        entity.setStatus(PartyOrderStatus.NEW.name());

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

        entity.setStatus(target);
        entity = partyOrderRepository.save(entity);

        LOG.info("event=party_order_status_updated id={} storeId={} from={} to={} note={}",
                entity.getId(), entity.getStoreId(), current, target, request.note());

        return DomainMapper.toResponse(entity);
    }
}
