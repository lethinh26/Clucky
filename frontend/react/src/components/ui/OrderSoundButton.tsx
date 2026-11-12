import { Button } from 'antd';
import { Bell, BellOff } from 'lucide-react';
import type { useOrderAlerts } from '../../hooks/useOrderAlerts';

export function OrderSoundButton({ alerts, className }: { alerts: ReturnType<typeof useOrderAlerts>; className?: string }) {
  return <Button data-order-sound className={className} aria-pressed={alerts.soundOn} aria-label={alerts.soundLabel}
    icon={alerts.soundOn ? <Bell size={17} /> : <BellOff size={17} />} onClick={() => void alerts.toggleSound()}>{alerts.soundLabel}</Button>;
}
