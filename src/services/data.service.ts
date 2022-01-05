const LANGUAGE_KEY = "tuba_lang";

export const dataService = {
  setLanguage,
  getLanguage,
};

function setLanguage(lang: string): void {
  if (!lang) {
    return;
  }
  localStorage.removeItem(LANGUAGE_KEY);
  localStorage.setItem(LANGUAGE_KEY, lang);
}

function getLanguage(): string {
  const lang = localStorage.getItem(LANGUAGE_KEY);
  return lang ? lang : "en";
}
