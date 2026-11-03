package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.cart.CartDto;
import com.clucky.cartorderservice.cart.CartItemDto;
import com.clucky.cartorderservice.cart.CartService;
import com.clucky.cartorderservice.config.AccessGuard;
import com.clucky.cartorderservice.config.CurrentActor;
import com.clucky.cartorderservice.config.RedisConfig;
import com.clucky.cartorderservice.dto.*;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.OrderItem;
import com.clucky.cartorderservice.entity.OrderStatusHistory;
import com.clucky.cartorderservice.entity.RefundRequest;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.mapper.DomainMapper;
import com.clucky.cartorderservice.repository.OrderItemRepository;
import com.clucky.cartorderservice.repository.OrderRepository;
import com.clucky.cartorderservice.repository.OrderStatusHistoryRepository;
import com.clucky.cartorderservice.repository.RefundRequestRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {
    private static final Logger LOG = LoggerFactory.getLogger(OrderService.class);
    private static final BigDecimal DEFAULT_SHIPPING_FEE = new BigDecimal("20000");
    private static final BigDecimal POINTS_CONVERSION_RATE = new BigDecimal("1000");

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final CartService cartService;
    private final AccessGuard accessGuard;
    private final ObjectMapper objectMapper;
    private final OrderEventPublisher orderEventPublisher;
    private final Random random = new SecureRandom();

    public OrderService(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            OrderStatusHistoryRepository orderStatusHistoryRepository,
            RefundRequestRepository refundRequestRepository,
            CartService cartService,
            AccessGuard accessGuard,
            ObjectMapper objectMapper,
            OrderEventPublisher orderEventPublisher
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
        this.refundRequestRepository = refundRequestRepository;
        this.cartService = cartService;
        this.accessGuard = accessGuard;
        this.objectMapper = objectMapper;
        this.orderEventPublisher = orderEventPublisher;
    }

    public OrderPreviewResponse previewOrder(OrderPreviewRequest request, HttpServletRequest httpRequest) {
        List<CartItemDto> items = resolvePreviewItems(request, httpRequest);
        if (items.isEmpty()) {
            return new OrderPreviewResponse(
                    BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO,
                    BigDecimal.ZERO, BigDecimal.ZERO, false, null, List.of()
            );
        }

        BigDecimal subtotal = items.stream()
                .map(it -> {
                    BigDecimal unitPrice = it.getUnitPrice() != null ? it.getUnitPrice() : BigDecimal.ZERO;
                    int qty = it.getQuantity() != null ? it.getQuantity() : 1;
                    return unitPrice.multiply(BigDecimal.valueOf(qty));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String type = request.type() != null ? request.type().trim().toUpperCase() : "DELIVERY";
        BigDecimal shippingFee = "PICKUP".equalsIgnoreCase(type) ? BigDecimal.ZERO : DEFAULT_SHIPPING_FEE;

        VoucherCalculation voucherCalc = calculateVoucher(request.voucherCode(), subtotal, shippingFee);
        BigDecimal discountAmount = voucherCalc.discountAmount();

        int pointsUsed = (request.pointsUsed() != null && request.pointsUsed() > 0) ? request.pointsUsed() : 0;
        BigDecimal pointsAmount = BigDecimal.valueOf(pointsUsed).multiply(POINTS_CONVERSION_RATE);

        BigDecimal beforePoints = subtotal.subtract(discountAmount).add(shippingFee);
        if (beforePoints.compareTo(BigDecimal.ZERO) < 0) {
            beforePoints = BigDecimal.ZERO;
        }

        if (pointsAmount.compareTo(beforePoints) > 0) {
            pointsAmount = beforePoints;
            pointsUsed = pointsAmount.divide(POINTS_CONVERSION_RATE).intValue();
        }

        BigDecimal totalAmount = beforePoints.subtract(pointsAmount);
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            totalAmount = BigDecimal.ZERO;
        }

        return new OrderPreviewResponse(
                subtotal,
                discountAmount,
                pointsUsed,
                pointsAmount,
                shippingFee,
                totalAmount,
                voucherCalc.valid(),
                voucherCalc.message(),
                items
        );
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        Long customerId = CurrentActor.require().userId();

        String userCartKey = RedisConfig.key("cart", customerId.toString());
        CartDto cart = cartService.getCart(userCartKey);

        List<CartItemDto> items = (cart != null && cart.getItems() != null) ? cart.getItems() : List.of();
        if (items.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        for (CartItemDto it : items) {
            if (it.getStoreId() != null && !it.getStoreId().equals(request.storeId())) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            }
        }

        BigDecimal subtotal = items.stream()
                .map(it -> {
                    BigDecimal unitPrice = it.getUnitPrice() != null ? it.getUnitPrice() : BigDecimal.ZERO;
                    int qty = it.getQuantity() != null ? it.getQuantity() : 1;
                    return unitPrice.multiply(BigDecimal.valueOf(qty));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String type = request.type() != null ? request.type().trim().toUpperCase() : "DELIVERY";
        BigDecimal shippingFee = "PICKUP".equalsIgnoreCase(type) ? BigDecimal.ZERO : DEFAULT_SHIPPING_FEE;

        VoucherCalculation voucherCalc = calculateVoucher(request.voucherCode(), subtotal, shippingFee);
        BigDecimal discountAmount = voucherCalc.discountAmount();

        int pointsUsed = (request.pointsUsed() != null && request.pointsUsed() > 0) ? request.pointsUsed() : 0;
        BigDecimal pointsAmount = BigDecimal.valueOf(pointsUsed).multiply(POINTS_CONVERSION_RATE);

        BigDecimal beforePoints = subtotal.subtract(discountAmount).add(shippingFee);
        if (beforePoints.compareTo(BigDecimal.ZERO) < 0) {
            beforePoints = BigDecimal.ZERO;
        }

        if (pointsAmount.compareTo(beforePoints) > 0) {
            pointsAmount = beforePoints;
            pointsUsed = pointsAmount.divide(POINTS_CONVERSION_RATE).intValue();
        }

        BigDecimal totalAmount = beforePoints.subtract(pointsAmount);
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            totalAmount = BigDecimal.ZERO;
        }

        String paymentMethod = request.paymentMethod() != null ? request.paymentMethod().trim().toUpperCase() : "COD";
        String initialStatus = "COD".equalsIgnoreCase(paymentMethod) ? "CONFIRMED" : "PENDING_PAYMENT";

        Order order = new Order();
        order.setOrderCode(generateOrderCode());
        order.setCustomerId(customerId);
        order.setStoreId(request.storeId());
        order.setType(type);
        order.setStatus(initialStatus);
        order.setSubtotal(subtotal);
        order.setDiscountAmount(discountAmount);
        order.setPointsUsed(pointsUsed);
        order.setPointsAmount(pointsAmount);
        order.setShippingFee(shippingFee);
        order.setTotalAmount(totalAmount);
        order.setVoucherCode(request.voucherCode() != null ? request.voucherCode().trim() : null);
        order.setReceiverName(request.receiverName().trim());
        order.setReceiverPhone(request.receiverPhone().trim());
        order.setDeliveryAddress(request.deliveryAddress());
        order.setNote(request.note());
        order.setScheduledAt(request.scheduledAt());
        order = orderRepository.save(order);

        List<OrderItem> savedItems = new ArrayList<>();
        for (CartItemDto it : items) {
            OrderItem item = new OrderItem();
            item.setOrderId(order.getId());
            item.setItemType(it.getProductId() != null ? "PRODUCT" : "COMBO");
            item.setProductId(it.getProductId());
            item.setComboId(it.getComboId());
            item.setItemName(it.getItemName() != null ? it.getItemName() : "Item");
            item.setUnitPrice(it.getUnitPrice());
            item.setQuantity(it.getQuantity());
            item.setNote(it.getNote());
            item.setLineTotal(it.getUnitPrice().multiply(BigDecimal.valueOf(it.getQuantity())));

            if (it.getOptionIds() != null && !it.getOptionIds().isEmpty()) {
                item.setOptionsSnapshot(objectMapper.valueToTree(it.getOptionIds()));
            }
            if (it.getToppingIds() != null && !it.getToppingIds().isEmpty()) {
                item.setToppingsSnapshot(objectMapper.valueToTree(it.getToppingIds()));
            }
            savedItems.add(orderItemRepository.save(item));
        }

        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(order.getId());
        history.setFromStatus(null);
        history.setToStatus(initialStatus);
        history.setChangedBy(customerId);
        history.setChangedRole("CUSTOMER");
        history.setReason("Order created");
        history.setCreatedAt(Instant.now());
        orderStatusHistoryRepository.save(history);

        // Clear user cart in Redis
        cartService.clearCart(userCartKey);

        LOG.info("event=order_created orderId={} orderCode={} customerId={} storeId={} total={}",
                order.getId(), order.getOrderCode(), customerId, order.getStoreId(), order.getTotalAmount());

        // Publish order.created Kafka event
        orderEventPublisher.publishOrderCreated(order, savedItems);

        return DomainMapper.toResponse(order, savedItems, List.of(history));
    }

    @Transactional
    public OrderResponse cancelOrder(Long id, CancelOrderRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        accessGuard.requireOwner(order.getCustomerId());

        String currentStatus = order.getStatus();
        if (!"PENDING_PAYMENT".equalsIgnoreCase(currentStatus) && !"CONFIRMED".equalsIgnoreCase(currentStatus)) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        order.setStatus("CANCELLED");
        order = orderRepository.save(order);

        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(order.getId());
        history.setFromStatus(currentStatus);
        history.setToStatus("CANCELLED");
        history.setChangedBy(CurrentActor.require().userId());
        history.setChangedRole("CUSTOMER");
        history.setReason(request != null && request.reason() != null && !request.reason().isBlank()
                ? request.reason().trim() : "Order cancelled by customer");
        history.setCreatedAt(Instant.now());
        orderStatusHistoryRepository.save(history);

        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());
        List<OrderStatusHistory> histories = orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(order.getId());

        LOG.info("event=order_cancelled orderId={} orderCode={} by=CUSTOMER", order.getId(), order.getOrderCode());

        // Publish order.cancelled Kafka event
        orderEventPublisher.publishOrderCancelled(order, items, history.getReason());

        return DomainMapper.toResponse(order, items, histories);
    }

    @Transactional
    public OrderResponse rejectOrder(Long id, RejectOrderRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        accessGuard.requireStore(order.getStoreId());

        String currentStatus = order.getStatus();
        if ("COMPLETED".equalsIgnoreCase(currentStatus) || "CANCELLED".equalsIgnoreCase(currentStatus)) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        CurrentActor actor = CurrentActor.require();
        order.setStatus("CANCELLED");
        order = orderRepository.save(order);

        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(order.getId());
        history.setFromStatus(currentStatus);
        history.setToStatus("CANCELLED");
        history.setChangedBy(actor.userId());
        history.setChangedRole(actor.role().name());
        history.setReason(request != null && request.reason() != null && !request.reason().isBlank()
                ? request.reason().trim() : "Order rejected by store");
        history.setCreatedAt(Instant.now());
        orderStatusHistoryRepository.save(history);

        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());
        List<OrderStatusHistory> histories = orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(order.getId());

        LOG.info("event=order_rejected orderId={} orderCode={} by={}", order.getId(), order.getOrderCode(), actor.role());

        // Publish order.cancelled Kafka event
        orderEventPublisher.publishOrderCancelled(order, items, history.getReason());

        return DomainMapper.toResponse(order, items, histories);
    }

    @Transactional
    public OrderResponse updateStatus(Long id, UpdateOrderStatusRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        accessGuard.requireStore(order.getStoreId());

        String current = order.getStatus().toUpperCase();
        String target = request.status().trim().toUpperCase();

        if (current.equals(target)) {
            List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());
            List<OrderStatusHistory> histories = orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(order.getId());
            return DomainMapper.toResponse(order, items, histories);
        }

        boolean valid = switch (current) {
            case "CONFIRMED" -> "PREPARING".equals(target);
            case "PREPARING" -> "READY".equals(target);
            case "READY" -> "SHIPPING".equals(target) || "COMPLETED".equals(target);
            case "SHIPPING" -> "COMPLETED".equals(target);
            default -> false;
        };

        if (!valid) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        order.setStatus(target);
        order = orderRepository.save(order);

        CurrentActor actor = CurrentActor.require();
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(order.getId());
        history.setFromStatus(current);
        history.setToStatus(target);
        history.setChangedBy(actor.userId());
        history.setChangedRole(actor.role().name());
        history.setReason(request.note() != null && !request.note().isBlank()
                ? request.note().trim() : ("Status updated to " + target));
        history.setCreatedAt(Instant.now());
        orderStatusHistoryRepository.save(history);

        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());
        List<OrderStatusHistory> histories = orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(order.getId());

        LOG.info("event=order_status_updated orderId={} orderCode={} from={} to={}",
                order.getId(), order.getOrderCode(), current, target);

        // Publish Kafka event
        if ("COMPLETED".equals(target)) {
            orderEventPublisher.publishOrderCompleted(order, items);
        } else {
            orderEventPublisher.publishOrderStatusChanged(order, items, current);
        }

        return DomainMapper.toResponse(order, items, histories);
    }

    @Transactional
    public void compensateFailedPayment(Long orderId, String orderCode, String reason) {
        Optional<Order> orderOpt = Optional.empty();
        if (orderId != null) {
            orderOpt = orderRepository.findById(orderId);
        }
        if (orderOpt.isEmpty() && orderCode != null && !orderCode.isBlank()) {
            orderOpt = orderRepository.findByOrderCode(orderCode);
        }

        if (orderOpt.isEmpty()) {
            LOG.warn("event=saga_order_not_found orderId={} orderCode={}", orderId, orderCode);
            return;
        }

        Order order = orderOpt.get();
        String currentStatus = order.getStatus();

        if ("CANCELLED".equalsIgnoreCase(currentStatus)) {
            LOG.info("event=saga_order_already_cancelled orderId={} orderCode={}", order.getId(), order.getOrderCode());
            return;
        }

        if (!"PENDING_PAYMENT".equalsIgnoreCase(currentStatus) && !"CONFIRMED".equalsIgnoreCase(currentStatus)) {
            LOG.warn("event=saga_invalid_order_state orderId={} orderCode={} status={}",
                    order.getId(), order.getOrderCode(), currentStatus);
            return;
        }

        order.setStatus("CANCELLED");
        order = orderRepository.save(order);

        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(order.getId());
        history.setFromStatus(currentStatus);
        history.setToStatus("CANCELLED");
        history.setChangedBy(null);
        history.setChangedRole("SYSTEM_SAGA");
        history.setReason(reason != null && !reason.isBlank()
                ? reason.trim() : "Payment failed / cancelled by saga compensation");
        history.setCreatedAt(Instant.now());
        orderStatusHistoryRepository.save(history);

        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());

        LOG.info("event=saga_order_cancelled orderId={} orderCode={} fromStatus={}",
                order.getId(), order.getOrderCode(), currentStatus);

        orderEventPublisher.publishOrderCancelled(order, items, history.getReason());
    }

    public CartDto reorder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        accessGuard.requireOwner(order.getCustomerId());

        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(id);
        if (items.isEmpty()) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        }

        String cartKey = RedisConfig.key("cart", order.getCustomerId().toString());

        for (OrderItem it : items) {
            List<Long> optionIds = new ArrayList<>();
            if (it.getOptionsSnapshot() != null && it.getOptionsSnapshot().isArray()) {
                for (JsonNode n : it.getOptionsSnapshot()) {
                    optionIds.add(n.asLong());
                }
            }
            List<Long> toppingIds = new ArrayList<>();
            if (it.getToppingsSnapshot() != null && it.getToppingsSnapshot().isArray()) {
                for (JsonNode n : it.getToppingsSnapshot()) {
                    toppingIds.add(n.asLong());
                }
            }
            CartItemDto cartItem = new CartItemDto(
                    it.getProductId(),
                    it.getComboId(),
                    it.getItemName(),
                    it.getQuantity(),
                    it.getUnitPrice(),
                    optionIds,
                    toppingIds,
                    it.getNote(),
                    order.getStoreId()
            );
            cartService.addItem(cartKey, cartItem, CartService.CUSTOMER_CART_TTL);
        }

        return cartService.getCart(cartKey);
    }

    public PageResponse<OrderResponse> getMyOrders(String status, Pageable pageable) {
        Long customerId = CurrentActor.require().userId();
        String cleanStatus = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : null;

        Page<Order> orderPage = orderRepository.findCustomerOrders(customerId, cleanStatus, pageable);
        return mapToOrderResponsePage(orderPage);
    }

    public PageResponse<OrderResponse> getOrders(Long requestedStoreId, String status, String orderCode, Pageable pageable) {
        Long effectiveStoreId = accessGuard.effectiveStore(requestedStoreId);
        String cleanStatus = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : null;
        String cleanOrderCode = (orderCode != null && !orderCode.isBlank()) ? orderCode.trim() : null;

        Page<Order> orderPage = orderRepository.findOrders(effectiveStoreId, cleanStatus, cleanOrderCode, pageable);
        return mapToOrderResponsePage(orderPage);
    }

    public OrderResponse getOrderDetails(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        CurrentActor actor = CurrentActor.require();
        if (actor.role() == com.clucky.cartorderservice.dto.Role.CUSTOMER) {
            accessGuard.requireOwner(order.getCustomerId());
        } else if (actor.role() == com.clucky.cartorderservice.dto.Role.STAFF
                || actor.role() == com.clucky.cartorderservice.dto.Role.STORE_MANAGER) {
            accessGuard.requireStore(order.getStoreId());
        }

        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());
        List<OrderStatusHistory> history = orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(order.getId());
        return DomainMapper.toResponse(order, items, history);
    }

    @Transactional
    public RefundRequestResponse createRefundRequest(CreateRefundRequest request) {
        if (request == null || request.orderId() == null || request.reason() == null || request.reason().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        Order order = orderRepository.findById(request.orderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        accessGuard.requireOwner(order.getCustomerId());

        List<RefundRequest> existing = refundRequestRepository.findAllByOrderId(order.getId());
        boolean hasActive = existing.stream().anyMatch(r ->
                "PENDING".equalsIgnoreCase(r.getStatus()) || "APPROVED".equalsIgnoreCase(r.getStatus()));
        if (hasActive) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        RefundRequest refund = new RefundRequest();
        refund.setOrderId(order.getId());
        refund.setCustomerId(order.getCustomerId());
        refund.setAmount(order.getTotalAmount());
        refund.setReason(request.reason().trim());
        refund.setStatus("PENDING");
        refund = refundRequestRepository.save(refund);

        LOG.info("event=refund_requested orderId={} customerId={} amount={}",
                order.getId(), order.getCustomerId(), order.getTotalAmount());

        return DomainMapper.toResponse(refund);
    }

    public PageResponse<RefundRequestResponse> getRefundRequests(Long requestedStoreId, String status, Pageable pageable) {
        CurrentActor actor = CurrentActor.require();
        String cleanStatus = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : null;

        Page<RefundRequest> page;
        if (actor.role() == com.clucky.cartorderservice.dto.Role.CUSTOMER) {
            page = refundRequestRepository.findByCustomerId(actor.userId(), pageable);
        } else {
            Long effectiveStoreId = accessGuard.effectiveStore(requestedStoreId);
            page = refundRequestRepository.findRefundRequests(effectiveStoreId, cleanStatus, pageable);
        }

        return PageResponse.from(page.map(DomainMapper::toResponse));
    }

    @Transactional
    public RefundRequestResponse approveRefundRequest(Long id) {
        RefundRequest refund = refundRequestRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (!"PENDING".equalsIgnoreCase(refund.getStatus())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        accessGuard.requireStore(order.getStoreId());

        refund.setStatus("APPROVED");
        refund.setReviewedBy(CurrentActor.require().userId());
        refund.setReviewedAt(Instant.now());
        refund = refundRequestRepository.save(refund);

        LOG.info("event=refund_approved refundId={} orderId={}", refund.getId(), refund.getOrderId());
        return DomainMapper.toResponse(refund);
    }

    @Transactional
    public RefundRequestResponse rejectRefundRequest(Long id) {
        RefundRequest refund = refundRequestRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (!"PENDING".equalsIgnoreCase(refund.getStatus())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        accessGuard.requireStore(order.getStoreId());

        refund.setStatus("REJECTED");
        refund.setReviewedBy(CurrentActor.require().userId());
        refund.setReviewedAt(Instant.now());
        refund = refundRequestRepository.save(refund);

        LOG.info("event=refund_rejected refundId={} orderId={}", refund.getId(), refund.getOrderId());
        return DomainMapper.toResponse(refund);
    }

    private PageResponse<OrderResponse> mapToOrderResponsePage(Page<Order> orderPage) {
        List<Long> orderIds = orderPage.getContent().stream().map(Order::getId).toList();
        Map<Long, List<OrderItem>> itemsByOrderId = orderIds.isEmpty() ? Map.of() :
                orderItemRepository.findByOrderIdIn(orderIds).stream()
                        .collect(Collectors.groupingBy(OrderItem::getOrderId));

        Page<OrderResponse> responsePage = orderPage.map(o ->
                DomainMapper.toResponse(o, itemsByOrderId.getOrDefault(o.getId(), List.of()))
        );
        return PageResponse.from(responsePage);
    }

    private List<CartItemDto> resolvePreviewItems(OrderPreviewRequest request, HttpServletRequest httpRequest) {
        if (request.items() != null && !request.items().isEmpty()) {
            return request.items();
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtToken && jwtToken.isAuthenticated()) {
            String sub = jwtToken.getToken().getSubject();
            if (sub != null && !sub.isBlank()) {
                String userCartKey = RedisConfig.key("cart", sub);
                CartDto cart = cartService.getCart(userCartKey);
                if (cart != null && cart.getItems() != null && !cart.getItems().isEmpty()) {
                    return cart.getItems();
                }
            }
        }

        if (httpRequest != null) {
            String sessionId = httpRequest.getHeader("X-Guest-Session-Id");
            if (sessionId == null || sessionId.isBlank()) {
                Cookie[] cookies = httpRequest.getCookies();
                if (cookies != null) {
                    for (Cookie c : cookies) {
                        if ("clucky_guest_session".equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                            sessionId = c.getValue();
                            break;
                        }
                    }
                }
            }
            if (sessionId != null && !sessionId.isBlank()) {
                String guestCartKey = RedisConfig.key("cart:guest", sessionId);
                CartDto cart = cartService.getCart(guestCartKey);
                if (cart != null && cart.getItems() != null && !cart.getItems().isEmpty()) {
                    return cart.getItems();
                }
            }
        }

        return List.of();
    }

    private record VoucherCalculation(boolean valid, String message, BigDecimal discountAmount) {}

    private VoucherCalculation calculateVoucher(String rawCode, BigDecimal subtotal, BigDecimal shippingFee) {
        if (rawCode == null || rawCode.isBlank()) {
            return new VoucherCalculation(false, null, BigDecimal.ZERO);
        }

        String code = rawCode.trim().toUpperCase();
        if ("CLUCKYFREESHIP".equals(code) || "FREESHIP".equals(code)) {
            return new VoucherCalculation(true, "Áp dụng miễn phí vận chuyển", shippingFee);
        } else if (code.contains("GIAM20") || code.contains("20K") || "CLUCKY20".equals(code)) {
            BigDecimal discount = new BigDecimal("20000");
            if (discount.compareTo(subtotal) > 0) discount = subtotal;
            return new VoucherCalculation(true, "Đã áp dụng giảm giá 20.000 VNĐ", discount);
        } else if (code.contains("GIAM10") || code.contains("10K") || "CLUCKY10".equals(code)) {
            BigDecimal discount = new BigDecimal("10000");
            if (discount.compareTo(subtotal) > 0) discount = subtotal;
            return new VoucherCalculation(true, "Đã áp dụng giảm giá 10.000 VNĐ", discount);
        } else if (code.startsWith("CLUCKY") || code.startsWith("PROMO") || code.startsWith("DISCOUNT") || code.startsWith("GIAM")) {
            BigDecimal discount = new BigDecimal("20000");
            if (discount.compareTo(subtotal) > 0) discount = subtotal;
            return new VoucherCalculation(true, "Đã áp dụng mã giảm giá", discount);
        } else {
            return new VoucherCalculation(false, "Mã voucher không hợp lệ hoặc đã hết hạn", BigDecimal.ZERO);
        }
    }

    private String generateOrderCode() {
        String dateStr = DateTimeFormatter.ofPattern("yyyyMMdd").format(LocalDate.now());
        String chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder sb = new StringBuilder(4);
            for (int i = 0; i < 4; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            String candidate = "CLU-" + dateStr + "-" + sb;
            if (!orderRepository.existsByOrderCode(candidate)) {
                return candidate;
            }
        }
        return "CLU-" + dateStr + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 4).toUpperCase();
    }
}
