// config.js
// Ezt a fájlt kell módosítani, ha elkészül a backend.
// A GitHub Pages csak statikus fájlokat szolgál ki, ezért a fórum
// egy külön helyen (pl. Render, Railway, Fly.io, saját szerver) futó
// API-t hív meg. A backend tervét lásd: backend-terv.md

window.APP_CONFIG = {
  // A backend gyökér URL-je, "/api" nélkül vagy azzal, ahogy a backend-terv.md
  // előírja. Pl.: "https://karolyi-forum-api.onrender.com/api"
  API_BASE_URL: "https://bind-referred-ooo-lots.trycloudflare.com/api",

  // Oldalankénti témák/hozzászólások száma
  PAGE_SIZE: 20,

  // A kollégium neve, ha máshol is kelleni fog
  SITE_NAME: "Károlyi Mihály Kollégium Fórum",
};
