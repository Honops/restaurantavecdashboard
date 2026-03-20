// js/utils/limits.js

// =============================================
// RÈGLES MÉTIER & LIMITES
// Toutes les contraintes centralisées ici
// =============================================


// --- Constantes globales ---

export const LIMITS = {
  MAX_EVENTS:        4,
  MAX_NAME_LENGTH:   60,
  MAX_PRICE:         500,
  MIN_PRICE:         0.5,
  MAX_FILE_SIZE_MB:  15,
  ALLOWED_IMAGES:    ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_VIDEOS:    ['video/mp4', 'video/webm', 'video/ogg'],
  MAX_IMAGES_PER_CATEGORY: 4,
  MAX_VIDEOS_PER_CATEGORY: 1,
}


// --- Valider le nom d'un plat ---

export function validateName(name) {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: 'Le nom du plat est obligatoire.' }
  }
  if (name.trim().length > LIMITS.MAX_NAME_LENGTH) {
    return { valid: false, message: `Le nom ne peut pas dépasser ${LIMITS.MAX_NAME_LENGTH} caractères.` }
  }
  return { valid: true, value: name.trim() }
}


// --- Valider le prix ---

export function validatePrice(price) {
  const parsed = parseFloat(price)
  if (isNaN(parsed)) {
    return { valid: false, message: 'Le prix doit être un nombre valide.' }
  }
  if (parsed < LIMITS.MIN_PRICE) {
    return { valid: false, message: `Le prix minimum est ${LIMITS.MIN_PRICE} €.` }
  }
  if (parsed > LIMITS.MAX_PRICE) {
    return { valid: false, message: `Le prix maximum est ${LIMITS.MAX_PRICE} €.` }
  }
  return { valid: true, value: parsed }
}


// --- Valider la catégorie ---

export const VALID_CATEGORIES = ['entree', 'plat', 'dessert', 'boisson', 'promo']

export function validateCategory(category) {
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return { valid: false, message: 'Veuillez choisir une catégorie valide.' }
  }
  return { valid: true, value: category }
}


// --- Valider le type de menu ---

export const VALID_MENU_TYPES = ['semaine', 'weekend', 'evenement']

export function validateMenuType(menuType) {
  if (!menuType || !VALID_MENU_TYPES.includes(menuType)) {
    return { valid: false, message: 'Veuillez choisir un type de menu valide.' }
  }
  return { valid: true, value: menuType }
}


// --- Valider un fichier média ---

export function validateMedia(file) {
  if (!file) return { valid: true, value: null }

  const allAllowed = [...LIMITS.ALLOWED_IMAGES, ...LIMITS.ALLOWED_VIDEOS]

  if (!allAllowed.includes(file.type)) {
    return { valid: false, message: 'Format non supporté. Utilisez JPG, PNG, WEBP, GIF, MP4, WEBM ou OGG.' }
  }

  const sizeMB = file.size / (1024 * 1024)
  if (sizeMB > LIMITS.MAX_FILE_SIZE_MB) {
    return { valid: false, message: `Le fichier est trop lourd (${sizeMB.toFixed(1)} MB). Maximum : ${LIMITS.MAX_FILE_SIZE_MB} MB.` }
  }

  const mediaType = LIMITS.ALLOWED_IMAGES.includes(file.type) ? 'image' : 'video'
  return { valid: true, value: file, mediaType }
}


// --- Valider un nom d'événement custom ---

export function validateCustomEventName(name) {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: "Le nom de l'événement est obligatoire." }
  }
  if (name.trim().length > 40) {
    return { valid: false, message: "Le nom de l'événement ne peut pas dépasser 40 caractères." }
  }
  return { valid: true, value: name.trim() }
}


// --- Valider tout le formulaire d'ajout d'un plat ---

export function validateDishForm({ name, price, category, menuType, eventName, eventDate, file }) {

  const nameCheck = validateName(name)
  if (!nameCheck.valid) return nameCheck

  const priceCheck = validatePrice(price)
  if (!priceCheck.valid) return priceCheck

  const categoryCheck = validateCategory(category)
  if (!categoryCheck.valid) return categoryCheck

  const menuTypeCheck = validateMenuType(menuType)
  if (!menuTypeCheck.valid) return menuTypeCheck

  if (menuType === 'evenement') {
    if (!eventName || eventName.trim().length === 0) {
      return { valid: false, message: 'Veuillez choisir ou saisir un événement.' }
    }
    if (!eventDate) {
      return { valid: false, message: "Veuillez saisir la date de l'événement." }
    }
  }

  if (file) {
    const mediaCheck = validateMedia(file)
    if (!mediaCheck.valid) return mediaCheck
  }

  return { valid: true }
}


// --- Vérifier la limite de médias par catégorie ---

export async function checkMediaLimitPerCategory(supabase, category, menuType, mediaType, eventName = null) {
  if (!mediaType) return { allowed: true }

  let query = supabase
    .from('menu_items')
    .select('id')
    .eq('category', category)
    .eq('menu_type', menuType)
    .eq('media_type', mediaType)
    .eq('is_visible', true)

  if (menuType === 'evenement' && eventName) {
    query = query.eq('event_name', eventName)
  }

  const { data, error } = await query
  const count = data ? data.length : 0

  if (error) {
    console.error('Erreur vérification limite médias :', error.message)
    return { allowed: true }
  }

  const limit = mediaType === 'image'
    ? LIMITS.MAX_IMAGES_PER_CATEGORY
    : LIMITS.MAX_VIDEOS_PER_CATEGORY

  if (count >= limit) {
    const typeLabel = mediaType === 'image' ? 'images' : 'vidéos'
    return {
      allowed: false,
      message: `Limite atteinte : maximum ${limit} ${typeLabel} pour la catégorie "${category}" dans ce menu.`
    }
  }

  return { allowed: true }
}
