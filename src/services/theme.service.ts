export const themeService = { changeTheme };

const THEME_KEY = "rummy-theme"
const storedTheme = localStorage.getItem(THEME_KEY);
const root = document.querySelector(":root") as HTMLElement;
const primaryWhite = "#fafafa";
const secondaryWhite = "white";
const primaryBlack = "#2c2c2c";
const secondaryBlack = "black";
const imageColor = "unset";
const invertedImageColor = "invert(100%)";
const inputBackgroundColor = "#E8E8E8";
const invertedInputBackgroundColor = "#696969";
const outlineColor = "#b0bec5";
const invertedOutlineColor = "#2c2c2c";
const toastBackground = "#313131";
const chipBackground = "#696969";

let theme = storedTheme ? storedTheme : "light";
if (theme === "light") {
  setLightTheme();
} else {
  setDarkTheme();
}

function setLightTheme(): void {
  root.style.setProperty("--primary-color", primaryWhite);
  root.style.setProperty("--primary-background-color", primaryBlack);
  root.style.setProperty("--secondary-background-color", secondaryBlack);
  root.style.setProperty("--image-color", invertedImageColor);
  root.style.setProperty("--input-fill", invertedInputBackgroundColor);
  root.style.setProperty("--outline-color", invertedOutlineColor);
  root.style.setProperty("--toast-background", secondaryBlack);
  root.style.setProperty("--chip-background", chipBackground);
}

function setDarkTheme(): void {
  root.style.setProperty("--primary-color", primaryBlack);
  root.style.setProperty("--primary-background-color", primaryWhite);
  root.style.setProperty("--secondary-background-color", secondaryWhite);
  root.style.setProperty("--image-color", imageColor);
  root.style.setProperty("--input-fill", inputBackgroundColor);
  root.style.setProperty("--outline-color", outlineColor);
  root.style.setProperty("--toast-background", toastBackground);
  root.style.setProperty("--chip-background", inputBackgroundColor);
}

function changeTheme(): void {
  if (theme === "light") {
    theme = "dark";
    setDarkTheme();
  } else {
    theme = "light";
    setLightTheme();
  }
  localStorage.setItem(THEME_KEY, theme);
}
