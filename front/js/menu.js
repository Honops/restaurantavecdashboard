// js/menu.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// =============================================
// CONFIG SUPABASE
// =============================================

const SUPABASE_URL = 'https://hkutmhlfmcfeyfhftzqb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrdXRtaGxmbWNmZXlmaGZ0enFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDMwMDYsImV4cCI6MjA4ODk3OTAwNn0.ZZv-yKedzZYo3qpQ6tq_bBjG35RL8WiPqrgeryvL0bg'

const supabase      = createClient(SUPABASE_URL, SUPABASE_KEY)


// =============================================
// CONSTANTES
// =============================================

const CATEGORY_LABELS = {
  entree:  '🥗 Entrées',
  plat:    '🍽️ Plats',
  dessert: '🍰 Desserts',
  boisson: '🥤 Boissons',
  promo:   '🏷️ Promos',
}

const CATEGORY_ORDER = ['entree', 'plat', 'dessert', 'boisson', 'promo']


// =============================================
// ÉTAT GLOBAL
// =============================================

let allDishes       = []
let activeTab       = 'semaine'
let activeSubEvent  = null


// =============================================
// INIT
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
  footerYear()
  setActiveTabByDay()
  setupTabs()
  await fetchAllDishes()
  renderActivePanel()
  setupNavToggle()
})


// =============================================
// SUPABASE — Une seule requête pour tout
// =============================================

async function fetchAllDishes() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, price, category, menu_type, event_name, event_date, media_url, media_type')
    .eq('is_visible', true)
    .order('category', { ascending: true })

  if (error) {
    console.error('Erreur chargement menu :', error.message)
    allDishes = []
    return
  }

  allDishes = data || []
}


// =============================================
// LOGIQUE DU JOUR
// =============================================

function getTodayMenuType() {
  const day = new Date().getDay()
  return (day === 0 || day === 6) ? 'weekend' : 'semaine'
}

function getTodayString() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getTodayEvent() {
  const today = getTodayString()
  return allDishes.find(d => d.menu_type === 'evenement' && d.event_date === today) || null
}

function setActiveTabByDay() {
  // Sera affiné après fetchAllDishes dans renderActivePanel
  activeTab = getTodayMenuType()
}


// =============================================
// ONGLETS
// =============================================

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab
      switchTab(tab)
    })
  })
}

function switchTab(tab) {
  activeTab = tab

  // Mettre à jour les boutons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('tab-active', btn.dataset.tab === tab)
  })

  // Masquer tous les panneaux
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.remove('panel-active')
  })

  // Afficher le bon panneau
  const panel = document.getElementById(`panel-${tab}`)
  if (panel) panel.classList.add('panel-active')

  // Sous-onglets événements
  const subtabs = document.getElementById('eventSubtabs')
  if (tab === 'evenement') {
    subtabs.style.display = 'flex'
    renderEventsSubtabs()
  } else {
    subtabs.style.display = 'none'
  }

  renderActivePanel()
  updateSubtitle()
}


// =============================================
// SOUS-ONGLETS ÉVÉNEMENTS
// =============================================

function getUniqueEvents() {
  const today = getTodayString()
  const seen  = new Map()

  allDishes
    .filter(d => d.menu_type === 'evenement' && d.event_name && d.event_date)
    .forEach(d => {
      if (!seen.has(d.event_name)) {
        seen.set(d.event_name, {
          name:    d.event_name,
          date:    d.event_date,
          isToday: d.event_date === today,
        })
      }
    })

  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function renderEventsSubtabs() {
  const container = document.getElementById('eventSubtabs')
  const events    = getUniqueEvents()

  if (events.length === 0) {
    container.innerHTML = '<span class="subtab-empty">Aucun événement programmé</span>'
    activeSubEvent = null
    return
  }

  // Sélectionner automatiquement l'événement du jour ou le premier
  const todayEv = events.find(e => e.isToday)
  if (!activeSubEvent || !events.find(e => e.name === activeSubEvent)) {
    activeSubEvent = todayEv ? todayEv.name : events[0].name
  }

  container.innerHTML = events.map(e => `
    <button
      class="subtab-btn ${e.name === activeSubEvent ? 'subtab-active' : ''} ${e.isToday ? 'subtab-today' : ''}"
      data-event="${e.name}"
    >
      ${e.isToday ? '● ' : ''}${e.name}
      <span class="subtab-date">${formatDateFR(e.date)}</span>
    </button>
  `).join('')

  container.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSubEvent = btn.dataset.event
      renderEventsSubtabs()
      renderEventPanel()
    })
  })
}


// =============================================
// RENDU PRINCIPAL
// =============================================

function renderActivePanel() {
  // Priorité événement du jour
  const todayEvent = getTodayEvent()
  if (todayEvent && activeTab === getTodayMenuType()) {
    switchTab('evenement')
    return
  }

  hideLoading(activeTab)

  if (activeTab === 'evenement') {
    renderEventPanel()
  } else {
    renderMenuPanel(activeTab)
  }

  updateSubtitle()
}

function renderMenuPanel(menuType) {
  const grid = document.getElementById(`grid-${menuType}`)
  if (!grid) return

  hideLoading(menuType)

  const dishes = allDishes.filter(d => d.menu_type === menuType)

  if (dishes.length === 0) {
    grid.innerHTML = emptyState('Aucun plat disponible pour ce menu.')
    return
  }

  grid.innerHTML = renderGroupedDishes(dishes)
  observeVideos()
}

function renderEventPanel() {
  const grid = document.getElementById('grid-evenement')
  if (!grid) return

  hideLoading('evenement')

  if (!activeSubEvent) {
    const events = getUniqueEvents()
    if (events.length === 0) {
      grid.innerHTML = emptyState('Aucun événement programmé.')
      return
    }
    activeSubEvent = events[0].name
  }

  const dishes = allDishes.filter(
    d => d.menu_type === 'evenement' && d.event_name === activeSubEvent
  )

  if (dishes.length === 0) {
    grid.innerHTML = emptyState(`Aucun plat pour l'événement "${activeSubEvent}".`)
    return
  }

  grid.innerHTML = renderGroupedDishes(dishes)
  observeVideos()
}


// =============================================
// RENDU DES PLATS GROUPÉS PAR CATÉGORIE
// =============================================

function renderGroupedDishes(dishes) {
  // Grouper par catégorie
  const groups = {}
  for (const dish of dishes) {
    const cat = dish.category || 'autre'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(dish)
  }

  // Trier selon l'ordre défini
  const ordered = {}
  for (const key of CATEGORY_ORDER) {
    if (groups[key]) ordered[key] = groups[key]
  }
  for (const key of Object.keys(groups)) {
    if (!ordered[key]) ordered[key] = groups[key]
  }

  return Object.entries(ordered).map(([cat, catDishes]) => `
    <div class="menu-category">

      <h2 class="category-title">
        ${CATEGORY_LABELS[cat] || cat}
        <span class="category-count">${catDishes.length}</span>
      </h2>

      <div class="dishes-grid">
        ${renderDishesInGrid(catDishes)}
      </div>

    </div>
  `).join('')
}


// =============================================
// RENDU DES PLATS DANS LA GRILLE
// 2 images par ligne, vidéo en dessous
// =============================================

function renderDishesInGrid(dishes) {
  let html      = ''
  let imgGroup  = []
  let imgCount  = 0
  let vidCount  = 0

  const MAX_IMG = 4
  const MAX_VID = 1

  const flushImages = () => {
    if (imgGroup.length === 0) return
    html += imgGroup.map(d => renderImageCard(d)).join('')
    imgGroup = []
  }

  for (const dish of dishes) {
    const isVideo = dish.media_type === 'video' || isVideoUrl(dish.media_url)

    if (isVideo) {
      if (vidCount >= MAX_VID) continue // Tronquer silencieusement
      flushImages()
      html += renderVideoCard(dish)
      vidCount++
    } else {
      if (imgCount >= MAX_IMG) continue // Tronquer silencieusement
      imgGroup.push(dish)
      imgCount++
      if (imgGroup.length === 2) flushImages()
    }
  }

  flushImages()
  return html
}


// =============================================
// CARTES
// =============================================

function renderImageCard(dish) {
  const imgHtml = dish.media_url
    ? `<img
        src="${dish.media_url}"
        alt="${escHtml(dish.name)}"
        class="dish-img"
        loading="lazy"
        decoding="async"
      >`
    : `<div class="dish-no-img">🍽️</div>`

  return `
    <div class="dish-card">
      <div class="dish-img-wrapper">
        ${imgHtml}
      </div>
      <div class="dish-info">
        <p class="dish-name">${escHtml(dish.name)}</p>
        <div class="dish-bottom">
          <span class="dish-price">${parseFloat(dish.price).toFixed(2)} €</span>
          <span class="dish-category">${CATEGORY_LABELS[dish.category] || dish.category}</span>
        </div>
      </div>
    </div>
  `
}

function renderVideoCard(dish) {
  return `
    <div class="dish-video-card">
      <div class="dish-video-wrapper">
        <video
          class="dish-video"
          src="${dish.media_url}"
          muted
          loop
          playsinline
          preload="none"
          data-autoplay
        ></video>
      </div>
      <div class="dish-video-info">
        <p class="dish-name">${escHtml(dish.name)}</p>
        <div class="dish-bottom">
          <span class="dish-price">${parseFloat(dish.price).toFixed(2)} €</span>
          <span class="dish-category">${CATEGORY_LABELS[dish.category] || dish.category}</span>
        </div>
      </div>
    </div>
  `
}


// =============================================
// AUTOPLAY VIDÉO — IntersectionObserver
// =============================================

function observeVideos() {
  const videos = document.querySelectorAll('video[data-autoplay]')
  if (!videos.length) return

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target
      if (entry.isIntersecting) {
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    })
  }, { threshold: 0.4 })

  videos.forEach(v => observer.observe(v))
}


// =============================================
// SOUS-TITRE HERO
// =============================================

function updateSubtitle() {
  const el      = document.getElementById('menuSubtitle')
  if (!el) return

  const today   = new Date()
  const dayName = today.toLocaleDateString('fr-FR', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const todayEvent = getTodayEvent()

  if (activeTab === 'evenement' && activeSubEvent) {
    const isToday = todayEvent?.event_name === activeSubEvent
    el.textContent = isToday
      ? `🎉 Événement spécial aujourd'hui : ${activeSubEvent}`
      : `🎉 Événement : ${activeSubEvent}`
  } else if (activeTab === 'weekend') {
    el.textContent = `🌅 Menu week-end — ${dayName} ${dateStr}`
  } else {
    el.textContent = `📅 Menu de la semaine — ${dayName} ${dateStr}`
  }
}


// =============================================
// HELPERS
// =============================================

function hideLoading(tab) {
  const loader = document.getElementById(`loading-${tab}`)
  if (loader) loader.classList.add('hidden')
}

function emptyState(msg) {
  return `
    <div class="menu-empty">
      <span class="menu-empty-icon">🍽️</span>
      <p>${msg}</p>
    </div>
  `
}

function isVideoUrl(url) {
  if (!url) return false
  return ['.mp4', '.webm', '.ogg'].some(ext => url.toLowerCase().includes(ext))
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDateFR(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function footerYear() {
  const el = document.getElementById('footerYear')
  if (el) el.textContent = new Date().getFullYear()
}

function setupNavToggle() {
  const toggle = document.getElementById('navToggle')
  const nav    = document.getElementById('siteNav')
  if (!toggle || !nav) return

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open')
    nav.classList.toggle('nav-open')
  })

  // Fermer si clic en dehors
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !nav.contains(e.target)) {
      toggle.classList.remove('open')
      nav.classList.remove('nav-open')
    }
  })
}