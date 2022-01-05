import { dataService } from "./data.service";

let translations: any;
let currentLang: string;

async function useLanguage(lang: string) {
  if (currentLang === lang) return;
  translations = await fetch(`./i18n/${lang}.json`).then((res) => res.json());
  window.dispatchEvent(new CustomEvent("lang-update", { detail: { lang } }));
  dataService.setLanguage(lang);
  currentLang = lang;
  return translations;
}

function t(record: string, placeholders?: Record<string, string | number>) {
  const cleaned = record.replaceAll(":", ".");
  let result = translations;
  try {
    cleaned.split(".").forEach((key: string) => (result = result[key]));
  } catch {
    return record;
  }
  if (!placeholders) return result;
  return result.replace(/{\w+}/g, (all: string) => {
    all = all.substring(1).slice(0, -1);
    return placeholders[all] || all;
  });
}

async function initTranslateLanguage() {
  if (currentLang) return;
  const lang = dataService.getLanguage();
  if (lang) {
    return useLanguage(lang);
  }
  if (navigator.language) {
    const browserLang = navigator.language.substring(0, 2);
    return useLanguage(browserLang);
  }
  return useLanguage("en");
}

function getLanguage() {
  return currentLang;
}

export { useLanguage, t, initTranslateLanguage, getLanguage };
