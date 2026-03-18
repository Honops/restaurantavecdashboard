
// 2️⃣ Traductions automatiques selon la langue du visiteur
const userLang = navigator.language || navigator.userLanguage; // ex: "fr-FR" ou "en-US"
const lang = userLang.split('-')[0]; // "fr" ou "en"

// Texte traduit
const translations = {
  fr: {
    welcome: "Bienvenue au Restaurant",
    description: "Découvrez notre cuisine méditerranéenne.",
    menuBtn: "Voir le menu",
    reserveTitle: "Réserver une table"
  },
  en: {
    welcome: "Welcome to the Restaurant",
    description: "Discover our Mediterranean cuisine.",
    menuBtn: "See the menu",
    reserveTitle: "Book a table"
  }
};

// Appliquer les traductions
function applyLanguage(lang) {
  const t = translations[lang] || translations['en']; // fallback en anglais
  const heroTitle = document.querySelector('.hero-intro h2');
  const heroDesc = document.querySelector('.hero-intro p');
  const heroBtn = document.querySelector('.hero-intro .btn');
  const reserveH2 = document.querySelector('#reservationPage h2');

  if(heroTitle) heroTitle.textContent = t.welcome;
  if(heroDesc) heroDesc.textContent = t.description;
  if(heroBtn) heroBtn.textContent = t.menuBtn;
  if(reserveH2) reserveH2.textContent = t.reserveTitle;
}

// Appliquer dès le chargement
applyLanguage(lang);