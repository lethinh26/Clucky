package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.dto.DomainEvent;
import com.clucky.cartorderservice.dto.OrderStatus;
import com.clucky.cartorderservice.entity.ConsumedEvent;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.OrderStatusHistory;
import com.clucky.cartorderservice.entity.RefundRequest;
import com.clucky.cartorderservice.repository.ConsumedEventRepository;
import com.clucky.cartorderservice.repository.OrderItemRepository;
import com.clucky.cartorderservice.repository.OrderRepository;
import com.clucky.cartorderservice.repository.OrderStatusHistoryRepository;
import com.clucky.cartorderservice.repository.RefundRequestRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerLockService {
    private static final String REASON = "ACCOUNT_BLOCKED";
    private final ConsumedEventRepository consumedEvents;
    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final OrderStatusHistoryRepository histories;
    private final RefundRequestRepository refunds;
    private final OrderEventPublisher events;
    public CustomerLockService(ConsumedEventRepository consumedEvents, OrderRepository orders, OrderItemRepository orderItems,
            OrderStatusHistoryRepository histories, RefundRequestRepository refunds, OrderEventPublisher events) {
        this.consumedEvents = consumedEvents; this.orders = orders; this.orderItems = orderItems;
        this.histories = histories; this.refunds = refunds; this.events = events;
    }
    @Transactional
    public void apply(DomainEvent event, long customerId, Long actorId, String actorRole) {
        if (consumedEvents.existsById(event.eventId())) return;
        List<Order> eligible = orders.findByCustomerIdAndStatusIn(customerId,
                List.of(OrderStatus.PENDING_PAYMENT.name(), OrderStatus.CONFIRMED.name(), OrderStatus.PREPARING.name()));
        for (Order order : eligible) {
            String before = order.getStatus();
            order.setStatus(OrderStatus.CANCELLED.name());
            orders.save(order);
            OrderStatusHistory history = new OrderStatusHistory();
            history.setOrderId(order.getId()); history.setFromStatus(before); history.setToStatus(OrderStatus.CANCELLED.name());
            history.setChangedBy(actorId); history.setChangedRole(actorRole == null || actorRole.isBlank() ? "SYSTEM_LOCK_EVENT" : actorRole);
            history.setReason(REASON); history.setCreatedAt(Instant.now()); histories.save(history);
            events.publishOrderCancelled(order, orderItems.findByOrderIdOrderByIdAsc(order.getId()), REASON);
        }
        for (RefundRequest refund : refunds.findByCustomerIdAndStatus(customerId, "PENDING")) {
            refund.setStatus("REJECTED"); refund.setReason(REASON); refund.setReviewedBy(actorId); refund.setReviewedAt(Instant.now()); refunds.save(refund);
        }
        consumedEvents.save(new ConsumedEvent(event.eventId(), event.eventType()));
    }
}
