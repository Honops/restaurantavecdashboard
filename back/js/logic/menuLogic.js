// js/logic/menuLogic.js

import { supabase } from '../supabaseClient.js'
import { getTodayMenuType, getTodayString } from './dateUtils.js'
import { getTodayEvent } from './eventLogic.js'

// =============================================
// LOGIQUE DU MENU
// Récupération des plats selon le type de menu
// =============================================


// --- Récupérer tous les plats d'un type de menu ---

export async function getDishesByType(menuType) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('menu_type', menuType)
    .eq('is_visible', true)
    .order('category', { ascending: true })

  if (error) {
    console.error(`Erreur récupération plats (${menuType}) :`, error.message)
    return []
  }

  return data
}


// --- Récupérer TOUS les plats (dashboard admin) ---

export async function getAllDishes() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('menu_type', { ascending: true })
    .order('category', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur récupération tous les plats :', error.message)
    return []
  }

  return data
}


// --- Récupérer le menu du jour (logique automatique) ---
// Priorité : événement du jour > week-end > semaine

export async function getTodayMenu() {
  // 1. Y a-t-il un événement aujourd'hui ?
  const eventDishes = await getTodayEvent()
  if (eventDishes && eventDishes.length > 0) {
    return {
      type: 'evenement',
      eventName: eventDishes[0].event_name,
      dishes: eventDishes
    }
  }

  // 2. Sinon → menu semaine ou week-end selon le jour
  const menuType = getTodayMenuType()
  const dishes = await getDishesByType(menuType)

  return {
    type: menuType,
    eventName: null,
    dishes
  }
}


// --- Grouper les plats par catégorie ---

export function groupDishesByCategory(dishes) {
  const order = ['entree', 'plat', 'dessert', 'boisson', 'promo']

  const groups = {}

  for (const dish of dishes) {
    const cat = dish.category || 'autre'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(dish)
  }

  // Trier selon l'ordre défini
  const sorted = {}
  for (const key of order) {
    if (groups[key]) sorted[key] = groups[key]
  }

  // Ajouter les catégories non prévues à la fin
  for (const key of Object.keys(groups)) {
    if (!sorted[key]) sorted[key] = groups[key]
  }

  return sorted
}


// --- Grouper les plats par type de menu (pour le dashboard) ---

export function groupDishesByMenuType(dishes) {
  const order = ['semaine', 'weekend', 'evenement']
  const groups = {}

  for (const dish of dishes) {
    const type = dish.menu_type || 'autre'
    if (!groups[type]) groups[type] = []
    groups[type].push(dish)
  }

  const sorted = {}
  for (const key of order) {
    if (groups[key]) sorted[key] = groups[key]
  }

  for (const key of Object.keys(groups)) {
    if (!sorted[key]) sorted[key] = groups[key]
  }

  return sorted
}


// --- Labels lisibles pour les types de menu ---

export const MENU_TYPE_LABELS = {
  semaine:   '📅 Menu Semaine',
  weekend:   '🌅 Menu Week-end',
  evenement: '🎉 Menu Événement',
}


// --- Labels lisibles pour les catégories ---

export const CATEGORY_LABELS = {
  entree:  '🥗 Entrées',
  plat:    '🍽️ Plats',
  dessert: '🍰 Desserts',
  boisson: '🥤 Boissons',
  promo:   '🏷️ Promos',
}


// --- Rechercher un plat par ID ---

export async function getDishById(id) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erreur récupération plat :', error.message)
    return null
  }

  return data
}


// --- Statistiques rapides pour le dashboard ---

export async function getDashboardStats() {
  const all = await getAllDishes()

  const stats = {
    total: all.length,
    semaine: 0,
    weekend: 0,
    evenement: 0,
    todayType: getTodayMenuType(),
    todayDate: getTodayString(),
  }

  for (const dish of all) {
    if (dish.menu_type === 'semaine')   stats.semaine++
    if (dish.menu_type === 'weekend')   stats.weekend++
    if (dish.menu_type === 'evenement') stats.evenement++
  }

  return stats
}