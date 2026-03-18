// js/ui/dashboardUI.js

import { getAllDishes, groupDishesByMenuType, getDashboardStats, MENU_TYPE_LABELS, CATEGORY_LABELS } from '../logic/menuLogic.js'
import { getEventsSummary } from '../logic/eventLogic.js'
import { formatDateDisplay } from '../logic/dateUtils.js'
import { isVideoUrl } from '../utils/mediaUpload.js'
import { deleteDish, toggleDishVisibility, openEditModal } from '../dishActions.js'
import { initAddDishForm } from '../addDish.js'

// =============================================
// DASHBOARD UI
// Affichage complet du dashboard admin
// =============================================


// --- Chargement principal du dashboard ---

export async function loadDashboard() {
  await Promise.all([
    renderStats(),
    renderEventsBanner(),
    renderDishesList(),
  ])

  initAddDishForm()
  initSearch()        // ← Ajouter cette ligne
}

// --- Statistiques en haut du dashboard ---

async function renderStats() {
  const container = document.getElementById('dashboardStats')
  if (!container) return

  const stats = await getDashboardStats()

  container.innerHTML = `
    <div class="stat-card">
      <span class="stat-icon">🍽️</span>
      <div class="stat-info">
        <span class="stat-number">${stats.total}</span>
        <span class="stat-label">Plats total</span>
      </div>
    </div>

    <div class="stat-card">
      <span class="stat-icon">📅</span>
      <div class="stat-info">
        <span class="stat-number">${stats.semaine}</span>
        <span class="stat-label">Menu semaine</span>
      </div>
    </div>

    <div class="stat-card">
      <span class="stat-icon">🌅</span>
      <div class="stat-info">
        <span class="stat-number">${stats.weekend}</span>
        <span class="stat-label">Menu week-end</span>
      </div>
    </div>

    <div class="stat-card">
      <span class="stat-icon">🎉</span>
      <div class="stat-info">
        <span class="stat-number">${stats.evenement}</span>
        <span class="stat-label">Événements</span>
      </div>
    </div>

    <div class="stat-card stat-today">
      <span class="stat-icon">📍</span>
      <div class="stat-info">
        <span class="stat-number">${stats.todayType === 'weekend' ? 'Week-end' : 'Semaine'}</span>
        <span class="stat-label">Menu actif aujourd'hui</span>
      </div>
    </div>
  `
}


// --- Bannière des événements programmés ---

async function renderEventsBanner() {
  const container = document.getElementById('eventsBanner')
  if (!container) return

  const events = await getEventsSummary()

  if (events.length === 0) {
    container.innerHTML = `
      <div class="events-banner empty">
        <span>📭 Aucun événement programmé</span>
      </div>
    `
    return
  }

  const items = events.map(e => `
    <div class="event-badge ${e.isToday ? 'event-today' : ''}">
      <span class="event-badge-name">${e.name}</span>
      <span class="event-badge-date">${e.dateDisplay}</span>
      ${e.isToday ? '<span class="event-badge-now">● Aujourd\'hui</span>' : ''}
    </div>
  `).join('')

  container.innerHTML = `
    <div class="events-banner">
      <span class="events-banner-title">🎉 Événements programmés (${events.length}/4) :</span>
      <div class="events-badges">${items}</div>
    </div>
  `
}

// --- Liste complète des plats ---

async function renderDishesList(query = '') {
 const container = document.getElementById('menuDashboard')
  if (!container) return

  const dishes = await getAllDishes()
  const filtered = query ? filterDishes(dishes, query) : dishes
  const grouped = groupDishesByMenuType(filtered)

  if (filtered.length === 0) {
    container.innerHTML = `<p class="empty-state">Aucun plat trouvé.</p>`
    return
  }

  let html = ''
  for (const [menuType, items] of Object.entries(grouped)) {
    const label = MENU_TYPE_LABELS[menuType] || menuType
    html += `<h3 class="menu-type-title">${label}</h3>`
    html += `<div class="dishes-grid">`
    html += items.map(dish => renderDishCard(dish, query)).join('')
    html += `</div>`
  }

  container.innerHTML = html
  attachDishActions()
}
// --- Liste complète des plats ---

function renderDishCard(dish, query = '') {
  const categoryLabel = CATEGORY_LABELS[dish.category] || dish.category
  const isVideo       = isVideoUrl(dish.media_url)
  const isHidden      = !dish.is_visible

  // Surligner le nom si recherche active
  const dishName = query
    ? highlightText(dish.name, query)
    : escHtml(dish.name)

  const mediaHtml = dish.media_url
    ? isVideo
      ? `<video src="${dish.media_url}" class="dish-media" muted playsinline></video>`
      : `<img src="${dish.media_url}" alt="${escHtml(dish.name)}" class="dish-media" loading="lazy">`
    : `<div class="dish-media-placeholder">🍽️</div>`

  const eventInfo = dish.menu_type === 'evenement' && dish.event_name
    ? `<span class="dish-event-tag">🎉 ${dish.event_name} — ${formatDateDisplay(dish.event_date)}</span>`
    : ''

  return `
    <div class="dish-card ${isHidden ? 'dish-hidden' : ''}" data-id="${dish.id}">
      <div class="dish-media-wrapper">
        ${mediaHtml}
        ${isHidden ? '<div class="dish-hidden-overlay">Masqué</div>' : ''}
      </div>
      <div class="dish-card-body">
        <div class="dish-card-top">
          <h4 class="dish-name">${dishName}</h4>
          <span class="dish-price">${parseFloat(dish.price).toFixed(2)} €</span>
        </div>
        <div class="dish-card-meta">
          <span class="dish-category-tag">${categoryLabel}</span>
          ${eventInfo}
        </div>
        <div class="dish-card-actions">
          <button class="btn-action btn-duplicate" data-id="${dish.id}" title="Dupliquer">📋</button>
          <button class="btn-action btn-edit"      data-id="${dish.id}" title="Modifier">✏️</button>
          <button class="btn-action btn-toggle"    data-id="${dish.id}" data-visible="${dish.is_visible}" title="${dish.is_visible ? 'Masquer' : 'Afficher'}">${dish.is_visible ? '👁' : '🚫'}</button>
          <button class="btn-action btn-delete"    data-id="${dish.id}" data-media="${dish.media_url || ''}" title="Supprimer">🗑️</button>
        </div>
      </div>
    </div>
  `
}




// --- Attacher les actions aux boutons des cartes ---

function attachDishActions() {
  // Boutons Modifier
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id)
      const { getDishById } = await import('../logic/menuLogic.js')
      const dish = await getDishById(id)
      if (dish) openEditModal(dish)
    })
  })

  // Boutons Toggle visibilité
  document.querySelectorAll('.btn-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id)
      const visible = btn.dataset.visible === 'true'
      await toggleDishVisibility(id, visible)
    })
  })

  // Boutons Supprimer
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id)
      const mediaUrl = btn.dataset.media || null
      await deleteDish(id, mediaUrl)
    })
  })
}
// --- Filtrer les plats selon une recherche ---

function filterDishes(dishes, query) {
  const q = query.toLowerCase().trim()
  return dishes.filter(dish =>
    dish.name?.toLowerCase().includes(q)        ||
    dish.category?.toLowerCase().includes(q)    ||
    dish.menu_type?.toLowerCase().includes(q)   ||
    dish.event_name?.toLowerCase().includes(q)  ||
    String(dish.price).includes(q)
  )
}


// --- Surligner le texte trouvé ---

function highlightText(text, query) {
  if (!query || !text) return escHtml(text)
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex   = new RegExp(`(${escaped})`, 'gi')
  return escHtml(text).replace(regex, '<mark class="search-highlight">$1</mark>')
}


// --- Échapper le HTML ---

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}


// --- Initialiser la recherche ---

export function initSearch() {
  const input     = document.getElementById('dishSearch')
  const clearBtn  = document.getElementById('searchClear')
  if (!input) return

  let debounceTimer = null

  input.addEventListener('input', () => {
    const query = input.value.trim()

    // Afficher/cacher le bouton clear
    clearBtn.style.display = query ? 'block' : 'none'

    // Debounce 300ms pour ne pas requêter à chaque frappe
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      renderDishesList(query)
      attachDishActions()
    }, 300)
  })

  clearBtn.addEventListener('click', () => {
    input.value            = ''
    clearBtn.style.display = 'none'
    renderDishesList('')
    input.focus()
  })
}