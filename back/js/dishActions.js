// js/dishActions.js

import { supabase } from './supabaseClient.js'
import { validateDishForm } from './utils/limits.js'
import { validateNewEvent } from './logic/eventLogic.js'
import { notify, confirmModal } from './ui/notify.js'
import { getFixedEventDate, validateIslamicDate, FIXED_EVENTS, ISLAMIC_EVENTS } from './logic/dateUtils.js'
import { replaceMedia, deleteMedia, isVideoUrl } from './utils/mediaUpload.js'
import { loadDashboard } from './ui/dashboardUI.js'

// =============================================
// ACTIONS SUR LES PLATS
// Modifier, Supprimer,Toggler la visibilité
// =============================================


// --- Supprimer un plat ---

export async function deleteDish(id, mediaUrl = null) {
  const confirmed = await confirmModal({
    title:        'Supprimer ce plat ?',
    message:      'Cette action est irréversible. Le plat et son média seront définitivement supprimés.',
    icon:         '🗑️',
    confirmLabel: 'Supprimer',
    cancelLabel:  'Annuler',
    danger:       true,
  })

  if (!confirmed) return

  if (mediaUrl) await deleteMedia(mediaUrl)

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erreur suppression plat :', error.message)
    notify.error('Erreur lors de la suppression. Réessayez.')
    return
  }

  notify.success('Plat supprimé avec succès.')
  await loadDashboard()
}


// --- Toggler la visibilité d'un plat ---

export async function toggleDishVisibility(id, currentStatus) {
  const { error } = await supabase
    .from('menu_items')
    .update({ is_visible: !currentStatus })
    .eq('id', id)

  if (error) {
    console.error('Erreur toggle visibilité :', error.message)
    notify.error('Erreur lors de la mise à jour.')
    return
  }

  notify.success(currentStatus ? 'Plat masqué.' : 'Plat visible.')
  await loadDashboard()
}

// --- Ouvrir le modal d'édition ---

export function openEditModal(dish) {
  // Créer le modal si pas existant
  let modal = document.getElementById('editModal')
  if (!modal) {
    modal = createEditModal()
    document.body.appendChild(modal)
  }

  // Remplir le formulaire avec les données du plat
  populateEditForm(dish)

  // Afficher le modal
  modal.style.display = 'flex'
  document.body.style.overflow = 'hidden'
}


// --- Fermer le modal ---

export function closeEditModal() {
  const modal = document.getElementById('editModal')
  if (modal) modal.style.display = 'none'
  document.body.style.overflow = ''
}


// --- Créer le HTML du modal ---

function createEditModal() {
  const modal = document.createElement('div')
  modal.id = 'editModal'
  modal.className = 'modal-overlay'

  modal.innerHTML = `
    <div class="modal-card">

      <div class="modal-header">
        <h3>✏️ Modifier le plat</h3>
        <button class="modal-close" id="closeModalBtn">✕</button>
      </div>

      <div id="editError" class="error-msg" style="display:none;"></div>
      <div id="editSuccess" class="success-msg" style="display:none;"></div>

      <div class="modal-body">

        <input type="hidden" id="editDishId">
        <input type="hidden" id="editOldMediaUrl">

        <div class="input-group">
          <label>Nom du plat</label>
          <input type="text" id="editName" placeholder="Ex: Salade César">
        </div>

        <div class="input-group">
          <label>Prix (€)</label>
          <input type="number" id="editPrice" step="0.01" placeholder="10.50">
        </div>

        <div class="input-group">
          <label>Catégorie</label>
          <select id="editCategory">
            <option value="entree">Entrée</option>
            <option value="plat">Plat</option>
            <option value="dessert">Dessert</option>
            <option value="boisson">Boisson</option>
            <option value="promo">Promo</option>
          </select>
        </div>

        <div class="input-group">
          <label>Type de menu</label>
          <select id="editMenuType">
            <option value="semaine">Menu Semaine</option>
            <option value="weekend">Menu Week-end</option>
            <option value="evenement">Événement</option>
          </select>
        </div>

        <!-- Champs événement -->
        <div id="editEventFields" style="display:none;">

          <div class="input-group">
            <label>Nom de l'événement</label>
            <input type="text" id="editEventName" placeholder="Ex: Noël">
          </div>

          <div class="input-group">
            <label>Date de l'événement</label>
            <input type="date" id="editEventDate">
          </div>

        </div>

        <!-- Média actuel -->
        <div id="editCurrentMedia" class="current-media"></div>

        <div class="input-group">
          <label>Remplacer le média (optionnel)</label>
          <input type="file" id="editMedia" accept="image/*,video/*">
          <div id="editMediaPreview" class="media-preview"></div>
        </div>

      </div>

      <div class="modal-footer">
        <button id="cancelEditBtn" class="btn-secondary">Annuler</button>
        <button id="saveEditBtn" class="btn-primary">
          <span id="saveEditText">Enregistrer</span>
          <span id="saveEditSpinner" class="spinner" style="display:none;"></span>
        </button>
      </div>

    </div>
  `

  // Événements du modal
  modal.querySelector('#closeModalBtn').addEventListener('click', closeEditModal)
  modal.querySelector('#cancelEditBtn').addEventListener('click', closeEditModal)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeEditModal()
  })

  // Toggle champs événement
  modal.querySelector('#editMenuType').addEventListener('change', (e) => {
    const editEventFields = document.getElementById('editEventFields')
    if (editEventFields) {
      editEventFields.style.display = e.target.value === 'evenement' ? 'block' : 'none'
    }
  })

  // Preview média
  modal.querySelector('#editMedia').addEventListener('change', async (e) => {
    const file = e.target.files[0]
    const preview = document.getElementById('editMediaPreview')
    if (!preview || !file) return

    const { generatePreview } = await import('./utils/mediaUpload.js')
    const dataUrl = await generatePreview(file)
    const isVideo = file.type.startsWith('video/')

    preview.innerHTML = isVideo
      ? `<video src="${dataUrl}" controls class="media-preview-item"></video>`
      : `<img src="${dataUrl}" alt="Prévisualisation" class="media-preview-item">`
  })

  // Sauvegarder
  modal.querySelector('#saveEditBtn').addEventListener('click', handleEditSubmit)

  return modal
}


// --- Remplir le formulaire d'édition ---

function populateEditForm(dish) {
  document.getElementById('editDishId').value       = dish.id
  document.getElementById('editOldMediaUrl').value  = dish.media_url || ''
  document.getElementById('editName').value         = dish.name
  document.getElementById('editPrice').value        = dish.price
  document.getElementById('editCategory').value     = dish.category
  document.getElementById('editMenuType').value     = dish.menu_type

  // Champs événement
  const eventFields = document.getElementById('editEventFields')
  if (eventFields) {
    eventFields.style.display = dish.menu_type === 'evenement' ? 'block' : 'none'
  }

  if (dish.menu_type === 'evenement') {
    document.getElementById('editEventName').value = dish.event_name || ''
    document.getElementById('editEventDate').value = dish.event_date || ''
  }

  // Média actuel
  const currentMedia = document.getElementById('editCurrentMedia')
  if (currentMedia) {
    if (dish.media_url) {
      const isVideo = isVideoUrl(dish.media_url)
      currentMedia.innerHTML = isVideo
        ? `<p class="media-label">Média actuel :</p>
           <video src="${dish.media_url}" controls class="media-preview-item"></video>`
        : `<p class="media-label">Média actuel :</p>
           <img src="${dish.media_url}" alt="${dish.name}" class="media-preview-item">`
    } else {
      currentMedia.innerHTML = '<p class="media-label muted">Aucun média</p>'
    }
  }

  // Réinitialiser preview
  const editPreview = document.getElementById('editMediaPreview')
  if (editPreview) editPreview.innerHTML = ''

  const editMediaInput = document.getElementById('editMedia')
  if (editMediaInput) editMediaInput.value = ''

  // Réinitialiser messages
  hideMessage(document.getElementById('editError'))
  hideMessage(document.getElementById('editSuccess'))
}


// --- Soumettre la modification ---

async function handleEditSubmit() {
  const errorDiv   = document.getElementById('editError')
  const successDiv = document.getElementById('editSuccess')
  const saveBtn    = document.getElementById('saveEditBtn')
  const saveText   = document.getElementById('saveEditText')
  const spinner    = document.getElementById('saveEditSpinner')

  hideMessage(errorDiv)
  hideMessage(successDiv)

  const id         = document.getElementById('editDishId')?.value
  const oldUrl     = document.getElementById('editOldMediaUrl')?.value || null
  const name       = document.getElementById('editName')?.value || ''
  const price      = document.getElementById('editPrice')?.value || ''
  const category   = document.getElementById('editCategory')?.value || ''
  const menuType   = document.getElementById('editMenuType')?.value || ''
  const eventName  = document.getElementById('editEventName')?.value || null
  const eventDate  = document.getElementById('editEventDate')?.value || null
  const file       = document.getElementById('editMedia')?.files[0] || null

  // 1. Validation
  const formCheck = validateDishForm({ name, price, category, menuType, eventName, eventDate, file })
  if (!formCheck.valid) {
    showMessage(errorDiv, formCheck.message)
    return
  }

  // 2. Vérifier la limite si nouveau média ajouté
if (file) {
  const { validateMedia, checkMediaLimitPerCategory } = await import('./utils/limits.js')
  const mediaValidation = validateMedia(file)

  if (mediaValidation.valid) {
    const detectedType  = mediaValidation.mediaType
    const eventNameVal  = menuType === 'evenement' ? eventName : null

    // On vérifie la limite en excluant le plat en cours d'édition
    // (il va remplacer son propre média donc on ne compte pas contre lui)
    
    let query = supabase
      .from('menu_items')
      .select('id', { count: 'exact' })
      .eq('category', category)
      .eq('menu_type', menuType)
      .eq('media_type', detectedType)
      .eq('is_visible', true)
      .neq('id', parseInt(id)) // Exclure le plat actuel

    if (menuType === 'evenement' && eventNameVal) {
      query = query.eq('event_name', eventNameVal)
    }

    const { count, error } = await query

    if (!error) {
      const { LIMITS } = await import('./utils/limits.js')
      const limit = detectedType === 'image'
        ? LIMITS.MAX_IMAGES_PER_CATEGORY
        : LIMITS.MAX_VIDEOS_PER_CATEGORY

      if (count >= limit) {
        const typeLabel = detectedType === 'image' ? 'images' : 'vidéos'
        showMessage(errorDiv,
          `Limite atteinte : maximum ${limit} ${typeLabel} pour cette catégorie. Supprimez un média existant d'abord.`
        )
        return
      }
    }
  }
}

// 2'. Loading
saveBtn.disabled = true
saveText.style.display = 'none'
spinner.style.display = 'inline-block'
  
  // 3. Gérer le média
  let mediaUrl  = oldUrl
  let mediaType = null

  if (file) {
    const upload = await replaceMedia(oldUrl, file, name)
    if (!upload.success) {
      showMessage(errorDiv, upload.message)
      saveBtn.disabled = false
      saveText.style.display = 'inline'
      spinner.style.display = 'none'
      return
    }
    mediaUrl  = upload.url
    mediaType = upload.mediaType
  }

  // 4. Mettre à jour dans Supabase
  const updateData = {
    name:       name.trim(),
    price:      parseFloat(price),
    category,
    menu_type:  menuType,
    event_name: menuType === 'evenement' ? eventName : null,
    event_date: menuType === 'evenement' ? eventDate : null,
    media_url:  mediaUrl,
  }

  if (mediaType) updateData.media_type = mediaType

  const { error } = await supabase
    .from('menu_items')
    .update(updateData)
    .eq('id', id)

  saveBtn.disabled = false
  saveText.style.display = 'inline'
  spinner.style.display = 'none'

  if (error) {
    console.error('Erreur modification plat :', error.message)
    showMessage(errorDiv, 'Erreur lors de la modification. Réessayez.')
    return
  }

  // 5. Succès
  notify.success(`"${name}" modifié avec succès !`)
setTimeout(() => {
  closeEditModal()
  loadDashboard()
}, 800)
}
// =============================================
// HELPERS
// =============================================

function showMessage(el, message) {
  if (!el) return
  el.textContent = message
  el.style.display = 'block'
}

function hideMessage(el) {
  if (!el) return
  el.style.display = 'none'
  el.textContent = ''

}

