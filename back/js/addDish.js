// js/addDish.js

import { supabase } from './supabaseClient.js'
import { validateDishForm, validateMedia, checkMediaLimitPerCategory } from './utils/limits.js'
import { validateNewEvent, checkDateConflict } from './logic/eventLogic.js'
import { getFixedEventDate, validateIslamicDate, FIXED_EVENTS, ISLAMIC_EVENTS } from './logic/dateUtils.js'
import { uploadMedia, generatePreview } from './utils/mediaUpload.js'
import { loadDashboard } from './ui/dashboardUI.js'

// =============================================
// FORMULAIRE D'AJOUT DE PLAT
// Gestion dynamique + soumission + Supabase
// =============================================


// --- Initialiser le formulaire ---

export function initAddDishForm() {
  populateEventSelect()
  setupMenuTypeListener()
  setupEventSelectListener()
  setupMediaPreview()
  setupFormSubmit()
}


// --- Remplir le select des événements ---

function populateEventSelect() {
  const select = document.getElementById('eventSelect')
  if (!select) return

  select.innerHTML = '<option value="" disabled selected>Choisir un événement</option>'

  // Événements fixes
  const fixedGroup = document.createElement('optgroup')
  fixedGroup.label = '📅 Dates fixes'
  for (const name of FIXED_EVENTS) {
    const opt = document.createElement('option')
    opt.value = name
    opt.dataset.type = 'fixed'
    opt.textContent = name
    fixedGroup.appendChild(opt)
  }

  // Événements islamiques
  const islamicGroup = document.createElement('optgroup')
  islamicGroup.label = '🌙 Événements islamiques'
  for (const name of ISLAMIC_EVENTS) {
    const opt = document.createElement('option')
    opt.value = name
    opt.dataset.type = 'islamic'
    opt.textContent = name
    islamicGroup.appendChild(opt)
  }

  // Événement custom
  const customGroup = document.createElement('optgroup')
  customGroup.label = '✏️ Personnalisé'
  const customOpt = document.createElement('option')
  customOpt.value = 'custom'
  customOpt.dataset.type = 'custom'
  customOpt.textContent = 'Créer un événement personnalisé'
  customGroup.appendChild(customOpt)

  select.appendChild(fixedGroup)
  select.appendChild(islamicGroup)
  select.appendChild(customGroup)
}


// --- Gérer l'affichage dynamique selon le type de menu ---

function setupMenuTypeListener() {
  const menuTypeSelect = document.getElementById('serviceMenuType')
  if (!menuTypeSelect) return

  menuTypeSelect.addEventListener('change', () => {
    const value = menuTypeSelect.value
    const isEvent = value === 'evenement'

    // Afficher/cacher la section événement
    toggleElement('eventSelectLabel', isEvent)
    toggleElement('eventSelect', isEvent)

    // Réinitialiser les champs événement si on change de type
    if (!isEvent) {
      resetEventFields()
    }
  })
}


// --- Gérer l'affichage dynamique selon le type d'événement ---

function setupEventSelectListener() {
  const eventSelect = document.getElementById('eventSelect')
  if (!eventSelect) return

  eventSelect.addEventListener('change', async () => {
    const selected = eventSelect.options[eventSelect.selectedIndex]
    const type = selected?.dataset.type
    const value = eventSelect.value

    // Réinitialiser les champs
    resetEventFields(false)

    if (type === 'fixed') {
      // Date automatique → calculée et affichée en lecture seule
      const date = getFixedEventDate(value)
      const dateInput = document.getElementById('eventDate')
      const dateLabel = document.getElementById('eventDateLabel')
      const dateInfo = document.getElementById('eventDateInfo')

      if (dateInput && dateLabel) {
        dateInput.value = date
        dateInput.readOnly = true
        toggleElement('eventDateLabel', true)
        toggleElement('eventDate', true)

        if (dateInfo) {
          dateInfo.textContent = `📅 Date automatique : ${formatDateFR(date)}`
          dateInfo.style.display = 'block'
        }
      }

    } else if (type === 'islamic') {
      // Date manuelle obligatoire
      const dateInput = document.getElementById('eventDate')
      if (dateInput) {
        dateInput.readOnly = false
        dateInput.value = ''
      }
      toggleElement('eventDateLabel', true)
      toggleElement('eventDate', true)

      const dateInfo = document.getElementById('eventDateInfo')
      if (dateInfo) {
        dateInfo.textContent = '🌙 Saisissez la date de début de cet événement.'
        dateInfo.style.display = 'block'
      }

    } else if (type === 'custom') {
      // Nom + date manuels
      toggleElement('eventNameLabel', true)
      toggleElement('eventName', true)
      toggleElement('eventDateLabel', true)
      toggleElement('eventDate', true)

      const dateInput = document.getElementById('eventDate')
      if (dateInput) dateInput.readOnly = false
    }
  })
}


// --- Prévisualisation du média ---

function setupMediaPreview() {
  const mediaInput = document.getElementById('serviceMedia')
  if (!mediaInput) return

  mediaInput.addEventListener('change', async () => {
    const file = mediaInput.files[0]
    const previewContainer = document.getElementById('mediaPreview')
    if (!previewContainer) return

    if (!file) {
      previewContainer.innerHTML = ''
      return
    }

    const dataUrl = await generatePreview(file)
    const isVideo = file.type.startsWith('video/')

    if (isVideo) {
      previewContainer.innerHTML = `
        <video src="${dataUrl}" controls class="media-preview-item"></video>
      `
    } else {
      previewContainer.innerHTML = `
        <img src="${dataUrl}" alt="Prévisualisation" class="media-preview-item">
      `
    }
  })
}


// --- Soumission du formulaire ---

function setupFormSubmit() {
  const form = document.getElementById('serviceForm')
  if (!form) return

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    await handleSubmit()
  })
}

async function handleSubmit() {
  const submitBtn = document.getElementById('submitDishBtn')
  const errorDiv = document.getElementById('formError')
  const successDiv = document.getElementById('formSuccess')

  // Réinitialiser les messages
  hideMessage(errorDiv)
  hideMessage(successDiv)

  // Récupérer les valeurs
  const name      = document.getElementById('serviceName')?.value || ''
  const price     = document.getElementById('servicePrice')?.value || ''
  const category  = document.getElementById('serviceCategory')?.value || ''
  const menuType  = document.getElementById('serviceMenuType')?.value || ''
  const file      = document.getElementById('serviceMedia')?.files[0] || null

  let eventName = null
  let eventDate = null

  if (menuType === 'evenement') {
    const eventSelect = document.getElementById('eventSelect')
    const selected = eventSelect?.options[eventSelect.selectedIndex]
    const type = selected?.dataset.type

    if (type === 'custom') {
      eventName = document.getElementById('eventName')?.value || ''
    } else {
      eventName = eventSelect?.value || ''
    }

    eventDate = document.getElementById('eventDate')?.value || null
  }

  // 1. Validation du formulaire
  const formCheck = validateDishForm({ name, price, category, menuType, eventName, eventDate, file })
  if (!formCheck.valid) {
    showMessage(errorDiv, formCheck.message)
    return
  }

  // 2. Validation événement (limite + conflit)
  if (menuType === 'evenement') {
    const eventCheck = await validateNewEvent(eventDate)
    if (!eventCheck.valid) {
      showMessage(errorDiv, eventCheck.message)
      return
    }
  }

 // 3. Vérifier la limite de médias par catégorie
if (file) {
  const mediaValidation = validateMedia(file)

  if (mediaValidation.valid) {
    const detectedType = mediaValidation.mediaType
    const eventNameVal = menuType === 'evenement' ? eventName : null

    const limitCheck = await checkMediaLimitPerCategory(
      supabase,
      category,
      menuType,
      detectedType,
      eventNameVal
    )

    if (!limitCheck.allowed) {
      showMessage(errorDiv, limitCheck.message)
      return
    }
  }
}

// 3·. Loading
setLoading(submitBtn, true)

  // 4. Upload média si présent
  let mediaUrl = null
  let mediaType = null

  if (file) {
    const upload = await uploadMedia(file, name)
    if (!upload.success) {
      showMessage(errorDiv, upload.message)
      setLoading(submitBtn, false)
      return
    }
    mediaUrl = upload.url
    mediaType = upload.mediaType
  }

  // 5. Insérer dans Supabase
  const { error } = await supabase
    .from('menu_items')
    .insert([{
      name:       name.trim(),
      price:      parseFloat(price),
      category,
      menu_type:  menuType,
      event_name: eventName,
      event_date: eventDate,
      media_url:  mediaUrl,
      media_type: mediaType,
      is_visible: true
    }])

  setLoading(submitBtn, false)

  if (error) {
    console.error('Erreur ajout plat :', error.message)
    showMessage(errorDiv, 'Erreur lors de l\'ajout du plat. Réessayez.')
    return
  }

  // 6. Succès
  showMessage(successDiv, `✅ "${name}" ajouté avec succès !`)
  resetForm()
  await loadDashboard()
}


// =============================================
// HELPERS
// =============================================

function toggleElement(id, show) {
  const el = document.getElementById(id)
  if (el) el.style.display = show ? 'block' : 'none'
}

function resetEventFields(resetSelect = true) {
  if (resetSelect) {
    const sel = document.getElementById('eventSelect')
    if (sel) sel.selectedIndex = 0
  }

  toggleElement('eventDateLabel', false)
  toggleElement('eventDate', false)
  toggleElement('eventNameLabel', false)
  toggleElement('eventName', false)

  const dateInfo = document.getElementById('eventDateInfo')
  if (dateInfo) dateInfo.style.display = 'none'

  const dateInput = document.getElementById('eventDate')
  if (dateInput) {
    dateInput.value = ''
    dateInput.readOnly = false
  }

  const nameInput = document.getElementById('eventName')
  if (nameInput) nameInput.value = ''
}

function resetForm() {
  document.getElementById('serviceForm')?.reset()
  resetEventFields()
  toggleElement('eventSelectLabel', false)
  toggleElement('eventSelect', false)

  const preview = document.getElementById('mediaPreview')
  if (preview) preview.innerHTML = ''
}

function showMessage(el, message) {
  if (!el) return
  el.textContent = message
  el.style.display = 'block'
  setTimeout(() => hideMessage(el), 5000)
}

function hideMessage(el) {
  if (!el) return
  el.style.display = 'none'
  el.textContent = ''
}

function setLoading(btn, loading) {
  if (!btn) return
  btn.disabled = loading
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Ajout en cours...'
    : 'Ajouter le plat'
}

function formatDateFR(dateString) {
  if (!dateString) return ''
  const [y, m, d] = dateString.split('-')
  return `${d}/${m}/${y}`

}