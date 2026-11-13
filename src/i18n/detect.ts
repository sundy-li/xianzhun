export type Lang = 'zh' | 'en';
export const LANGS: Lang[] = ['zh', 'en'];

/**
 * The saved choice wins. Otherwise the first Chinese or English entry in the browser's language
 * list decides, and any other language falls back to English.
 */
export function detectLang(saved: string | null, browserLangs: readonly string[]): Lang {
  if (saved === 'zh' || saved === 'en') return saved;
  for (const l of browserLangs) {
    const lower = l.toLowerCase();
    if (lower.startsWith('zh')) return 'zh';
    if (lower.startsWith('en')) return 'en';
  }
  return 'en';
}
