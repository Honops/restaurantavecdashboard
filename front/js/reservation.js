js/reservation.js
// js/reservation.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// =============================================
// CONFIG SUPABASE
// =============================================

const SUPABASE_URL = 'https://VOTRE_URL.supabase.co'
const SUPABASE_KEY = 'VOTRE_ANON_KEY'
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY)


// =============================================
// ÉTAT GLOBAL
// =============================================

let selectedTime = null


// =============================================
// INIT
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  setMinDate()
  setupStepNavigation()
  setupSlots()
  setupCharCount()
  setupFormSubmit()
  setupNewReservation()
})


// =============================================
// DATE MINIMUM = AUJOURD'HUI
// =============================================

function setMinDate() {
  const dateInput = document.getElementById('resDate')
  if (!dateInput) return

  const today = getTodayString()
  dateInput.min = today

  // Bloquer la saisie manuelle d'une date passée
  dateInput.addEventListener('change', () => {
    if (dateInput.value < today) {
      dateInput.value = today
      showFieldError('err-date', 'La date ne peut pas être dans le passé.')
    } else {
      clearFieldError('err-date')
    }
  })
}


// =============================================
// CRÉNEAUX HORAIRES
// =============================================

function setupSlots() {
  const slots = document.querySelectorAll('.slot-btn')
  const hidden = document.getElementById('resTime')

  slots.forEach(btn => {
    btn.addEventListener('click', () => {
      // Désélectionner tous
      slots.forEach(s => s.classList.remove('slot-active'))

      // Sélectionner celui cliqué
      btn.classList.add('slot-active')
      selectedTime  = btn.dataset.time
      hidden.value  = selectedTime

      clearFieldError('err-time')
    })
  })
}


// =============================================
// COMPTEUR CARACTÈRES TEXTAREA
// =============================================

function setupCharCount() {
  const textarea  = document.getElementById('resMessage')
  const counter   = document.getElementById('charCount')
  if (!textarea || !counter) return

  textarea.addEventListener('input', () => {
    const len = textarea.value.length
    counter.textContent = `${len} / 500`
    counter.style.color = len > 450 ? '#e05c5c' : '#aaa'
  })
}


// =============================================
// NAVIGATION ENTRE ÉTAPES
// =============================================

function setupStepNavigation() {
  // Étape 1 → Étape 2
  document.getElementById('toStep2')?.addEventListener('click', () => {
    if (validateStep1()) goToStep(2)
  })

  // Étape 2 → Étape 1
  document.getElementById('toStep1')?.addEventListener('click', () => {
    goToStep(1)
  })
}

function goToStep(step) {
  // Cacher tous les panneaux
  document.getElementById('panel-step1').style.display = 'none'
  document.getElementById('panel-step2').style.display = 'none'
  document.getElementById('panel-step3').style.display = 'none'

  // Afficher le bon panneau
  document.getElementById(`panel-step${step}`).style.display = 'block'

  // Mettre à jour les indicateurs
  for (let i = 1; i <= 3; i++) {
    const indicator = document.getElementById(`step${i}-indicator`)
    if (!indicator) continue
    indicator.classList.remove('active', 'done')
    if (i < step)      indicator.classList.add('done')
    else if (i === step) indicator.classList.add('active')
  }

  // Scroll en haut du formulaire
  document.querySelector('.res-form-wrapper')?.scrollIntoView({
    behavior: 'smooth', block: 'start'
  })
}


// =============================================
// VALIDATIONS
// =============================================

function validateStep1() {
  let valid = true

  const firstname = document.getElementById('resFirstname').value.trim()
  const lastname  = document.getElementById('resLastname').value.trim()
  const email     = document.getElementById('resEmail').value.trim()
  const phone     = document.getElementById('resPhone').value.trim()

  // Prénom
  if (!firstname) {
    showFieldError('err-firstname', 'Le prénom est obligatoire.')
    valid = false
  } else if (firstname.length < 2) {
    showFieldError('err-firstname', 'Minimum 2 caractères.')
    valid = false
  } else {
    clearFieldError('err-firstname')
  }

  // Nom
  if (!lastname) {
    showFieldError('err-lastname', 'Le nom est obligatoire.')
    valid = false
  } else if (lastname.length < 2) {
    showFieldError('err-lastname', 'Minimum 2 caractères.')
    valid = false
  } else {
    clearFieldError('err-lastname')
  }

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email) {
    showFieldError('err-email', 'L\'email est obligatoire.')
    valid = false
  } else if (!emailRegex.test(email)) {
    showFieldError('err-email', 'Format d\'email invalide.')
    valid = false
  } else {
    clearFieldError('err-email')
  }

  // Téléphone
  const phoneRegex = /^[\+\d][\d\s\-\(\)]{7,20}$/
  if (!phone) {
    showFieldError('err-phone', 'Le téléphone est obligatoire.')
    valid = false
  } else if (!phoneRegex.test(phone)) {
    showFieldError('err-phone', 'Format de téléphone invalide.')
    valid = false
  } else {
    clearFieldError('err-phone')
  }

  return valid
}

function validateStep2() {
  let valid = true

  const date   = document.getElementById('resDate').value
  const people = document.getElementById('resPeople').value
  const today  = getTodayString()

  // Date
  if (!date) {
    showFieldError('err-date', 'La date est obligatoire.')
    valid = false
  } else if (date < today) {
    showFieldError('err-date', 'La date ne peut pas être dans le passé.')
    valid = false
  } else {
    clearFieldError('err-date')
  }

  // Nombre de personnes
  if (!people) {
    showFieldError('err-people', 'Veuillez choisir le nombre de personnes.')
    valid = false
  } else {
    clearFieldError('err-people')
  }

  // Créneau horaire
  if (!selectedTime) {
    showFieldError('err-time', 'Veuillez choisir un créneau horaire.')
    valid = false
  } else {
    clearFieldError('err-time')
  }

  return valid
}


// =============================================
// SOUMISSION DU FORMULAIRE
// =============================================

function setupFormSubmit() {
  const form = document.getElementById('reservationForm')
  if (!form) return

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (validateStep2()) await handleSubmit()
  })
}

async function handleSubmit() {
  const submitBtn  = document.getElementById('resSubmitBtn')
  const submitText = document.getElementById('resSubmitText')
  const spinner    = document.getElementById('resSubmitSpinner')

  // Loading
  submitBtn.disabled      = true
  submitText.style.display = 'none'
  spinner.style.display    = 'inline-block'

  // Récupérer toutes les valeurs
  const firstname = document.getElementById('resFirstname').value.trim()
  const lastname  = document.getElementById('resLastname').value.trim()
  const email     = document.getElementById('resEmail').value.trim()
  const phone     = document.getElementById('resPhone').value.trim()
  const date      = document.getElementById('resDate').value
  const people    = parseInt(document.getElementById('resPeople').value)
  const occasion  = document.getElementById('resOccasion').value || null
  const allergy   = document.getElementById('resAllergy').value.trim() || null
  const seating   = document.querySelector('input[name="seating"]:checked')?.value || 'pas de préférence'
  const message   = document.getElementById('resMessage').value.trim() || null

  // Générer numéro de réservation unique
  const resNumber = generateReservationNumber()

  // Insérer dans Supabase
  const { error } = await supabase
    .from('reservations')
    .insert([{
      reservation_number: resNumber,
      firstname,
      lastname,
      email,
      phone,
      date,
      time:     selectedTime,
      people,
      occasion,
      allergy,
      seating,
      message,
      status:   'en_attente'
    }])

  // Reset loading
  submitBtn.disabled       = false
  submitText.style.display = 'inline'
  spinner.style.display    = 'none'

  if (error) {
    console.error('Erreur réservation :', error.message)
    showGlobalError('Une erreur est survenue. Veuillez réessayer ou nous appeler directement.')
    return
  }

  // Succès → Étape 3
  showSuccessPanel(resNumber, {
    firstname, lastname, date, time: selectedTime, people, occasion, seating
  })
}


// =============================================
// PANNEAU DE SUCCÈS
// =============================================

function showSuccessPanel(resNumber, data) {
  goToStep(3)

  // Message principal
  const msg = document.getElementById('resSuccessMsg')
  if (msg) {
    msg.textContent = `Bonjour ${data.firstname}, votre réservation a bien été enregistrée.`
  }

  // Récapitulatif
  const recap = document.getElementById('resRecap')
  if (recap) {
    const dateDisplay = formatDateFR(data.date)
    const occasionLine = data.occasion
      ? `<div class="recap-row"><span>Occasion</span><strong>${data.occasion}</strong></div>`
      : ''

    recap.innerHTML = `
      <div class="recap-card">
        <div class="recap-number">N° ${resNumber}</div>
        <div class="recap-row">
          <span>Nom</span>
          <strong>${escHtml(data.firstname)} ${escHtml(data.lastname)}</strong>
        </div>
        <div class="recap-row">
          <span>Date</span>
          <strong>${dateDisplay}</strong>
        </div>
        <div class="recap-row">
          <span>Heure</span>
          <strong>${data.time}</strong>
        </div>
        <div class="recap-row">
          <span>Personnes</span>
          <strong>${data.people} personne${data.people > 1 ? 's' : ''}</strong>
        </div>
        <div class="recap-row">
          <span>Placement</span>
          <strong>${capitalize(data.seating)}</strong>
        </div>
        ${occasionLine}
        <div class="recap-status">
          <span class="status-badge status-en_attente">⏳ En attente de confirmation</span>
        </div>
      </div>
    `
  }
}


// =============================================
// NOUVELLE RÉSERVATION
// =============================================

function setupNewReservation() {
  document.getElementById('newResBtn')?.addEventListener('click', () => {
    // Reset formulaire
    document.getElementById('reservationForm')?.reset()
    selectedTime = null

    // Reset créneaux
    document.querySelectorAll('.slot-btn').forEach(s => {
      s.classList.remove('slot-active')
    })

    // Reset compteur
    const counter = document.getElementById('charCount')
    if (counter) counter.textContent = '0 / 500'

    // Reset erreurs
    document.querySelectorAll('.field-error').forEach(e => e.textContent = '')

    // Retour étape 1
    goToStep(1)
  })
}


// =============================================
// HELPERS
// =============================================

function generateReservationNumber() {
  const date   = new Date()
  const y      = date.getFullYear()
  const m      = String(date.getMonth() + 1).padStart(2, '0')
  const d      = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RES-${y}${m}${d}-${random}`
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
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
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

function showFieldError(id, message) {
  const el = document.getElementById(id)
  if (el) el.textContent = message
}

function clearFieldError(id) {
  const el = document.getElementById(id)
  if (el) el.textContent = ''
}

function showGlobalError(message) {
  const el = document.getElementById('resError')
  if (!el) return
  el.textContent    = message
  el.style.display  = 'block'
  setTimeout(() => { el.style.display = 'none' }, 6000)
}