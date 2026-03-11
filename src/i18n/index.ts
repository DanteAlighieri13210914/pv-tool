import { zh, type LocaleKey } from './zh';
import { ja } from './ja';

export type Locale = 'zh' | 'ja';

const locales: Record<Locale, Record<LocaleKey, string>> = { zh, ja };

function detectLocale(): Locale {
  const path = window.location.pathname;
  if (path.includes('/ja/') || path.endsWith('/ja')) return 'ja';
  return 'zh';
}

export const locale: Locale = detectLocale();

export function t(key: LocaleKey): string {
  return locales[locale]?.[key] ?? locales.zh[key] ?? key;
}

export { type LocaleKey };
