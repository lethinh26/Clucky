SET search_path TO notification_service, public;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notification_service.notifications (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notification_service.notifications (user_id)
    WHERE is_read = FALSE;

