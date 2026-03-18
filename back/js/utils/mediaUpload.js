// js/utils/mediaUpload.js

import { supabase } from '../supabaseClient.js'
import { validateMedia } from './limits.js'

// =============================================
// UPLOAD & SUPPRESSION DES MÉDIAS
// Supabase Storage — bucket : menu-media
// =============================================

const BUCKET = 'honopstaurant'


// --- Upload d'un média ---

export async function uploadMedia(file, dishName) {
  // 1. Valider le fichier
  const validation = validateMedia(file)
  if (!validation.valid) {
    return { success: false, message: validation.message }
  }

  // 2. Générer un nom de fichier unique
  const timestamp = Date.now()
  const safeName = dishName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .slice(0, 30)

  const extension = file.name.split('.').pop().toLowerCase()
  const fileName = `${safeName}-${timestamp}.${extension}`
  const filePath = `plats/${fileName}`

  // 3. Upload dans Supabase Storage
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    })

  if (error) {
    console.error('Erreur upload média :', error.message)
    return { success: false, message: 'Erreur lors de l\'upload du fichier.' }
  }

  // 4. Récupérer l'URL publique
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath)

  return {
    success: true,
    url: data.publicUrl,
    mediaType: validation.mediaType,
    filePath
  }
}


// --- Supprimer un média ---

export async function deleteMedia(mediaUrl) {
  if (!mediaUrl) return { success: true }

  // Extraire le filePath depuis l'URL publique
  const filePath = extractFilePath(mediaUrl)
  if (!filePath) return { success: false, message: 'Chemin du fichier introuvable.' }

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([filePath])

  if (error) {
    console.error('Erreur suppression média :', error.message)
    return { success: false, message: 'Erreur lors de la suppression du fichier.' }
  }

  return { success: true }
}


// --- Remplacer un média (supprime l'ancien, upload le nouveau) ---

export async function replaceMedia(oldUrl, newFile, dishName) {
  // 1. Supprimer l'ancien fichier si existant
  if (oldUrl) {
    await deleteMedia(oldUrl)
  }

  // 2. Upload du nouveau fichier
  return await uploadMedia(newFile, dishName)
}


// --- Extraire le filePath depuis une URL publique Supabase ---

function extractFilePath(url) {
  if (!url) return null

  try {
    // URL format : https://xxx.supabase.co/storage/v1/object/public/menu-media/plats/fichier.jpg
    const marker = `/object/public/${BUCKET}/`
    const index = url.indexOf(marker)
    if (index === -1) return null
    return url.slice(index + marker.length)
  } catch {
    return null
  }
}


// --- Générer une preview locale avant upload ---

export function generatePreview(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null)

    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Erreur lecture fichier'))
    reader.readAsDataURL(file)
  })
}


// --- Vérifier si une URL est une vidéo ---

export function isVideoUrl(url) {
  if (!url) return false
  const videoExtensions = ['.mp4', '.webm', '.ogg']
  return videoExtensions.some(ext => url.toLowerCase().includes(ext))
}