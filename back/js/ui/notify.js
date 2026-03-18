// js/ui/notify.js

// =============================================
// SYSTÈME DE NOTIFICATIONS & MODALS
// Remplace tous les alert() et confirm() natifs
// =============================================


// --- Injecter le CSS des notifications au chargement ---

function injectNotifyStyles() {
  if (document.getElementById('notify-styles')) return

  const style = document.createElement('style')
  style.id = 'notify-styles'
  style.textContent = `
    /* Toast notifications */
    #notify-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    .notify-toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 0.88rem;
      font-weight: 500;
      max-width: 320px;
      pointer-events: all;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      animation: notifyIn 0.3s ease forwards;
      border: 1px solid transparent;
    }

    .notify-toast.notify-exit {
      animation: notifyOut 0.3s ease forwards;
    }

    .notify-success {
      background: #0f2a1e;
      border-color: #4caf82;
      color: #4caf82;
    }

    .notify-error {
      background: #2a0f0f;
      border-color: #e05c5c;
      color: #e05c5c;
    }

    .notify-warning {
      background: #2a1e0f;
      border-color: #e8a838;
      color: #e8a838;
    }

    .notify-info {
      background: #0f1e2a;
      border-color: #5ca8e0;
      color: #5ca8e0;
    }

    .notify-icon { font-size: 1rem; flex-shrink: 0; }
    .notify-text { flex: 1; line-height: 1.4; }

    .notify-close {
      background: none;
      border: none;
      color: inherit;
      opacity: 0.6;
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0 2px;
      flex-shrink: 0;
    }

    .notify-close:hover { opacity: 1; }

    @keyframes notifyIn {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    @keyframes notifyOut {
      from { opacity: 1; transform: translateX(0); }
      to   { opacity: 0; transform: translateX(20px); }
    }

    /* Modal de confirmation */
    #confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      backdrop-filter: blur(4px);
      animation: fadeInOverlay 0.2s ease;
    }

    @keyframes fadeInOverlay {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    #confirm-card {
      background: #1a1a1a;
      border: 1px solid #2e2e2e;
      border-radius: 16px;
      padding: 28px 28px 24px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 8px 40px rgba(0,0,0,0.6);
      animation: slideUpCard 0.25s ease;
    }

    @keyframes slideUpCard {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    #confirm-icon {
      font-size: 2rem;
      text-align: center;
      display: block;
      margin-bottom: 12px;
    }

    #confirm-title {
      font-size: 1rem;
      font-weight: 700;
      color: #f0f0f0;
      text-align: center;
      margin-bottom: 8px;
    }

    #confirm-message {
      font-size: 0.85rem;
      color: #888;
      text-align: center;
      line-height: 1.5;
      margin-bottom: 24px;
    }

    #confirm-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    .confirm-btn {
      flex: 1;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .confirm-btn-cancel {
      background: transparent;
      border-color: #2e2e2e;
      color: #888;
    }

    .confirm-btn-cancel:hover {
      border-color: #555;
      color: #f0f0f0;
    }

    .confirm-btn-danger {
      background: #e05c5c;
      color: #fff;
    }

    .confirm-btn-danger:hover {
      background: #c94444;
    }

    .confirm-btn-primary {
      background: #e8c97e;
      color: #111;
    }

    .confirm-btn-primary:hover {
      background: #f0d896;
    }

    @media (max-width: 480px) {
      #notify-container {
        bottom: 16px;
        right: 16px;
        left: 16px;
      }
      .notify-toast { max-width: 100%; }
    }
  `
  document.head.appendChild(style)
}


// =============================================
// TOASTS
// =============================================

function getOrCreateContainer() {
  let container = document.getElementById('notify-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'notify-container'
    document.body.appendChild(container)
  }
  return container
}

function showToast(message, type = 'info', duration = 4000) {
  injectNotifyStyles()

  const icons = {
    success: '✅',
    error:   '❌',
    warning: '⚠️',
    info:    'ℹ️',
  }

  const container = getOrCreateContainer()
  const toast     = document.createElement('div')
  toast.className = `notify-toast notify-${type}`

  toast.innerHTML = `
    <span class="notify-icon">${icons[type] || 'ℹ️'}</span>
    <span class="notify-text">${message}</span>
    <button class="notify-close" aria-label="Fermer">✕</button>
  `

  // Fermeture manuelle
  toast.querySelector('.notify-close').addEventListener('click', () => {
    dismissToast(toast)
  })

  container.appendChild(toast)

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(toast), duration)

  // Pause au survol
  toast.addEventListener('mouseenter', () => clearTimeout(timer))
  toast.addEventListener('mouseleave', () => {
    setTimeout(() => dismissToast(toast), 1500)
  })
}

function dismissToast(toast) {
  if (!toast || !toast.parentNode) return
  toast.classList.add('notify-exit')
  toast.addEventListener('animationend', () => toast.remove(), { once: true })
}

// Fonctions raccourcies
export const notify = {
  success: (msg, duration) => showToast(msg, 'success', duration),
  error:   (msg, duration) => showToast(msg, 'error',   duration),
  warning: (msg, duration) => showToast(msg, 'warning', duration),
  info:    (msg, duration) => showToast(msg, 'info',    duration),
}


// =============================================
// MODAL DE CONFIRMATION
// =============================================

export function confirmModal({
  title   = 'Confirmer',
  message = 'Êtes-vous sûr ?',
  icon    = '⚠️',
  confirmLabel = 'Confirmer',
  cancelLabel  = 'Annuler',
  danger  = false,
} = {}) {
  injectNotifyStyles()

  return new Promise((resolve) => {
    // Supprimer un éventuel modal existant
    document.getElementById('confirm-overlay')?.remove()

    const overlay = document.createElement('div')
    overlay.id    = 'confirm-overlay'

    overlay.innerHTML = `
      <div id="confirm-card">
        <span id="confirm-icon">${icon}</span>
        <p id="confirm-title">${title}</p>
        <p id="confirm-message">${message}</p>
        <div id="confirm-actions">
          <button class="confirm-btn confirm-btn-cancel" id="confirmCancel">
            ${cancelLabel}
          </button>
          <button class="confirm-btn ${danger ? 'confirm-btn-danger' : 'confirm-btn-primary'}" id="confirmOk">
            ${confirmLabel}
          </button>
        </div>
      </div>
    `

    const close = (result) => {
      overlay.style.animation = 'fadeInOverlay 0.2s ease reverse'
      overlay.addEventListener('animationend', () => {
        overlay.remove()
        resolve(result)
      }, { once: true })
    }

    overlay.querySelector('#confirmOk').addEventListener('click',     () => close(true))
    overlay.querySelector('#confirmCancel').addEventListener('click', () => close(false))
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false)
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close(false)
      if (e.key === 'Enter')  close(true)
    }, { once: true })

    document.body.appendChild(overlay)
  })
}