import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import App from './App';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { normalizeLocale } from './i18n/locale';

document.documentElement.lang = normalizeLocale(i18n.resolvedLanguage);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}><App /></I18nextProvider>
  </StrictMode>,
);
