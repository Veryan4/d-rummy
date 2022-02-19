const LANGUAGE_KEY = "tuba_lang";
const LANGUAGE_EVENT = "lang-update";

let translations: any;
let currentLang: string;

export const translateService = {
  useLanguage,
  t,
  initTranslateLanguage,
  getLanguage,
  LANGUAGE_EVENT,
};

async function useLanguage(lang: string): Promise<any> {
  if (currentLang === lang) return;
  translations = await fetch(`./i18n/${lang}.json`).then((res) => res.json());
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: { lang } }));
  setLanguage(lang);
  currentLang = lang;
  return translations;
}

function t(
  record: string,
  placeholders?: Record<string, string | number>
): string {
  const cleaned = record.replaceAll(":", ".");
  let result = translations;
  try {
    cleaned.split(".").forEach((key: string) => (result = result[key]));
  } catch {
    return record;
  }
  if (!result) return record;
  if (!placeholders) return result;
  return result.replace(/{\w+}/g, (all: string) => {
    all = all.substring(1).slice(0, -1);
    return placeholders[all] || all;
  });
}

async function initTranslateLanguage(): Promise<any> {
  if (currentLang) return;
  const lang = getStoredLanguage();
  if (lang) {
    return useLanguage(lang);
  }
  if (navigator.language) {
    const browserLang = navigator.language.substring(0, 2);
    return useLanguage(browserLang);
  }
  return useLanguage("en");
}

function getLanguage(): string {
  return currentLang;
}

function setLanguage(lang: string): void {
  if (!lang) {
    return;
  }
  localStorage.removeItem(LANGUAGE_KEY);
  localStorage.setItem(LANGUAGE_KEY, lang);
}

function getStoredLanguage(): string {
  const lang = localStorage.getItem(LANGUAGE_KEY);
  return lang ? lang : "en";
}
