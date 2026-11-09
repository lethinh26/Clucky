import { Button, Popover } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { UnavailableFeature } from '../UnavailableFeature';

export function AdminNotificationCenter() {
  const { t } = useTranslation();
  return <Popover trigger="click" content={<div style={{ maxWidth: 360 }}><UnavailableFeature /></div>}>
    <Button type="text" icon={<BellOutlined />} aria-label={t('errors:NOT_IMPLEMENTED')} />
  </Popover>;
}
