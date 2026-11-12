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
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.mapper.DomainMapper;
import com.clucky.cartorderservice.repository.OrderItemRepository;
import com.clucky.cartorderservice.repository.OrderRepository;
import com.clucky.cartorderservice.repository.OrderStatusHistoryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {
    private static final Logger LOG = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final CartService cartService;
    private final AccessGuard accessGuard;
    private final ObjectMapper objectMapper;
    private final OrderEventPublisher orderEventPublisher;
    private final CatalogClient catalogClient;
    private final PromotionClient promotionClient;
    private final LoyaltyClient loyaltyClient;
    private final ShippingClient shippingClient;
    private final StringRedisTemplate redisTemplate;
    private final VoucherCheckoutRecovery voucherRecovery;
    private final CustomerProfileClient customerProfiles;
    private final JdbcTemplate jdbc;
    private final Random random = new SecureRandom();

    public OrderService(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            OrderStatusHistoryRepository orderStatusHistoryRepository,
            CartService cartService,
            AccessGuard accessGuard,
            ObjectMapper objectMapper,
            OrderEventPublisher orderEventPublisher,
            CatalogClient catalogClient,
            PromotionClient promotionClient,
            ShippingClient shippingClient,
            LoyaltyClient loyaltyClient,
            VoucherCheckoutRecovery voucherRecovery,
            CustomerProfileClient customerProfiles
    ) {
        this(orderRepository, orderItemRepository, orderStatusHistoryRepository, cartService,
                accessGuard, objectMapper, orderEventPublisher, catalogClient, promotionClient,
                shippingClient, loyaltyClient, null, voucherRecovery, customerProfiles, null);
    }

    @Autowired
    public OrderService(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            OrderStatusHistoryRepository orderStatusHistoryRepository,
            CartService cartService,
            AccessGuard accessGuard,
            ObjectMapper objectMapper,
            OrderEventPublisher orderEventPublisher,
            CatalogClient catalogClient,
            PromotionClient promotionClient,
            ShippingClient shippingClient,
            LoyaltyClient loyaltyClient,
            StringRedisTemplate redisTemplate,
            VoucherCheckoutRecovery voucherRecovery,
            CustomerProfileClient customerProfiles,
            JdbcTemplate jdbc
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
        this.cartService = cartService;
        this.accessGuard = accessGuard;
        this.objectMapper = objectMapper;
        this.orderEventPublisher = orderEventPublisher;
        this.catalogClient = catalogClient;
        this.promotionClient = promotionClient;
        this.shippingClient = shippingClient;
        this.loyaltyClient = loyaltyClient;
        this.redisTemplate = redisTemplate;
        this.voucherRecovery = voucherRecovery;
        this.customerProfiles = customerProfiles;
        this.jdbc = jdbc;
    }

    public OrderPreviewResponse previewOrder(OrderPreviewRequest request, HttpServletRequest httpRequest) {
        accessGuard.requireCustomer();
        List<CartItemDto> items = resolvePreviewItems(request, httpRequest);
        if (items.isEmpty()) {
            return new OrderPreviewResponse(
                    BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO,
                    BigDecimal.ZERO, BigDecimal.ZERO, false, null, List.of()
            );
        }

        Long storeId = request.storeId();
        if (storeId == null) {
            for (CartItemDto it : items) {
                if (it.getStoreId() != null) {
                    storeId = it.getStoreId();
                    break;
                }
            }
        }
        if (storeId == null) {
            storeId = 1L;
        }

        // Validate items with Catalog Service (P1-01)
        CatalogClient.CatalogValidationResponse catalogValidation = catalogClient.validateItems(storeId, items);
        if (!catalogValidation.valid() || !catalogValidation.storeOpen()) {
            return new OrderPreviewResponse(
                    BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO,
                    BigDecimal.ZERO, BigDecimal.ZERO, false,
                    catalogValidation.message() != null ? catalogValidation.message() : "Sản phẩm hoặc cửa hàng không khả dụng",
                    items
            );
        }

        BigDecimal subtotal = catalogValidation.subtotal();

        String type = request.type() != null ? request.type().trim().toUpperCase() : "DELIVERY";
        // P1.2: Validate shipping fee with Shipping Service (INT-38), no hardcoded default
        ShippingClient.ShippingFeeResult shippingResult = shippingClient.calculateShippingFee(
                type, storeId, request.latitude(), request.longitude()
        );
        if (!shippingResult.available() && !"PICKUP".equalsIgnoreCase(type)) {
            return new OrderPreviewResponse(subtotal, BigDecimal.ZERO, 0, BigDecimal.ZERO, null, null,
                    false, null, items, BigDecimal.ZERO, false, shippingResult);
        }
        BigDecimal shippingFee = shippingResult.fee() != null ? shippingResult.fee() : BigDecimal.ZERO;

        // Validate voucher with Promotion Service (P1-02)
        PromotionClient.VoucherResult voucherCalc = promotionClient.validateVoucher(request.voucherCode(), storeId, subtotal);
        BigDecimal discountAmount = voucherCalc.discountAmount();

        // Validate loyalty points with Promotion Service (P1-02)
        LoyaltyClient.Quote loyaltyCalc = loyaltyClient.preview(
                request.pointsUsed(),
                subtotal.subtract(discountAmount).max(BigDecimal.ZERO)
        );
        discountAmount = discountAmount.add(loyaltyCalc.tierDiscount());
        int pointsUsed = loyaltyCalc.pointsUsed();
        BigDecimal pointsAmount = loyaltyCalc.pointsAmount();

        BigDecimal beforePoints = subtotal.subtract(discountAmount).add(shippingFee);
        if (beforePoints.compareTo(BigDecimal.ZERO) < 0) {
            beforePoints = BigDecimal.ZERO;
        }

        if (pointsAmount.compareTo(beforePoints) > 0) {
            pointsAmount = beforePoints;
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
                items,
                loyaltyCalc.tierDiscount(),
                true,
                shippingResult
        );
    }

    @Transactional(timeout = 60)
    public OrderResponse createOrder(CreateOrderRequest request) {
        accessGuard.requireCustomer();
        Long customerId = CurrentActor.require().userId();

        String userCartKey = RedisConfig.key("cart", customerId.toString());
        List<CartItemDto> items = (request.items() != null && !request.items().isEmpty())
                ? request.items()
                : List.of();
        if (items.isEmpty()) {
            CartDto cart = cartService.getCart(userCartKey);
            items = (cart != null && cart.getItems() != null) ? cart.getItems() : List.of();
        }
        if (items.isEmpty()) {
            LOG.warn("event=order_create_failed reason=cart_empty customerId={}", customerId);
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        for (CartItemDto it : items) {
            if (it.getStoreId() != null && !it.getStoreId().equals(request.storeId())) {
                LOG.warn("event=order_create_failed reason=store_mismatch itemStoreId={} requestStoreId={}",
                        it.getStoreId(), request.storeId());
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Món trong giỏ thuộc chi nhánh khác (" + it.getStoreId() + "). Vui lòng chọn đúng chi nhánh.");
            }
        }

        // Validate items with Catalog Service (P1-01: Client price is NEVER trusted)
        CatalogClient.CatalogValidationResponse catalogValidation = catalogClient.validateItems(request.storeId(), items);
        if (!catalogValidation.valid()) {
            String msg = catalogValidation.message() != null ? catalogValidation.message() : ErrorCode.RESOURCE_CONFLICT.message();
            LOG.warn("event=order_create_failed reason=catalog_items_invalid message={}", msg);
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, msg);
        }
        if (!catalogValidation.storeOpen()) {
            String msg = catalogValidation.message() != null ? catalogValidation.message() : "Chi nhánh hiện đang ngoài giờ phục vụ";
            LOG.warn("event=order_create_failed reason=store_closed message={}", msg);
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, msg);
        }

        BigDecimal subtotal = catalogValidation.subtotal();

        String type = request.type() != null ? request.type().trim().toUpperCase() : "DELIVERY";
        // P1.2: Validate shipping fee with Shipping Service (INT-38), no hardcoded default
        ShippingClient.ShippingFeeResult shippingResult = shippingClient.calculateShippingFee(
                type, request.storeId(), request.latitude(), request.longitude()
        );
        if (!shippingResult.available() && !"PICKUP".equalsIgnoreCase(type)) {
            throw new ApiException(Set.of("OUT_OF_RANGE", "LOCATION_REQUIRED").contains(shippingResult.reason())
                    ? ErrorCode.RESOURCE_CONFLICT : ErrorCode.DEPENDENCY_UNAVAILABLE);
        }
        BigDecimal shippingFee = shippingResult.fee() != null ? shippingResult.fee() : BigDecimal.ZERO;

        // Validate voucher with Promotion Service (P1-02: No hardcoded voucher strings)
        PromotionClient.VoucherResult voucherCalc = promotionClient.validateVoucher(request.voucherCode(), request.storeId(), subtotal);
        if (request.voucherCode() != null && !request.voucherCode().isBlank() && !voucherCalc.valid()) {
            throw new ApiException(ErrorCode.VOUCHER_INACTIVE);
        }
        BigDecimal discountAmount = voucherCalc.discountAmount();

        // Validate loyalty points with Promotion Service (P1-02: Verified reservation)
        LoyaltyClient.Quote loyaltyCalc = loyaltyClient.preview(
                request.pointsUsed(),
                subtotal.subtract(discountAmount).max(BigDecimal.ZERO)
        );
        discountAmount = discountAmount.add(loyaltyCalc.tierDiscount());
        int pointsUsed = loyaltyCalc.pointsUsed();
        BigDecimal pointsAmount = loyaltyCalc.pointsAmount();

        BigDecimal beforePoints = subtotal.subtract(discountAmount).add(shippingFee);
        if (beforePoints.compareTo(BigDecimal.ZERO) < 0) {
            beforePoints = BigDecimal.ZERO;
        }

        if (pointsAmount.compareTo(beforePoints) > 0) {
            pointsAmount = beforePoints;
        }

        BigDecimal totalAmount = beforePoints.subtract(pointsAmount);
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            totalAmount = BigDecimal.ZERO;
        }

        if (request.expectedTotal() != null && totalAmount.compareTo(request.expectedTotal()) != 0) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        String paymentMethod = request.paymentMethod() != null ? request.paymentMethod().trim().toUpperCase() : "COD";
        String initialStatus = "COD".equalsIgnoreCase(paymentMethod)
                ? OrderStatus.CONFIRMED.name()
                : OrderStatus.PENDING_PAYMENT.name();

        Order order = new Order();
        order.setOrderCode(generateOrderCode());
        order.setCustomerId(customerId);
        order.setCustomerEmail(customerProfiles.currentCustomerEmail(customerId));
        order.setCustomerEmailVerified(true);
        order.setStoreId(request.storeId());
        order.setQueueNumber(generateDailyQueueNumber(request.storeId()));
        order.setType(type);
        order.setStatus(initialStatus);
        order.setSubtotal(subtotal);
        order.setDiscountAmount(discountAmount);
        order.setPointsUsed(pointsUsed);
        order.setPointsAmount(pointsAmount);
        order.setShippingFee(shippingFee);
        order.setTotalAmount(totalAmount);
        order.setPaymentMethod(paymentMethod);
        order.setVoucherCode(voucherCalc.valid() ? request.voucherCode().trim() : null);
        order.setReceiverName(request.receiverName().trim());
        order.setReceiverPhone(request.receiverPhone().trim());
        order.setDeliveryAddress(request.deliveryAddress());
        order.setLatitude("DELIVERY".equals(type) ? request.latitude() : null);
        order.setLongitude("DELIVERY".equals(type) ? request.longitude() : null);
        order.setNote(request.note());
        order.setScheduledAt(request.scheduledAt());
        order = orderRepository.save(order);

        voucherRecovery.lock(order.getId());
        if (order.getVoucherCode() != null) {
            voucherRecovery.track(order.getId());
            loyaltyClient.reserveVoucher(order.getId(), customerId, order.getStoreId(), order.getVoucherCode(), subtotal, voucherCalc.discountAmount());
        }
        loyaltyClient.reserve(order.getId(), customerId, subtotal.subtract(voucherCalc.discountAmount()).max(BigDecimal.ZERO), loyaltyCalc);

        List<OrderItem> savedItems = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            CartItemDto it = items.get(i);
            CatalogClient.ValidatedCatalogItem validated = catalogValidation.items().get(i);
            BigDecimal unitPrice = validated.unitPrice();
            BigDecimal extraPrice = validated.extraPrice() != null ? validated.extraPrice() : BigDecimal.ZERO;
            String itemName = validated.name();

            OrderItem item = new OrderItem();
            item.setOrderId(order.getId());
            item.setItemType(it.getProductId() != null ? "PRODUCT" : "COMBO");
            item.setProductId(it.getProductId());
            item.setComboId(it.getComboId());
            item.setItemName(itemName);
            item.setUnitPrice(unitPrice.add(extraPrice));
            item.setQuantity(it.getQuantity());
            item.setNote(it.getNote());
            item.setLineTotal(unitPrice.add(extraPrice).multiply(BigDecimal.valueOf(it.getQuantity())));

            if (validated.optionsSnapshot() != null && !validated.optionsSnapshot().isEmpty()) {
                item.setOptionsSnapshot(objectMapper.valueToTree(validated.optionsSnapshot()));
            } else if (it.getOptionsSnapshot() != null) {
                item.setOptionsSnapshot(objectMapper.valueToTree(it.getOptionsSnapshot()));
            } else if (it.getOptionIds() != null && !it.getOptionIds().isEmpty()) {
                item.setOptionsSnapshot(objectMapper.valueToTree(it.getOptionIds()));
            }
            if (validated.toppingsSnapshot() != null && !validated.toppingsSnapshot().isEmpty()) {
                item.setToppingsSnapshot(objectMapper.valueToTree(validated.toppingsSnapshot()));
            } else if (it.getToppingsSnapshot() != null) {
                item.setToppingsSnapshot(objectMapper.valueToTree(it.getToppingsSnapshot()));
            } else if (it.getToppingIds() != null && !it.getToppingIds().isEmpty()) {
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
        history.setReason("Order created with payment method: " + paymentMethod);
        history.setCreatedAt(Instant.now());
        orderStatusHistoryRepository.save(history);

        // Clear user cart in Redis only when order is successfully created
        cartService.clearCart(userCartKey);

        LOG.info("event=order_created orderId={} orderCode={} customerId={} storeId={} total={} paymentMethod={}",
                order.getId(), order.getOrderCode(), customerId, order.getStoreId(), order.getTotalAmount(), paymentMethod);

        // Transactional Outbox: Saves outbox event in the same DB transaction
        orderEventPublisher.publishOrderCreated(order, savedItems, catalogValidation.stockQuantities());

        return DomainMapper.toResponse(order, savedItems, List.of(history));
    }

    @Transactional(timeout = 60)
    public OrderResponse createCounterOrder(CreateCounterOrderRequest request, String idempotencyKey) {
        accessGuard.requireCounterStaff();
        CurrentActor actor = CurrentActor.require();

        Long effectiveStoreId;
        if (actor.role() == Role.ADMIN) {
            if (request.storeId() == null) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "storeId is required for ADMIN");
            }
            effectiveStoreId = request.storeId();
        } else {
            if (actor.storeId() == null) {
                throw new AccessDeniedException("Store ID missing in staff token");
            }
            effectiveStoreId = actor.storeId();
        }

        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.indexOf('\0') >= 0 || idempotencyKey.trim().length() > 128) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Idempotency-Key is required");
        }

        String payloadHash;
        try {
            payloadHash = HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(objectMapper.writeValueAsBytes(request)));
        } catch (java.security.NoSuchAlgorithmException | com.fasterxml.jackson.core.JsonProcessingException failure) {
            throw new IllegalStateException("Cannot encode counter order", failure);
        }

        if (jdbc == null) throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        int inserted = jdbc.update("INSERT INTO order_service.counter_order_operations(idempotency_key,store_id,payload_hash) VALUES (?,?,?) ON CONFLICT DO NOTHING",
                idempotencyKey.trim(), effectiveStoreId, payloadHash);
        if (inserted == 0) {
            var existing = jdbc.queryForList("SELECT payload_hash,order_id FROM order_service.counter_order_operations WHERE store_id=? AND idempotency_key=?", effectiveStoreId, idempotencyKey.trim());
            if (existing.isEmpty() || !Objects.equals(payloadHash, existing.getFirst().get("payload_hash"))) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            Object orderId = existing.getFirst().get("order_id");
            if (orderId == null) throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Request đang được xử lý, vui lòng thử lại");
            Order existingOrder = orderRepository.findById(((Number) orderId).longValue()).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
            if (!effectiveStoreId.equals(existingOrder.getStoreId())) throw new ApiException(ErrorCode.FORBIDDEN);
            return DomainMapper.toResponse(existingOrder, orderItemRepository.findByOrderIdOrderByIdAsc(existingOrder.getId()), orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(existingOrder.getId()));
        }

        if (request.items() == null || request.items().isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Danh sách món không được để trống");
        }

        List<CartItemDto> items = new ArrayList<>();
        for (CounterOrderItemRequest it : request.items()) {
            CartItemDto itemDto = new CartItemDto();
            itemDto.setProductId(it.productId());
            itemDto.setComboId(it.comboId());
            itemDto.setQuantity(it.quantity() != null && it.quantity() > 0 ? it.quantity() : 1);
            itemDto.setOptionIds(it.resolveOptionIds());
            itemDto.setToppingIds(it.toppingIds() != null ? it.toppingIds() : List.of());
            itemDto.setNote(it.note());
            itemDto.setStoreId(effectiveStoreId);
            items.add(itemDto);
        }

        // Validate items with Catalog Service (server-side verification of item, options, store availability & inventory)
        CatalogClient.CatalogValidationResponse catalogValidation = catalogClient.validateItems(effectiveStoreId, items);
        if (!catalogValidation.valid()) {
            String msg = catalogValidation.message() != null ? catalogValidation.message() : "Sản phẩm không hợp lệ";
            boolean isInventoryIssue = false;
            if (catalogValidation.items() != null) {
                for (CatalogClient.ValidatedCatalogItem vi : catalogValidation.items()) {
                    if (!vi.available() && vi.reason() != null &&
                            (vi.reason().toLowerCase().contains("tồn kho") || vi.reason().toLowerCase().contains("hết hàng"))) {
                        isInventoryIssue = true;
                        msg = vi.reason();
                        break;
                    }
                }
            }
            if (isInventoryIssue || msg.toLowerCase().contains("tồn kho") || msg.toLowerCase().contains("hết hàng")) {
                throw new ApiException(ErrorCode.INSUFFICIENT_INVENTORY, msg);
            }
            throw new ApiException(ErrorCode.VALIDATION_ERROR, msg);
        }

        if (!catalogValidation.storeOpen()) {
            String msg = catalogValidation.message() != null ? catalogValidation.message() : "Chi nhánh hiện đang ngoài giờ phục vụ";
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, msg);
        }

        BigDecimal subtotal = catalogValidation.subtotal();

        // Generate daily queueNumber (1-999) per store
        int queueNumber = generateDailyQueueNumber(effectiveStoreId);

        String diningOption = "DINE_IN".equalsIgnoreCase(request.diningOption()) ? "DINE_IN" : "TAKE_AWAY";
        String paymentMethod = (request.paymentMethod() != null && !request.paymentMethod().isBlank())
                ? request.paymentMethod().trim().toUpperCase() : "CASH";

        Order order = new Order();
        order.setOrderCode(generateOrderCode());
        order.setCustomerId(null);
        order.setStoreId(effectiveStoreId);
        order.setOrderSource("COUNTER");
        order.setDiningOption(diningOption);
        order.setQueueNumber(queueNumber);
        order.setType("PICKUP");
        order.setStatus("CONFIRMED");
        order.setPaymentStatus("PENDING");
        order.setPaymentMethod(paymentMethod);
        order.setSubtotal(subtotal);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setPointsUsed(0);
        order.setPointsAmount(BigDecimal.ZERO);
        order.setShippingFee(BigDecimal.ZERO);
        order.setTotalAmount(subtotal);
        order.setReceiverName("Khách tại quầy #" + String.format("%03d", queueNumber));
        order.setReceiverPhone("Tại quầy");
        order.setDeliveryAddress("Tại quầy");
        order.setNote(request.note());
        order.setVersion(0L);

        order = orderRepository.save(order);
        jdbc.update("UPDATE order_service.counter_order_operations SET order_id=? WHERE store_id=? AND idempotency_key=?", order.getId(), effectiveStoreId, idempotencyKey.trim());

        List<OrderItem> savedItems = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            CartItemDto it = items.get(i);
            CatalogClient.ValidatedCatalogItem validated = catalogValidation.items().get(i);
            BigDecimal unitPrice = validated.unitPrice();
            BigDecimal extraPrice = validated.extraPrice() != null ? validated.extraPrice() : BigDecimal.ZERO;
            BigDecimal effectiveUnitPrice = unitPrice.add(extraPrice);

            OrderItem item = new OrderItem();
            item.setOrderId(order.getId());
            item.setItemType(it.getProductId() != null ? "PRODUCT" : "COMBO");
            item.setProductId(it.getProductId());
            item.setComboId(it.getComboId());
            item.setItemName(validated.name());
            item.setUnitPrice(effectiveUnitPrice);
            item.setQuantity(it.getQuantity());
            item.setNote(it.getNote());
            item.setLineTotal(effectiveUnitPrice.multiply(BigDecimal.valueOf(it.getQuantity())));

            if (validated.optionsSnapshot() != null && !validated.optionsSnapshot().isEmpty()) {
                item.setOptionsSnapshot(objectMapper.valueToTree(validated.optionsSnapshot()));
            }
            if (validated.toppingsSnapshot() != null && !validated.toppingsSnapshot().isEmpty()) {
                item.setToppingsSnapshot(objectMapper.valueToTree(validated.toppingsSnapshot()));
            }
            savedItems.add(orderItemRepository.save(item));
        }

        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(order.getId());
        history.setFromStatus(null);
        history.setToStatus("CONFIRMED");
        history.setChangedBy(actor.userId());
        history.setChangedRole(actor.role() != null ? actor.role().name() : "STAFF");
        history.setReason("Tạo đơn quầy #" + queueNumber);
        history.setCreatedAt(Instant.now());
        orderStatusHistoryRepository.save(history);

        // Transactional Outbox
        orderEventPublisher.publishOrderCreated(order, savedItems, catalogValidation.stockQuantities());

        LOG.info("event=counter_order_created orderId={} orderCode={} queueNumber={} storeId={} total={}",
                order.getId(), order.getOrderCode(), queueNumber, effectiveStoreId, order.getTotalAmount());

        return DomainMapper.toResponse(order, savedItems, List.of(history));
    }

    @Transactional
    public OrderResponse cancelOrder(Long id, CancelOrderRequest request) {
        Order order = orderRepository.lockById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        accessGuard.requireOwner(order.getCustomerId());

        String currentStatus = order.getStatus();
        String reason = cancellationReason(order, request == null ? null : request.reason());

        order.setStatus(OrderStatus.CANCELLED.name());
        order = orderRepository.save(order);

        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(order.getId());
        history.setFromStatus(currentStatus);
        history.setToStatus(OrderStatus.CANCELLED.name());
        history.setChangedBy(CurrentActor.require().userId());
        history.setChangedRole("CUSTOMER");
        history.setReason(reason);
        history.setCreatedAt(Instant.now());
        orderStatusHistoryRepository.save(history);

        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());
        List<OrderStatusHistory> histories = orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(order.getId());

        LOG.info("event=order_cancelled orderId={} orderCode={} by=CUSTOMER", order.getId(), order.getOrderCode());

        // P1.1: Release voucher and loyalty points if applied
        if (order.getVoucherCode() != null && !order.getVoucherCode().isBlank()) {
            voucherRecovery.cancelled(order.getId());
        }

        // Publish order.cancelled Kafka event via Transactional Outbox
        orderEventPublisher.publishOrderCancelled(order, items, history.getReason());

        return DomainMapper.toResponse(order, items, histories);
    }

    @Transactional
    public OrderResponse rejectOrder(Long id, CancelOrderRequest request) {
        Order order = orderRepository.lockById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        accessGuard.requireStore(order.getStoreId());

        String currentStatus = order.getStatus();
        String reason = cancellationReason(order, request == null ? null : request.reason());

        CurrentActor actor = CurrentActor.require();
        order.setStatus(OrderStatus.CANCELLED.name());
        order = orderRepository.save(order);

        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(order.getId());
        history.setFromStatus(currentStatus);
        history.setToStatus(OrderStatus.CANCELLED.name());
        history.setChangedBy(actor.userId());
        history.setChangedRole(actor.role().name());
        history.setReason(reason);
        history.setCreatedAt(Instant.now());
        orderStatusHistoryRepository.save(history);

        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());
        List<OrderStatusHistory> histories = orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(order.getId());

        LOG.info("event=order_rejected orderId={} orderCode={} by={}", order.getId(), order.getOrderCode(), actor.role());

        // P1.1: Release voucher and loyalty points if applied
        if (order.getVoucherCode() != null && !order.getVoucherCode().isBlank()) {
            voucherRecovery.cancelled(order.getId());
        }

        // Publish order.cancelled Kafka event via Transactional Outbox
        orderEventPublisher.publishOrderCancelled(order, items, history.getReason());

        return DomainMapper.toResponse(order, items, histories);
    }

    @Transactional
    public OrderResponse updateStatus(Long id, UpdateOrderStatusRequest request) {
        Order order = orderRepository.lockById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        accessGuard.requireStore(order.getStoreId());

        if (request.version() != null && !Objects.equals(request.version(), order.getVersion())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Dữ liệu đơn hàng đã bị thay đổi, vui lòng tải lại.");
        }

        String current = order.getStatus().toUpperCase();
        String target = request.status().trim().toUpperCase();
        if ("CANCELLED".equals(target)) {
            if (Set.of("PREPARING", "READY").contains(current)) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Không thể hủy đơn hàng đã chế biến");
            }
            cancellationReason(order, request.note());
        }

        // A status action is not proof of collection or settlement. Payment state is
        // changed only by the payment integration, never by a staff-supplied field.
        if (request.paymentStatus() != null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Không thể cập nhật trạng thái thanh toán qua API trạng thái đơn hàng");
        }

        if ("COMPLETED".equals(target)) {
            if (order.getPaymentStatus() == null || "PENDING".equalsIgnoreCase(order.getPaymentStatus())
                    || !Set.of("PAID", "COLLECTED").contains(order.getPaymentStatus())) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Đơn hàng chưa được thanh toán đầy đủ trước khi bàn giao.");
            }
        }
        if ("PENDING_PAYMENT".equals(current) && "CONFIRMED".equals(target)) {
            if (order.getPaymentStatus() == null || !Set.of("PAID", "COLLECTED").contains(order.getPaymentStatus())) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            }
        }

        if (current.equals(target)) {
            order = orderRepository.save(order);
            List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());
            List<OrderStatusHistory> histories = orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(order.getId());
            return DomainMapper.toResponse(order, items, histories);
        }

        boolean valid = switch (current) {
            case "PENDING_PAYMENT" -> "CONFIRMED".equals(target) || "CANCELLED".equals(target);
            case "CONFIRMED" -> "PREPARING".equals(target) || "CANCELLED".equals(target)
                    || ("COMPLETED".equals(target) && !"PICKUP".equalsIgnoreCase(order.getType()) && Set.of("PAID", "COLLECTED").contains(order.getPaymentStatus()));
            case "PREPARING" -> "READY".equals(target)
                    || ("COMPLETED".equals(target) && !"PICKUP".equalsIgnoreCase(order.getType()) && Set.of("PAID", "COLLECTED").contains(order.getPaymentStatus()));
            case "READY" -> ("SHIPPING".equals(target) && "DELIVERY".equalsIgnoreCase(order.getType())) || "COMPLETED".equals(target);
            case "SHIPPING" -> "COMPLETED".equals(target);
            default -> false;
        };

        if (!valid) {
            LOG.warn("event=invalid_status_transition orderId={} from={} to={}", order.getId(), current, target);
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

        // Publish Kafka event via Transactional Outbox
        if (OrderStatus.COMPLETED.name().equals(target)) {
            orderEventPublisher.publishOrderCompleted(order, items);
        } else if (OrderStatus.CANCELLED.name().equals(target)) {
            if (order.getVoucherCode() != null && !order.getVoucherCode().isBlank()) {
                voucherRecovery.cancelled(order.getId());
            }
            orderEventPublisher.publishOrderCancelled(order, items, history.getReason());
        } else {
            orderEventPublisher.publishOrderStatusChanged(order, items, current);
        }

        return DomainMapper.toResponse(order, items, histories);
    }

    @Transactional
    public void compensateFailedPayment(Long orderId, String orderCode, String reason) {
        Optional<Order> orderOpt = Optional.empty();
        if (orderId != null) {
            orderOpt = orderRepository.lockById(orderId);
        }
        if (orderOpt.isEmpty() && orderCode != null && !orderCode.isBlank()) {
            orderOpt = orderRepository.lockByOrderCode(orderCode);
        }

        if (orderOpt.isEmpty()) {
            LOG.warn("event=saga_order_not_found orderId={} orderCode={}", orderId, orderCode);
            return;
        }

        Order order = orderOpt.get();
        String currentStatus = order.getStatus();

        // Idempotency: Do not compensate already cancelled orders
        if (OrderStatus.CANCELLED.name().equalsIgnoreCase(currentStatus)) {
            LOG.info("event=saga_order_already_cancelled orderId={} orderCode={}", order.getId(), order.getOrderCode());
            return;
        }

        if (!"PENDING".equals(order.getPaymentStatus()) || order.getPaymentExpiresAt() != null && !OrderStatus.PENDING_PAYMENT.name().equals(currentStatus)) return;

        if (!OrderStatus.PENDING_PAYMENT.name().equalsIgnoreCase(currentStatus)
                && !OrderStatus.CONFIRMED.name().equalsIgnoreCase(currentStatus)) {
            LOG.warn("event=saga_invalid_order_state orderId={} orderCode={} status={}",
                    order.getId(), order.getOrderCode(), currentStatus);
            return;
        }

        order.setStatus(OrderStatus.CANCELLED.name());
        order = orderRepository.save(order);

        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(order.getId());
        history.setFromStatus(currentStatus);
        history.setToStatus(OrderStatus.CANCELLED.name());
        history.setChangedBy(null);
        history.setChangedRole("SYSTEM_SAGA");
        history.setReason(reason != null && !reason.isBlank()
                ? reason.trim() : "Payment failed / cancelled by saga compensation");
        history.setCreatedAt(Instant.now());
        orderStatusHistoryRepository.save(history);

        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());

        LOG.info("event=saga_order_cancelled orderId={} orderCode={} fromStatus={}",
                order.getId(), order.getOrderCode(), currentStatus);

        // P1.1: Compensate voucher and loyalty points if applied
        if (order.getVoucherCode() != null && !order.getVoucherCode().isBlank()) {
            voucherRecovery.cancelled(order.getId());
        }

        // Publish order.cancelled compensation event via Transactional Outbox
        orderEventPublisher.publishOrderCancelled(order, items, history.getReason(), "PAYMENT_EXPIRED".equals(reason));
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
        // Keep cart bound cleanly to the reordered order's store to prevent cross-branch conflicts
        CartDto currentCart = cartService.getCart(cartKey);
        if (currentCart != null && currentCart.getItems() != null) {
            boolean hasOtherStoreItem = currentCart.getItems().stream()
                    .anyMatch(existing -> existing.getStoreId() == null || !Objects.equals(existing.getStoreId(), order.getStoreId()));
            if (hasOtherStoreItem) {
                cartService.clearCart(cartKey);
            }
        }

        for (OrderItem it : items) {
            if (it.getProductId() == null && it.getComboId() == null) {
                continue;
            }
            List<Long> optionIds = new ArrayList<>();
            if (it.getOptionsSnapshot() != null && it.getOptionsSnapshot().isArray()) {
                for (JsonNode n : it.getOptionsSnapshot()) {
                    long optId = n.isObject() ? n.path("id").asLong() : n.asLong();
                    if (optId > 0) {
                        optionIds.add(optId);
                    }
                }
            }
            List<Long> toppingIds = new ArrayList<>();
            if (it.getToppingsSnapshot() != null && it.getToppingsSnapshot().isArray()) {
                for (JsonNode n : it.getToppingsSnapshot()) {
                    long topId = n.isObject() ? n.path("id").asLong() : n.asLong();
                    if (topId > 0) {
                        toppingIds.add(topId);
                    }
                }
            }
            CartItemDto cartItem = new CartItemDto(
                    it.getProductId(),
                    it.getComboId(),
                    it.getItemName(),
                    it.getQuantity() != null && it.getQuantity() > 0 ? it.getQuantity() : 1,
                    it.getUnitPrice(),
                    optionIds,
                    toppingIds,
                    it.getNote(),
                    order.getStoreId()
            );
            cartItem.setOptionsSnapshot(it.getOptionsSnapshot());
            cartItem.setToppingsSnapshot(it.getToppingsSnapshot());
            cartService.addItem(cartKey, cartItem, CartService.CUSTOMER_CART_TTL);
        }

        return cartService.getCart(cartKey);
    }

    public PageResponse<OrderResponse> getMyOrders(String status, Pageable pageable) {
        accessGuard.requireCustomer();
        Long customerId = CurrentActor.require().userId();
        String cleanStatus = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : null;

        Page<Order> orderPage = orderRepository.findCustomerOrders(customerId, cleanStatus, pageable);
        return mapToOrderResponsePage(orderPage);
    }

    public PageResponse<OrderResponse> getOrders(Long requestedStoreId, String status, String orderCode, Pageable pageable) {
        return getOrders(null, requestedStoreId, status, null, null, null, orderCode, pageable);
    }

    public PageResponse<OrderResponse> getOrders(Long customerId, Long requestedStoreId, String status, String orderCode, Pageable pageable) {
        return getOrders(customerId, requestedStoreId, status, null, null, null, orderCode, pageable);
    }

    public PageResponse<OrderResponse> getOrders(
            Long customerId,
            Long requestedStoreId,
            String status,
            String paymentStatus,
            String orderSource,
            String date,
            String orderCode,
            Pageable pageable
    ) {
        return getOrders(customerId, requestedStoreId, status, paymentStatus, orderSource, date, orderCode, null, pageable);
    }

    public PageResponse<OrderResponse> getOrders(
            Long customerId,
            Long requestedStoreId,
            String status,
            String paymentStatus,
            String orderSource,
            String date,
            String orderCode,
            Integer queueNumber,
            Pageable pageable
    ) {
        CurrentActor actor = CurrentActor.require();
        if (customerId != null && actor.role() != Role.ADMIN) throw new ApiException(ErrorCode.FORBIDDEN);
        if (customerId != null && customerId <= 0 || requestedStoreId != null && requestedStoreId <= 0
                || queueNumber != null && queueNumber <= 0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        Long effectiveStoreId = accessGuard.effectiveStore(requestedStoreId);
        String cleanStatus = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : null;
        if (cleanStatus != null && Arrays.stream(OrderStatus.values()).noneMatch(value -> value.name().equals(cleanStatus))) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        String cleanPaymentStatus = (paymentStatus != null && !paymentStatus.isBlank()) ? paymentStatus.trim().toUpperCase() : null;
        String cleanOrderSource = (orderSource != null && !orderSource.isBlank()) ? orderSource.trim().toUpperCase() : null;
        String orderCodePattern = (orderCode != null && !orderCode.isBlank())
                ? "%" + orderCode.trim().toLowerCase() + "%"
                : "%";

        Instant createdFrom = null;
        Instant createdTo = null;
        if (date != null && !date.isBlank()) {
            try {
                LocalDate localDate = LocalDate.parse(date.trim());
                createdFrom = localDate.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
                createdTo = localDate.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
            } catch (Exception e) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR);
            }
        }

        Page<Order> orderPage = orderRepository.findOrdersFiltered(
                customerId, effectiveStoreId, cleanStatus, cleanPaymentStatus, cleanOrderSource,
                createdFrom, createdTo, orderCodePattern, queueNumber, pageable);
        return mapToOrderResponsePage(orderPage);
    }

    // P2.3: Extracted common lookup and security verification for order details
    public OrderResponse getOrderDetails(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        return buildOrderDetailsResponse(order);
    }

    // P2.3: Extracted common lookup and security verification for order details
    public OrderResponse getOrderByCode(String orderCode) {
        if (orderCode == null || orderCode.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        Order order = orderRepository.findByOrderCode(orderCode.trim())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        return buildOrderDetailsResponse(order);
    }

    private OrderResponse buildOrderDetailsResponse(Order order) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() == Role.CUSTOMER) {
            accessGuard.requireOwner(order.getCustomerId());
        } else {
            accessGuard.requireStore(order.getStoreId());
        }

        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());
        List<OrderStatusHistory> history = orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(order.getId());
        return DomainMapper.toResponse(order, items, history);
    }

    private PageResponse<OrderResponse> mapToOrderResponsePage(Page<Order> orderPage) {
        List<Long> orderIds = orderPage.getContent().stream().map(Order::getId).toList();
        if (orderIds.isEmpty()) {
            return PageResponse.from(orderPage.map(DomainMapper::toResponse));
        }

        Map<Long, List<OrderItem>> itemsByOrderId =
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

    private String cancellationReason(Order order, String reason) {
        if (Set.of("PREPARING", "READY").contains(order.getStatus())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, "Không thể hủy đơn hàng đã chế biến");
        }
        if (!Set.of("PENDING_PAYMENT", "CONFIRMED").contains(order.getStatus())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        if (reason == null || reason.isBlank() || reason.trim().length() > 1000) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        return reason.trim();
    }

    private String generateOrderCode() {
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        String dateStr = DateTimeFormatter.ofPattern("yyyyMMdd").format(LocalDate.now(vnZone));
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

    private int generateDailyQueueNumber(Long storeId) {
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate todayVn = LocalDate.now(vnZone);
        String dateStr = DateTimeFormatter.ofPattern("yyyyMMdd").format(todayVn);
        Instant startOfDay = todayVn.atStartOfDay(vnZone).toInstant();
        Instant endOfDay = todayVn.plusDays(1).atStartOfDay(vnZone).toInstant();
        Integer maxQueue = orderRepository.findMaxQueueNumberForStoreAndDate(storeId, startOfDay, endOfDay);
        int dbBase = maxQueue != null ? maxQueue : 0;

        String queueKey = "queue:store:" + storeId + ":" + dateStr;
        if (redisTemplate != null) {
            try {
                Long seq = redisTemplate.opsForValue().increment(queueKey);
                if (seq != null) {
                    if (seq <= dbBase) {
                        seq = (long) (dbBase + 1);
                        redisTemplate.opsForValue().set(queueKey, String.valueOf(seq), Duration.ofDays(2));
                    } else if (seq == 1L) {
                        redisTemplate.expire(queueKey, Duration.ofDays(2));
                    }
                    return (int) (((seq - 1) % 999) + 1);
                }
            } catch (Exception e) {
                LOG.warn("Failed to generate queue number with redis for store {}: {}", storeId, e.getMessage());
            }
        }
        int next = dbBase + 1;
        return ((next - 1) % 999) + 1;
    }
}

