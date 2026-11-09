import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';

export function UnavailableFeature() {
  const { t } = useTranslation();
  return <Alert type="info" showIcon title={t('errors:NOT_IMPLEMENTED')} description={t('admin:integrationUnavailable')} />;
}
