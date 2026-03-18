// js/ui/reservationUI.js

import { supabase } from '../supabaseClient.js'
import { notify, confirmModal } from './notify.js'

// =============================================
// GESTION DES RÉSERVATIONS — DASHBOARD
// =============================================


// --- État global ---

let allReservations  = []
let activeFilter     = 'tous'
let activeDateFilter = ''


// =============================================
// INIT
// =============================================

export async function initReservations() {
  renderReservationsPanel()
  await loadReservations()
}


// =============================================
// CHARGEMENT DEPUIS SUPABASE
// =============================================

async function loadReservations() {
  showReservationsLoading(true)

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  showReservationsLoading(false)

  if (error) {
    console.error('Erreur chargement réservations :', error.message)
    notify.error('Erreur lors du chargement des réservations.')
    return
  }

  allReservations = data || []
  renderReservationStats()
  renderReservationsList()
}


// =============================================
// RENDU DU PANNEAU PRINCIPAL
// =============================================

function renderReservationsPanel() {
  const container = document.getElementById('reservationsPanel')
  if (!container) return

  container.innerHTML = `

    <!-- Stats rapides -->
    <div class="res-stats-grid" id="resStatsGrid"></div>

    <!-- Filtres -->
    <div class="res-filters">

      <div class="res-filter-tabs" id="resFilterTabs">
        <button class="res-filter-btn active" data-filter="tous">
          Toutes
        </button>
        <button class="res-filter-btn" data-filter="en_attente">
          ⏳ En attente
        </button>
        <button class="res-filter-btn" data-filter="confirmee">
          ✅ Confirmées
        </button>
        <button class="res-filter-btn" data-filter="annulee">
          ❌ Annulées
        </button>
      </div>

      <div class="res-filter-right">
        <input
          type="date"
          id="resDateFilter"
          class="res-date-filter"
          title="Filtrer par date"
        >
        <button id="resClearDate" class="res-clear-date" style="display:none;" title="Effacer le filtre">
          ✕
        </button>
      </div>

    </div>

    <!-- Info résultats -->
    <div id="resFilterInfo" class="res-filter-info" style="display:none;"></div>

    <!-- Loading -->
    <div id="resLoading" class="res-loading" style="display:none;">
      <div class="spinner-ring"></div>
    </div>

    <!-- Liste -->
    <div id="resList"></div>

  `

  // Attacher les filtres
  setupReservationFilters()
}


// =============================================
// STATISTIQUES
// =============================================

function renderReservationStats() {
  const container = document.getElementById('resStatsGrid')
  if (!container) return

  const today     = getTodayString()
  const total     = allReservations.length
  const enAttente = allReservations.filter(r => r.status === 'en_attente').length
  const confirmee = allReservations.filter(r => r.status === 'confirmee').length
  const annulee   = allReservations.filter(r => r.status === 'annulee').length
  const aujourdhui = allReservations.filter(r => r.date === today).length

  container.innerHTML = `
    <div class="res-stat-card">
      <span class="res-stat-icon">📋</span>
      <div class="res-stat-info">
        <span class="res-stat-number">${total}</span>
        <span class="res-stat-label">Total</span>
      </div>
    </div>

    <div class="res-stat-card res-stat-warning">
      <span class="res-stat-icon">⏳</span>
      <div class="res-stat-info">
        <span class="res-stat-number">${enAttente}</span>
        <span class="res-stat-label">En attente</span>
      </div>
    </div>

    <div class="res-stat-card res-stat-success">
      <span class="res-stat-icon">✅</span>
      <div class="res-stat-info">
        <span class="res-stat-number">${confirmee}</span>
        <span class="res-stat-label">Confirmées</span>
      </div>
    </div>

    <div class="res-stat-card res-stat-error">
      <span class="res-stat-icon">❌</span>
      <div class="res-stat-info">
        <span class="res-stat-number">${annulee}</span>
        <span class="res-stat-label">Annulées</span>
      </div>
    </div>

    <div class="res-stat-card res-stat-today">
      <span class="res-stat-icon">📍</span>
      <div class="res-stat-info">
        <span class="res-stat-number">${aujourdhui}</span>
        <span class="res-stat-label">Aujourd'hui</span>
      </div>
    </div>
  `
}


// =============================================
// FILTRES
// =============================================

function setupReservationFilters() {
  // Filtres par statut
  document.querySelectorAll('.res-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.res-filter-btn').forEach(b => {
        b.classList.remove('active')
      })
      btn.classList.add('active')
      activeFilter = btn.dataset.filter
      renderReservationsList()
    })
  })

  // Filtre par date
  const dateFilter = document.getElementById('resDateFilter')
  const clearDate  = document.getElementById('resClearDate')

  dateFilter?.addEventListener('change', () => {
    activeDateFilter = dateFilter.value
    clearDate.style.display = activeDateFilter ? 'inline-block' : 'none'
    renderReservationsList()
  })

  clearDate?.addEventListener('click', () => {
    dateFilter.value = ''
    activeDateFilter = ''
    clearDate.style.display = 'none'
    renderReservationsList()
  })
}

function getFilteredReservations() {
  return allReservations.filter(r => {
    const matchStatus = activeFilter === 'tous' || r.status === activeFilter
    const matchDate   = !activeDateFilter || r.date === activeDateFilter
    return matchStatus && matchDate
  })
}


// =============================================
// LISTE DES RÉSERVATIONS
// =============================================

function renderReservationsList() {
  const container = document.getElementById('resList')
  if (!container) return

  const filtered = getFilteredReservations()

  // Info résultats
  const info = document.getElementById('resFilterInfo')
  if (info) {
    const hasFilter = activeFilter !== 'tous' || activeDateFilter
    if (hasFilter) {
      info.style.display  = 'block'
      info.innerHTML      = `<span>${filtered.length}</span> réservation${filtered.length > 1 ? 's' : ''} trouvée${filtered.length > 1 ? 's' : ''}`
    } else {
      info.style.display = 'none'
    }
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="res-empty">
        <span class="res-empty-icon">📭</span>
        <p>Aucune réservation trouvée.</p>
      </div>
    `
    return
  }

  // Grouper par date
  const grouped = groupByDate(filtered)

  container.innerHTML = Object.entries(grouped).map(([date, reservations]) => `
    <div class="res-date-group">

      <div class="res-date-header">
        <span class="res-date-label">${formatDateFR(date)}</span>
        <span class="res-date-count">
          ${reservations.length} réservation${reservations.length > 1 ? 's' : ''}
        </span>
      </div>

      <div class="res-cards">
        ${reservations.map(r => renderReservationCard(r)).join('')}
      </div>

    </div>
  `).join('')

  attachReservationActions()
}


// =============================================
// CARTE RÉSERVATION
// =============================================

function renderReservationCard(r) {
  const statusConfig = {
    en_attente: { label: '⏳ En attente', class: 'status-en_attente' },
    confirmee:  { label: '✅ Confirmée',  class: 'status-confirmee'  },
    annulee:    { label: '❌ Annulée',    class: 'status-annulee'    },
  }

  const status  = statusConfig[r.status] || statusConfig.en_attente
  const today   = getTodayString()
  const isToday = r.date === today
  const isPast  = r.date < today

  const occasionBadge = r.occasion
    ? `<span class="res-occasion-badge">${r.occasion}</span>`
    : ''

  const allergyLine = r.allergy
    ? `<div class="res-detail-row res-allergy">⚠️ ${escHtml(r.allergy)}</div>`
    : ''

  const messageLine = r.message
    ? `<div class="res-detail-row res-message">💬 "${escHtml(r.message)}"</div>`
    : ''

  return `
    <div class="res-card ${isPast ? 'res-card-past' : ''} ${isToday ? 'res-card-today' : ''}"
         data-id="${r.id}">

      <div class="res-card-header">
        <div class="res-card-header-left">
          <span class="res-number">${r.reservation_number}</span>
          ${isToday ? '<span class="res-today-badge">● Aujourd\'hui</span>' : ''}
          ${occasionBadge}
        </div>
        <span class="res-status-badge ${status.class}">${status.label}</span>
      </div>

      <div class="res-card-body">

        <div class="res-card-main">

          <div class="res-client-info">
            <span class="res-client-name">
              ${escHtml(r.firstname)} ${escHtml(r.lastname)}
            </span>
            <a href="mailto:${escHtml(r.email)}" class="res-client-email">
              ${escHtml(r.email)}
            </a>
            <a href="tel:${escHtml(r.phone)}" class="res-client-phone">
              📞 ${escHtml(r.phone)}
            </a>
          </div>

          <div class="res-booking-info">
            <div class="res-booking-row">
              <span>🕐</span>
              <strong>${r.time?.slice(0, 5)}</strong>
            </div>
            <div class="res-booking-row">
              <span>👥</span>
              <strong>${r.people} pers.</strong>
            </div>
            <div class="res-booking-row">
              <span>🪑</span>
              <strong>${capitalize(r.seating)}</strong>
            </div>
          </div>

        </div>

        ${allergyLine}
        ${messageLine}

      </div>

      <div class="res-card-actions">
        ${r.status !== 'confirmee' ? `
          <button
            class="btn-res-action btn-confirm"
            data-id="${r.id}"
            title="Confirmer"
          >✅ Confirmer</button>
        ` : ''}

        ${r.status !== 'annulee' ? `
          <button
            class="btn-res-action btn-cancel-res"
            data-id="${r.id}"
            title="Annuler"
          >❌ Annuler</button>
        ` : ''}

        <button
          class="btn-res-action btn-delete-res"
          data-id="${r.id}"
          data-name="${escHtml(r.firstname)} ${escHtml(r.lastname)}"
          title="Supprimer"
        >🗑️ Supprimer</button>
      </div>

    </div>
  `
}


// =============================================
// ACTIONS SUR LES RÉSERVATIONS
// =============================================

function attachReservationActions() {
  // Confirmer
  document.querySelectorAll('.btn-confirm').forEach(btn => {
    btn.addEventListener('click', async () => {
      await updateReservationStatus(parseInt(btn.dataset.id), 'confirmee')
    })
  })

  // Annuler
  document.querySelectorAll('.btn-cancel-res').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = await confirmModal({
        title:        'Annuler cette réservation ?',
        message:      'Le statut passera à "Annulée". Vous pourrez la supprimer ensuite.',
        icon:         '❌',
        confirmLabel: 'Annuler la réservation',
        cancelLabel:  'Retour',
        danger:       true,
      })
      if (confirmed) {
        await updateReservationStatus(parseInt(btn.dataset.id), 'annulee')
      }
    })
  })

  // Supprimer
  document.querySelectorAll('.btn-delete-res').forEach(btn => {
    btn.addEventListener('click', async () => {
      const name      = btn.dataset.name
      const confirmed = await confirmModal({
        title:        'Supprimer cette réservation ?',
        message:      `La réservation de "${name}" sera définitivement supprimée.`,
        icon:         '🗑️',
        confirmLabel: 'Supprimer',
        cancelLabel:  'Annuler',
        danger:       true,
      })
      if (confirmed) {
        await deleteReservation(parseInt(btn.dataset.id))
      }
    })
  })
}


// --- Mettre à jour le statut ---

async function updateReservationStatus(id, status) {
  const { error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('Erreur mise à jour statut :', error.message)
    notify.error('Erreur lors de la mise à jour.')
    return
  }

  const labels = {
    confirmee: 'Réservation confirmée ✅',
    annulee:   'Réservation annulée.',
  }

  notify.success(labels[status] || 'Statut mis à jour.')
  await loadReservations()
}


// --- Supprimer une réservation ---

async function deleteReservation(id) {
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erreur suppression réservation :', error.message)
    notify.error('Erreur lors de la suppression.')
    return
  }

  notify.success('Réservation supprimée.')
  await loadReservations()
}


// =============================================
// LOADING
// =============================================

function showReservationsLoading(show) {
  const loader = document.getElementById('resLoading')
  if (loader) loader.style.display = show ? 'flex' : 'none'
}


// =============================================
// HELPERS
// =============================================

function groupByDate(reservations) {
  const groups = {}
  for (const r of reservations) {
    if (!groups[r.date]) groups[r.date] = []
    groups[r.date].push(r)
  }
  return groups
}

function getTodayString() {
  const d   = new Date()
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateFR(dateStr) {
  if (!dateStr) return ''
  const date    = new Date(dateStr + 'T00:00:00')
  const today   = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.getTime() === today.getTime())    return `📍 Aujourd'hui — ${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
  if (date.getTime() === tomorrow.getTime()) return `⏭️ Demain — ${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`

  return date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}