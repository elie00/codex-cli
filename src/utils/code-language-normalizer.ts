/**
 * Utilitaire pour normaliser les indicateurs de langage de code
 * Résout notamment le problème "Could not find the language 'tool_code'..."
 */

/**
 * Map des langages spécifiques à Ollama vers des langages reconnus par marked-terminal
 */
const languageMap: Record<string, string> = {
  // Langages spécifiques à corriger
  'tool_code': 'javascript',
  'py': 'python',
  'python3': 'python',
  'js': 'javascript',
  'ts': 'typescript',
  'jsx': 'javascript',
  'tsx': 'typescript',
  'sh': 'bash',
  'shell': 'bash',
  'yml': 'yaml',
  'json5': 'json',
  'rust': 'rs',
  'golang': 'go',
  'plaintext': '',
  'text': '',
  // Ajoutez d'autres mappages au besoin
};

/**
 * Liste des langages reconnus par le formateur de code
 * Cette liste peut être mise à jour selon les langages supportés par marked-terminal
 */
const recognizedLanguages = new Set([
  'javascript', 'js',
  'typescript', 'ts',
  'python', 'py',
  'java',
  'c', 'cpp', 'c++',
  'csharp', 'c#',
  'go',
  'rust', 'rs',
  'php',
  'ruby', 'rb',
  'swift',
  'kotlin',
  'scala',
  'bash', 'sh',
  'powershell',
  'sql',
  'html',
  'css',
  'scss',
  'less',
  'xml',
  'json',
  'yaml', 'yml',
  'markdown', 'md',
  'plaintext',
  'text',
  // Ajoutez d'autres langages reconnus au besoin
]);

/**
 * Normalise un indicateur de langage pour qu'il soit compatible avec le formateur de code
 * 
 * @param language - L'indicateur de langage d'origine
 * @returns L'indicateur de langage normalisé
 */
export function normalizeCodeLanguage(language: string): string {
  if (!language) {
    return '';
  }
  
  // Supprimer les caractères non alphanumériques et convertir en minuscules
  const cleanLanguage = language.trim().toLowerCase();
  
  // Vérifier si le langage est dans la map de conversion
  if (languageMap[cleanLanguage]) {
    return languageMap[cleanLanguage];
  }
  
  // Vérifier si le langage est déjà reconnu
  if (recognizedLanguages.has(cleanLanguage)) {
    return cleanLanguage;
  }
  
  // Pour les langages non reconnus, essayer de trouver une correspondance partielle
  for (const recognized of recognizedLanguages) {
    if (cleanLanguage.includes(recognized) || recognized.includes(cleanLanguage)) {
      return recognized;
    }
  }
  
  // Fallback: retourner vide pour ne pas causer d'erreur d'affichage
  return '';
}

/**
 * Transforme le markdown en remplaçant les indicateurs de langage dans les blocs de code
 * 
 * @param markdown - Le contenu markdown d'origine
 * @returns Le markdown avec des indicateurs de langage normalisés
 */
export function normalizeMarkdownCodeBlocks(markdown: string): string {
  if (!markdown) {
    return '';
  }
  
  // Expression régulière pour trouver les blocs de code avec leur langage
  const codeBlockRegex = /```(\w*)([\s\S]*?)```/g;
  
  // Remplacer tous les blocs de code avec des langages normalisés
  return markdown.replace(codeBlockRegex, (match, language, code) => {
    const normalizedLanguage = normalizeCodeLanguage(language);
    return '```' + normalizedLanguage + code + '```';
  });
}
