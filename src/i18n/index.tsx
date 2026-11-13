import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { en } from './en';
import { zh, type Messages } from './zh';
import { type Lang, detectLang } from './detect';
import type { TuningPreset } from '../utils/musicTheory';

export type { Lang } from './detect';
export { LANGS } from './detect';

const MESSAGES: Record<Lang, Messages> = { zh, en };
const STORAGE_KEY = 'xianzhun_lang';

function initialLang(): Lang {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode)
  }
  const langs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  return detectLang(saved, langs);
}

interface I18nValue {
  lang: Lang;
  t: Messages;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nValue>({ lang: 'zh', t: zh, setLang: () => undefined });

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the choice still applies for this session
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = MESSAGES[lang].app.brandFull;
  }, [lang]);

  const value = useMemo(() => ({ lang, t: MESSAGES[lang], setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);

/** Built-in tunings are translated by id; custom ones keep the name the user typed. */
export function presetText(preset: TuningPreset, t: Messages): { name: string; description: string } {
  if (preset.category === 'custom') {
    return { name: preset.name, description: t.tunings.customDescription };
  }
  return t.presets[preset.id] ?? { name: preset.name, description: preset.description };
}
