package com.clucky.promotionloyaltyservice.config;

import org.springframework.stereotype.Component;
import com.clucky.promotionloyaltyservice.dto.Role;
import org.springframework.security.access.AccessDeniedException;

@Component
public final class AccessGuard {
    public void requireOwner(Long ownerId) {
        if (ownerId == null || !ownerId.equals(CurrentActor.require().userId())) {
            throw new AccessDeniedException("Access denied");
        }
    }

    public void requireStore(Long resourceStoreId) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() == Role.ADMIN) { return; }
        if ((actor.role() != Role.STAFF && actor.role() != Role.STORE_MANAGER)
                || resourceStoreId == null || !resourceStoreId.equals(actor.storeId())) {
            throw new AccessDeniedException("Access denied");
        }
    }

    public Long effectiveStore(Long requestedStoreId) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() == Role.ADMIN) { return requestedStoreId; }
        requireStore(requestedStoreId == null ? actor.storeId() : requestedStoreId);
        return actor.storeId();
    }
}
