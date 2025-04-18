/**
 * Utilitaires de style pour l'interface CLI
 * Ce fichier contient des fonctions pour formater et styliser le texte dans l'interface terminal
 */

// Couleur verte "Matrix" - peut être ajustée selon la préférence
export const MATRIX_GREEN = '#00FF00';

/**
 * Formate une commande en style "Matrix" (vert brillant)
 * Cette fonction permet d'appliquer un style vert distinctif aux commandes commençant par "/"
 * 
 * @param text Le texte à formater
 * @returns Le texte formaté avec les commandes en vert matrix
 */
export function formatCommandMatrix(text: string): string {
  // Détecte les commandes commençant par "/" et applique la couleur
  return text.replace(/\/\w+/g, (match) => `\x1b[38;2;0;255;0m${match}\x1b[0m`);
}

/**
 * Vérifie si un texte est une commande (commence par "/")
 * 
 * @param text Le texte à vérifier
 * @returns true si le texte est une commande
 */
export function isCommand(text: string): boolean {
  return text.trim().startsWith('/');
}

/**
 * Formate une commande complète pour l'affichage en style "Matrix"
 * Cette fonction est utilisée pour les commandes entières (pas seulement le préfixe)
 * 
 * @param command La commande à formater
 * @returns La commande formatée en style matrix
 */
export function formatFullCommandMatrix(command: string): string {
  if (isCommand(command)) {
    return `\x1b[38;2;0;255;0m${command}\x1b[0m`;
  }
  return command;
}

/**
 * Colorie le texte selon la couleur spécifiée
 * 
 * @param text Le texte à colorier
 * @param color La couleur à appliquer (code couleur)
 * @returns Le texte colorié
 */
export function colorText(text: string, color: string): string {
  return `\x1b[${color}m${text}\x1b[0m`;
}

// Codes de couleurs prédéfinis
export const TextColors = {
  GREEN: '32',
  RED: '31',
  YELLOW: '33',
  BLUE: '34',
  MAGENTA: '35',
  CYAN: '36',
  WHITE: '37',
  BRIGHT_GREEN: '92',
  BRIGHT_RED: '91',
  BRIGHT_YELLOW: '93',
  BRIGHT_BLUE: '94',
  BRIGHT_MAGENTA: '95',
  BRIGHT_CYAN: '96',
  BRIGHT_WHITE: '97'
};

// Styles de texte
export const TextStyles = {
  BOLD: '1',
  DIM: '2',
  ITALIC: '3',
  UNDERLINE: '4',
  BLINK: '5',
  REVERSE: '7',
  HIDDEN: '8'
};

/**
 * Applique un style au texte
 * 
 * @param text Le texte à styliser
 * @param style Le code de style à appliquer
 * @returns Le texte stylisé
 */
export function styleText(text: string, style: string): string {
  return `\x1b[${style}m${text}\x1b[0m`;
}

/**
 * Formate toutes les commandes dans un bloc de texte
 * 
 * @param text Le bloc de texte contenant potentiellement des commandes
 * @returns Le texte avec toutes les commandes formatées en vert matrix
 */
export function formatAllCommands(text: string): string {
  const commandPattern = /(\/[a-z]+)/gi;
  return text.replace(commandPattern, (match) => colorText(match, TextColors.BRIGHT_GREEN));
}
