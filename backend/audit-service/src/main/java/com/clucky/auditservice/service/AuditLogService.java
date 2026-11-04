package com.clucky.auditservice.service;

import com.clucky.auditservice.config.CurrentActor;
import com.clucky.auditservice.dto.AuditLogQuery;
import com.clucky.auditservice.dto.AuditLogResponse;
import com.clucky.auditservice.dto.PageResponse;
import com.clucky.auditservice.dto.Role;
import com.clucky.auditservice.entity.AuditLog;
import com.clucky.auditservice.exception.ApiException;
import com.clucky.auditservice.exception.ErrorCode;
import com.clucky.auditservice.mapper.AuditMapper;
import com.clucky.auditservice.repository.AuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {
    private final AuditLogRepository repository;
    private final AuditMapper mapper;

    public AuditLogService(AuditLogRepository repository, AuditMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> search(AuditLogQuery query) {
        CurrentActor actor = CurrentActor.require();
        Long store = effectiveStore(actor, query);
        if (query.from() != null && query.to() != null && query.from().isAfter(query.to())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        Specification<AuditLog> specification = (entry, criteria, builder) -> {
            List<Predicate> filters = new ArrayList<>();
            if (store != null) { filters.add(builder.equal(entry.get("storeId"), store)); }
            String role = actor.role() == Role.STORE_MANAGER ? Role.STAFF.name() : query.actorRole();
            if (role != null) { filters.add(builder.equal(entry.get("actorRole"), role)); }
            if (query.actorId() != null) { filters.add(builder.equal(entry.get("actorId"), query.actorId())); }
            if (query.sourceService() != null) { filters.add(builder.equal(entry.get("sourceService"), query.sourceService())); }
            if (query.action() != null) { filters.add(builder.equal(entry.get("action"), query.action())); }
            if (query.targetType() != null) { filters.add(builder.equal(entry.get("targetType"), query.targetType())); }
            if (query.targetId() != null) { filters.add(builder.equal(entry.get("targetId"), query.targetId())); }
            if (query.from() != null) { filters.add(builder.greaterThanOrEqualTo(entry.get("occurredAt"), query.from())); }
            if (query.to() != null) { filters.add(builder.lessThanOrEqualTo(entry.get("occurredAt"), query.to())); }
            return builder.and(filters.toArray(Predicate[]::new));
        };
        PageRequest page = PageRequest.of(query.page() == null ? 0 : query.page(), query.size() == null ? 20 : query.size(),
                Sort.by(Sort.Direction.DESC, "occurredAt", "id"));
        return PageResponse.from(repository.findAll(specification, page).map(mapper::toResponse));
    }

    public static Long effectiveStore(CurrentActor actor, AuditLogQuery query) {
        if (actor.role() == Role.ADMIN) { return query.storeId(); }
        if (actor.role() != Role.STORE_MANAGER || actor.storeId() == null
                || query.storeId() != null && !query.storeId().equals(actor.storeId())
                || query.actorRole() != null && !Role.STAFF.name().equals(query.actorRole())) {
            throw new AccessDeniedException("Access denied");
        }
        return actor.storeId();
    }
}
