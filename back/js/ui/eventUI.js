// js/ui/eventUI.js

import { getEventsSummary, deleteEventByDate } from '../logic/eventLogic.js'
import { formatDateDisplay } from '../logic/dateUtils.js'
import { loadDashboard } from './dashboardUI.js'

// =============================================
// EVENT UI
// Affichage et gestion des événements programmés
// =============================================


// --- Rendre le panneau complet des événements ---

export async function renderEventsPanel() {
  const container = document.getElementById('eventsPanel')
  if (!container) return

  container.innerHTML = '<p class="loading-text">Chargement...</p>'

  const events = await getEventsSummary()

  if (events.length === 0) {
    container.innerHTML = `
      <div class="events-empty">
        <span class="events-empty-icon">📭</span>
        <p>Aucun événement programmé.</p>
        <p class="muted">Ajoutez un plat de type "Événement" pour commencer.</p>
      </div>
    `
    return
  }

  const html = `
    <div class="events-panel-header">
      <h3>🎉 Événements programmés</h3>
      <span class="events-counter ${events.length >= 4 ? 'counter-full' : ''}">
        ${events.length}/4
      </span>
    </div>

    ${events.length >= 4 ? `
      <div class="events-limit-warning">
        ⚠️ Limite atteinte. Supprimez un événement pour en ajouter un nouveau.
      </div>
    ` : ''}

    <div class="events-list">
      ${events.map(e => renderEventRow(e)).join('')}
    </div>
  `

  container.innerHTML = html

  // Attacher les actions
  attachEventActions()
}


// --- Rendre une ligne d'événement ---

function renderEventRow(event) {
  const statusClass = event.isToday
    ? 'event-status-today'
    : event.isPast
      ? 'event-status-past'
      : 'event-status-upcoming'

  const statusLabel = event.isToday
    ? '● Aujourd\'hui'
    : event.isPast
      ? '✓ Passé'
      : '◷ À venir'

  return `
    <div class="event-row ${event.isPast ? 'event-row-past' : ''}" data-date="${event.date}">

      <div class="event-row-left">
        <div class="event-row-icon">🎉</div>
        <div class="event-row-info">
          <span class="event-row-name">${event.name}</span>
          <span class="event-row-date">${event.dateDisplay}</span>
        </div>
      </div>

      <div class="event-row-right">
        <span class="event-status-badge ${statusClass}">
          ${statusLabel}
        </span>
        <button
          class="btn-action btn-delete-event"
          data-date="${event.date}"
          data-name="${event.name}"
          title="Supprimer cet événement"
        >🗑️</button>
      </div>

    </div>
  `
}


// --- Attacher les actions sur les événements ---

function attachEventActions() {
  document.querySelectorAll('.btn-delete-event').forEach(btn => {
    btn.addEventListener('click', async () => {
      const date = btn.dataset.date
      const name = btn.dataset.name

      const confirmed = confirm(
        `Supprimer l'événement "${name}" du ${formatDateDisplay(date)} ?\n\nTous les plats associés à cet événement seront supprimés.`
      )
      if (!confirmed) return

      const result = await deleteEventByDate(date)

      if (!result.success) {
        alert(result.message)
        return
      }

      await loadDashboard()
      await renderEventsPanel()
    })
  })
}


// --- Mini widget événement du jour (pour le header) ---

export async function renderTodayEventWidget() {
  const container = document.getElementById('todayEventWidget')
  if (!container) return

  const events = await getEventsSummary()
  const todayEvent = events.find(e => e.isToday)

  if (!todayEvent) {
    container.style.display = 'none'
    return
  }

  container.style.display = 'flex'
  container.innerHTML = `
    <div class="today-event-widget">
      <span class="today-event-dot"></span>
      <span class="today-event-text">
        🎉 Événement actif : <strong>${todayEvent.name}</strong>
      </span>
    </div>
  `
}


// --- Tooltip informatif sur les règles événements ---

export function renderEventRulesInfo() {
  return `
    <div class="event-rules-info">
      <details>
        <summary>ℹ️ Règles des événements</summary>
        <ul>
          <li>Maximum <strong>4 événements</strong> programmés à l'avance.</li>
          <li>Un seul événement <strong>par jour</strong>.</li>
          <li>Le menu événement est <strong>prioritaire</strong> sur semaine et week-end.</li>
          <li>Supprimer un événement supprime <strong>tous ses plats</strong>.</li>
        </ul>
      </details>
    </div>
  `
}