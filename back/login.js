// login.js
import { supabase } from './js/supabaseClient.js'

// Toggle mot de passe visible
document.getElementById('togglePassword').addEventListener('click', () => {
const input = document.getElementById('loginPassword')
input.type = input.type === 'password' ? 'text' : 'password'
})

// Si déjà connecté → rediriger directement
async function checkSession() {
const { data: { session } } = await supabase.auth.getSession()
if (session) window.location.href = 'dashboard.html'
}
checkSession()

// Connexion
document.getElementById('loginBtn').addEventListener('click', async () => {
const email = document.getElementById('loginEmail').value.trim()
const password = document.getElementById('loginPassword').value.trim()
const errorDiv = document.getElementById('loginError')
const btnText = document.getElementById('loginBtnText')
const spinner = document.getElementById('loginSpinner')

errorDiv.style.display = 'none'

if (!email || !password) {
errorDiv.textContent = 'Veuillez remplir tous les champs.'
errorDiv.style.display = 'block'
return
}

btnText.style.display = 'none'
spinner.style.display = 'inline-block'

const { error } = await supabase.auth.signInWithPassword({ email, password })

btnText.style.display = 'inline'
spinner.style.display = 'none'

if (error) {
errorDiv.textContent = 'Email ou mot de passe incorrect.'
errorDiv.style.display = 'block'
} else {
window.location.href = 'dashboard.html'
}
})

// Connexion avec touche Entrée
document.getElementById('loginPassword').addEventListener('keydown', (e) => {
if (e.key === 'Enter') document.getElementById('loginBtn').click()
})