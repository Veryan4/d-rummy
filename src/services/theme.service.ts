export const themeService = {changeTheme};


const storedTheme = localStorage.getItem('rummy-theme');
let theme = storedTheme ? storedTheme : 'light';
const root = document.querySelector(':root') as HTMLElement;
const primaryWhite = '#fafafa'
const secondaryWhite = 'white';
const primaryBlack = '#2c2c2c';
const secondaryBlack = 'black';
const imageColor = 'unset';
const invertedImageColor = 'invert(100%)';
const inputBackgroundColor = 'WhiteSmoke';
const invertedInputBackgroundColor = '#2c2c2c';
const outlineColor = '#b0bec5';
const invertedOutlineColor = '#2c2c2c';


if (theme === 'light') {
  setLightTheme();
} else {
  setDarkTheme();
}

function setLightTheme() {
  root.style.setProperty('--primary-color', primaryWhite);
  root.style.setProperty('--primary-background-color', primaryBlack);
  root.style.setProperty('--secondary-background-color', secondaryBlack);
  root.style.setProperty('--image-color', invertedImageColor);
  root.style.setProperty('--input-fill', invertedInputBackgroundColor);
  root.style.setProperty('--outline-color', invertedOutlineColor);
}

function setDarkTheme() {
  root.style.setProperty('--primary-color', primaryBlack);
  root.style.setProperty('--primary-background-color', primaryWhite);
  root.style.setProperty('--secondary-background-color', secondaryWhite);
  root.style.setProperty('--image-color', imageColor);
  root.style.setProperty('--input-fill', inputBackgroundColor);
  root.style.setProperty('--outline-color', outlineColor);
}


function changeTheme() {
  if (theme === 'light') {
    theme = 'dark';
    setDarkTheme();
  } else {
    theme = 'light';
    setLightTheme();
  }
  localStorage.setItem('rummy-theme', theme);
}
