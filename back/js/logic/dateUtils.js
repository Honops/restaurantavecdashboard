// js/logic/dateUtils.js

// =============================================
// UTILITAIRES DE DATES
// Calcul automatique des dates d'événements
// =============================================


// --- Événements à date FIXE ---
// Retourne la prochaine occurrence de la date fixe

export function getFixedEventDate(eventName) {
  const today = new Date()
  const year = today.getFullYear()

  const fixedDates = {
    'Noël':          { month: 11, day: 25 },
    'Nouvel An':     { month: 0,  day: 1  },
    'Saint-Valentin':{ month: 1,  day: 14 },
    'Fête des Mères':{ month: 4,  day: 26 }, // dernier dimanche de mai → approximé
    'Halloween':     { month: 9,  day: 31 },
    'Pâques':        getEasterDate(year),
  }

  const found = fixedDates[eventName]
  if (!found) return null

  // Pour Pâques (retourne déjà un objet Date)
  if (found instanceof Date) {
    const next = found < today
      ? getEasterDate(year + 1)
      : found
    return formatDate(next)
  }

  // Pour les autres dates fixes
  let date = new Date(year, found.month, found.day)
  if (date < today) {
    date = new Date(year + 1, found.month, found.day)
  }

  return formatDate(date)
}


// --- Calcul de Pâques (algorithme de Butcher) ---

function getEasterDate(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}


// --- Événements à date VARIABLE (islamiques) ---
// Le restaurateur saisit la date manuellement
// Cette fonction valide juste que la date est dans le futur

export function validateIslamicDate(dateString) {
  if (!dateString) return { valid: false, message: 'Veuillez saisir une date.' }

  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isNaN(date.getTime())) {
    return { valid: false, message: 'Date invalide.' }
  }

  if (date < today) {
    return { valid: false, message: 'La date doit être dans le futur.' }
  }

  return { valid: true, date: formatDate(date) }
}


// --- Obtenir le type de menu selon le jour actuel ---

export function getTodayMenuType() {
  const day = new Date().getDay() // 0 = dimanche, 6 = samedi
  return (day === 0 || day === 6) ? 'weekend' : 'semaine'
}


// --- Obtenir la date d'aujourd'hui formatée YYYY-MM-DD ---

export function getTodayString() {
  return formatDate(new Date())
}


// --- Formater une date en YYYY-MM-DD ---

export function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}


// --- Formater une date pour affichage (DD/MM/YYYY) ---

export function formatDateDisplay(dateString) {
  if (!dateString) return ''
  const [y, m, d] = dateString.split('-')
  return `${d}/${m}/${y}`
}


// --- Vérifier si une date est aujourd'hui ---

export function isToday(dateString) {
  return dateString === getTodayString()
}


// --- Liste des événements fixes disponibles ---

export const FIXED_EVENTS = [
  'Noël',
  'Nouvel An',
  'Saint-Valentin',
  'Fête des Mères',
  'Halloween',
  'Pâques',
]

// --- Liste des événements islamiques (date manuelle) ---

export const ISLAMIC_EVENTS = [
  'Ramadan',
  'Tabaski',
  'Maouloud',
  'Achoura',
]