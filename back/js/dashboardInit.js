// js/dashboardInit.js
import { supabase } from './supabaseClient.js'
import { loadDashboard } from './ui/dashboardUI.js'

// =============================================
// INITIALISATION DU DASHBOARD
// Vérifie l'auth + charge les données au démarrage
// =============================================

async function init() {

  // 1. Vérifier si l'utilisateur est connecté
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    window.location.href = 'login.html'
    return
  }

  // 2. Afficher l'email de l'admin connecté
  const adminEmail = document.getElementById('adminEmail')
  if (adminEmail) adminEmail.textContent = session.user.email

  // 3. Bouton déconnexion — AVANT loadDashboard
  const logoutBtn = document.getElementById('logoutBtn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut()
      window.location.href = 'login.html'
    })
  }

  // 4. Auth listener — AVANT loadDashboard
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      window.location.href = 'login.html'
    }
  })

  // 5. Charger le dashboard en dernier
  await loadDashboard()
}

// Lancer l'initialisation dès que le DOM est prêt
document.addEventListener('DOMContentLoaded', init)