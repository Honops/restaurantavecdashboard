// =============================================
// dashboardMain.js
// Point d'entrée unique du dashboard
// =============================================

import { supabase }                                    from './supabaseClient.js'
import { loadDashboard }                               from './ui/dashboardUI.js'
import { renderEventsPanel, renderTodayEventWidget }   from './ui/eventUI.js'
import { initReservations }                            from './ui/reservationUI.js'


// =============================================
// 1. AUTH — Vérifie la session et affiche l'email
// =============================================
async function checkAuth() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    window.location.href = 'login.html'
    return null
  }

  const adminEmail = document.getElementById('adminEmail')
  if (adminEmail) adminEmail.textContent = session.user.email

  return session
}


// =============================================
// 2. LOGOUT
// =============================================
function initLogout() {
  const logoutBtn = document.getElementById('logoutBtn')
  if (!logoutBtn) return

  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = 'login.html'
  })
}


// =============================================
// 3. AUTH LISTENER — Déconnexion forcée si session expirée
// =============================================
function initAuthListener() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      window.location.href = 'login.html'
    }
  })
}


// =============================================
// 4. NAVIGATION — Menus / Réservations
// =============================================
let reservationsLoaded = false

function initNavigation() {
  const navMenus        = document.getElementById('navMenus')
  const navReservations = document.getElementById('navReservations')
  const menusDash       = document.getElementById('menusDashboard')
  const resDash         = document.getElementById('reservationsDashboard')
  const statsBanner     = document.querySelector('.stats-section')
  const bannerSection   = document.querySelector('.banner-section')

  if (!navMenus || !navReservations) return

  navMenus.addEventListener('click', () => {
    navMenus.classList.add('dash-nav-active')
    navReservations.classList.remove('dash-nav-active')
    menusDash.style.display     = 'grid'
    resDash.style.display       = 'none'
    statsBanner.style.display   = 'block'
    bannerSection.style.display = 'block'
  })

  navReservations.addEventListener('click', async () => {
    navReservations.classList.add('dash-nav-active')
    navMenus.classList.remove('dash-nav-active')
    menusDash.style.display     = 'none'
    resDash.style.display       = 'block'
    statsBanner.style.display   = 'none'
    bannerSection.style.display = 'none'

    if (!reservationsLoaded) {
      await initReservations()
      reservationsLoaded = true
    } else {
      await initReservations()
    }

    await updatePendingBadge()
  })
}


// =============================================
// 5. BADGE — Réservations en attente
// =============================================
async function updatePendingBadge() {
  const { data } = await supabase
    .from('reservations')
    .select('id', { count: 'exact' })
    .eq('status', 'en_attente')

  const badge = document.getElementById('resPendingBadge')
  if (!badge) return

  const count = data?.length || 0
  if (count > 0) {
    badge.textContent   = count
    badge.style.display = 'inline-block'
  } else {
    badge.style.display = 'none'
  }
}


// =============================================
// 6. INIT PRINCIPALE — Séquentielle et sûre
// =============================================
async function init() {
  // Auth en premier — si pas connecté, on arrête tout
  const session = await checkAuth()
  if (!session) return

  // Mise en place des listeners
  initLogout()
  initAuthListener()
  initNavigation()

  // Chargement des données en parallèle
  await Promise.all([
    loadDashboard(),
    renderEventsPanel(),
    renderTodayEventWidget(),
    updatePendingBadge(),
  ])
}

// Lancement dès que le DOM est prêt
document.addEventListener('DOMContentLoaded', init)