// js/logic/eventLogic.js

import { supabase } from '../supabaseClient.js'
import { getTodayString, formatDateDisplay } from './dateUtils.js'

// =============================================
// LOGIQUE DES ÉVÉNEMENTS
// Règles métier : limites, conflits, récupération
// =============================================


// --- Récupérer tous les événements programmés ---
// (plats avec menu_type = 'evenement', groupés par event_date)

export async function getScheduledEvents() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('event_name, event_date')
    .eq('menu_type', 'evenement')
    .not('event_date', 'is', null)
    .order('event_date', { ascending: true })

  if (error) {
    console.error('Erreur récupération événements :', error.message)
    return []
  }

  // Dédoublonner par date (un événement = une date unique)
  const seen = new Set()
  const unique = []

  for (const item of data) {
    if (!seen.has(item.event_date)) {
      seen.add(item.event_date)
      unique.push(item)
    }
  }

  return unique
}


// --- Récupérer uniquement les événements FUTURS ---

export async function getFutureEvents() {
  const today = getTodayString()
  const all = await getScheduledEvents()
  return all.filter(e => e.event_date >= today)
}


// --- Vérifier la limite de 4 événements programmés ---

export async function checkEventLimit() {
  const future = await getFutureEvents()

  if (future.length >= 4) {
    return {
      allowed: false,
      message: `Limite atteinte : vous avez déjà ${future.length} événements programmés (maximum 4). Supprimez un événement pour continuer.`,
      events: future
    }
  }

  return { allowed: true, events: future }
}


// --- Vérifier qu'il n'y a pas déjà un événement ce jour-là ---

export async function checkDateConflict(dateString) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('event_name, event_date')
    .eq('menu_type', 'evenement')
    .eq('event_date', dateString)
    .limit(1)

  if (error) {
    console.error('Erreur vérification conflit :', error.message)
    return { conflict: false }
  }

  if (data.length > 0) {
    return {
      conflict: true,
      message: `Un événement "${data[0].event_name}" existe déjà le ${formatDateDisplay(dateString)}. Supprimez-le d'abord pour créer un nouvel événement ce jour-là.`,
      existing: data[0]
    }
  }

  return { conflict: false }
}


// --- Validation complète avant ajout d'un événement ---
// Regroupe les deux vérifications : limite + conflit

export async function validateNewEvent(dateString) {
  // 1. Vérifier la limite de 4 événements
  const limitCheck = await checkEventLimit()
  if (!limitCheck.allowed) {
    return { valid: false, message: limitCheck.message }
  }

  // 2. Vérifier le conflit de date
  const conflictCheck = await checkDateConflict(dateString)
  if (conflictCheck.conflict) {
    return { valid: false, message: conflictCheck.message }
  }

  return { valid: true }
}


// --- Récupérer l'événement du jour (si existant) ---

export async function getTodayEvent() {
  const today = getTodayString()

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('menu_type', 'evenement')
    .eq('event_date', today)
    .eq('is_visible', true)

  if (error) {
    console.error('Erreur récupération événement du jour :', error.message)
    return null
  }

  return data.length > 0 ? data : null
}


// --- Supprimer tous les plats d'un événement par date ---

export async function deleteEventByDate(dateString) {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('menu_type', 'evenement')
    .eq('event_date', dateString)

  if (error) {
    console.error('Erreur suppression événement :', error.message)
    return { success: false, message: 'Erreur lors de la suppression.' }
  }

  return { success: true }
}


// --- Résumé des événements pour affichage dashboard ---

export async function getEventsSummary() {
  const events = await getFutureEvents()
  const today = getTodayString()

  return events.map(e => ({
    name: e.event_name,
    date: e.event_date,
    dateDisplay: formatDateDisplay(e.event_date),
    isToday: e.event_date === today,
    isPast: e.event_date < today,
  }))
}