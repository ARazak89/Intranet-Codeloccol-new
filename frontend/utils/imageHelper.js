/**
 * Utilitaire pour gérer les URLs des images de profil
 */

const STATIC_ASSETS_BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:4000";

const DEFAULT_AVATAR = "/profile/default-avatar.jpg";

/**
 * Retourne l'URL complète de l'avatar de l'utilisateur
 * Gère les avatars prédéfinis et les images uploadées
 * 
 * @param {string} profilePicture - Le chemin de l'image depuis la base de données
 * @returns {string} - L'URL complète de l'image à afficher
 */
export function getAvatarUrl(profilePicture) {
  // Si pas d'image ou chaîne vide, retourner l'avatar par défaut
  if (!profilePicture || profilePicture.trim() === '') {
    return DEFAULT_AVATAR;
  }

  // Si c'est un avatar prédéfini (commence par /profile/) ou l'avatar par défaut
  if (profilePicture.startsWith('/profile/') || profilePicture.startsWith('/default-avatar')) {
    return profilePicture;
  }

  // Si c'est une image uploadée (commence par /uploads/)
  if (profilePicture.startsWith('/uploads/')) {
    return `${STATIC_ASSETS_BASE_URL}${profilePicture}`;
  }

  // Par défaut, considérer que c'est un chemin relatif du serveur
  return `${STATIC_ASSETS_BASE_URL}${profilePicture}`;
}

/**
 * Vérifie si une image est un avatar prédéfini
 * 
 * @param {string} imagePath - Le chemin de l'image
 * @returns {boolean}
 */
export function isPredefinedAvatar(imagePath) {
  return imagePath && imagePath.startsWith('/profile/');
}

/**
 * Retourne le nom d'affichage d'un avatar prédéfini
 * 
 * @param {string} imagePath - Le chemin de l'image
 * @returns {string}
 */
export function getAvatarDisplayName(imagePath) {
  if (!imagePath) return 'Avatar par défaut';
  
  const filename = imagePath.split('/').pop().split('.')[0];
  
  const displayNames = {
    'bear': 'Ours',
    'chicken': 'Poulet',
    'dog': 'Chien',
    'man': 'Homme',
    'meerkat': 'Suricate',
    'rabbit': 'Lapin',
    'user': 'Utilisateur',
    'woman': 'Femme',
    'woman1': 'Femme (Variante 1)',
    'woman2': 'Femme (Variante 2)',
    'default-avatar': 'Avatar par défaut',
  };
  
  return displayNames[filename] || filename;
}

