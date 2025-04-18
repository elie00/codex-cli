/**
 * Fichier de traduction français pour codex-cli
 * Ce fichier centralise toutes les chaînes de caractères de l'interface
 */

// Types pour les traductions
type TranslationGroups = {
  common: Record<string, string>;
  errors: Record<string, string>;
  cli: Record<string, string>;
  interface: Record<string, string>;
  providers: Record<string, string>;
  splashScreen: Record<string, string>;
  help: Record<string, string>;
  model_selection: Record<string, string>;
};

/**
 * Traductions françaises
 */
const fr: TranslationGroups = {
  // Termes communs utilisés dans toute l'application
  common: {
    // Noms des fournisseurs
    'provider_openai': 'OpenAI',
    'provider_ollama': 'Ollama',
    'provider_huggingface': 'HuggingFace',
    
    // Modes d'approbation
    'approval_suggest': 'suggestion',
    'approval_auto_edit': 'édition auto',
    'approval_full_auto': 'auto complet',
    
    // Termes généraux
    'loading': 'Chargement...',
    'cancel': 'Annuler',
    'confirm': 'Confirmer',
    'yes': 'Oui',
    'no': 'Non',
    'ok': 'OK',
    'error': 'Erreur',
    'warning': 'Attention',
    'info': 'Info',
    'success': 'Succès',
    'default_prompt': 'Bonjour, pouvez-vous m\'aider ?',
    
    // Messages de chargement variés
    'thinking': 'Réflexion en cours...',
    'processing': 'Traitement en cours...',
    'analyzing': 'Analyse en cours...',
    'generating': 'Génération en cours...',
    'writing': 'Rédaction en cours...',
    'coding': 'Programmation en cours...',
    
    // Touches de raccourci
    'press_enter': 'Appuyez sur Entrée',
    'press_esc': 'Appuyez sur Échap',
    'press_tab': 'Appuyez sur Tab',
  },
  
  // Messages pour l'écran de sélection de modèle
  model_selection: {
    'title': 'Sélection du modèle Ollama',
    'instructions': 'Choisissez le modèle que vous souhaitez utiliser pour cette session.',
    'local_models': 'Modèles locaux',
    'popular_models': 'Modèles populaires',
    'no_local_models': 'Aucun modèle local trouvé. Utilisez la commande "ollama pull <modèle>" pour en télécharger.',
    'no_popular_models': 'Aucun modèle populaire disponible actuellement.',
    'loading': 'Chargement des modèles...',
    'help': 'Appuyez sur {toggle} pour basculer entre les modèles locaux/populaires, {select} pour naviguer, {confirm} pour sélectionner, {cancel} pour annuler',
    'params': 'Paramètres pour {model}: {params}',
    'model_selected': 'Modèle {model} sélectionné!',
    'install_model': 'Installer ce modèle',
    'already_installed': 'Déjà installé',
    'current_model': 'Modèle actuel',
    'downloading': 'Téléchargement du modèle {model}...',
    'download_success': 'Modèle {model} téléchargé avec succès!',
    'download_error': 'Erreur lors du téléchargement du modèle {model}',
  },
  
  // Messages d'erreur
  errors: {
    // Erreurs générales
    'generic_error': 'Une erreur est survenue. Veuillez réessayer.',
    'network_error': '⚠️  Erreur réseau lors de la communication avec le fournisseur LLM. Veuillez vérifier votre connexion et réessayer.',
    'timeout_error': '⚠️  Délai d\'attente dépassé. Veuillez réessayer.',
    'provider_error': '⚠️  Erreur du fournisseur LLM. Veuillez réessayer.',
    'api_key_missing': '⚠️  Clé API manquante. Veuillez configurer votre clé API.',
    
    // Erreurs spécifiques à OpenAI
    'openai_api_key_missing': `
⚠️  Clé API OpenAI manquante.

Définissez la variable d'environnement OPENAI_API_KEY et redémarrez cette commande.
Vous pouvez créer une clé ici: https://platform.openai.com/account/api-keys
`,
    'openai_rate_limit': '⚠️  Limite de débit OpenAI atteinte. Veuillez réessayer plus tard.',
    'openai_context_length': '⚠️  La requête actuelle dépasse la longueur de contexte maximale supportée par le modèle choisi. Veuillez raccourcir la conversation, exécuter /clear, ou passer à un modèle avec une fenêtre de contexte plus grande et réessayer.',
    
    // Erreurs spécifiques à Ollama
    'ollama_connection_error': '⚠️  Impossible de se connecter au serveur Ollama. Vérifiez que le serveur est en cours d\'exécution.',
    'ollama_model_not_found': '⚠️  Modèle Ollama non trouvé. Veuillez vérifier le nom du modèle ou télécharger le modèle avec "ollama pull NOM_DU_MODELE".',
    'ollama_error': '⚠️  Erreur Ollama. Veuillez vérifier que le serveur est en cours d\'exécution et que le modèle est disponible.',
    
    // Erreurs liées au modèle
    'model_not_supported': '⚠️  Le modèle "{model}" n\'apparaît pas dans la liste des modèles disponibles pour le fournisseur {provider}.\nVeuillez vérifier le nom du modèle et réessayer.',
    'model_load_error': '⚠️  Erreur lors du chargement du modèle. Veuillez réessayer.',
    
    // Erreurs d'exécution
    'execution_interrupted': '⏹️  Exécution interrompue par l\'utilisateur.',
    'command_error': '⚠️  Erreur lors de l\'exécution de la commande. Code de sortie: {code}',
    'stream_closed': '⚠️  La connexion s\'est fermée prématurément en attendant le modèle. Veuillez réessayer.',
  },
  
  // Messages de ligne de commande
  cli: {
    // Usage et aide
    'usage': `
  Utilisation
    $ codex [options] <prompt>
    $ codex completion <bash|zsh|fish>

  Options
    -h, --help                 Afficher l'aide et quitter
    -m, --model <model>        Modèle à utiliser (défaut: gemma3:4b)
    -i, --image <path>         Chemin(s) vers des fichiers image à inclure
    -v, --view <rollout>       Inspecter un rollout précédemment sauvegardé
    -q, --quiet                Mode non-interactif (affiche seulement la sortie finale)
    -c, --config               Ouvrir le fichier d'instructions dans votre éditeur
    -a, --approval-mode <mode> Remplacer la politique d'approbation: 'suggest', 'auto-edit', ou 'full-auto'

    --auto-edit                Approuver automatiquement les éditions de fichiers; demander pour les commandes
    --full-auto                Approuver automatiquement les éditions et commandes dans le bac à sable

    --no-project-doc           Ne pas inclure automatiquement le 'codex.md' du dépôt
    --project-doc <file>       Inclure un fichier markdown additionnel comme contexte
    --full-stdout              Ne pas tronquer la sortie stdout/stderr des commandes

    --provider <provider>      Fournisseur LLM à utiliser ('openai', 'ollama', ou 'huggingface') (défaut: ollama)
    --provider-url <url>       URL de l'API du fournisseur (pour Ollama et HuggingFace)

  Options dangereuses
    --dangerously-auto-approve-everything
                               Ignorer toutes les demandes de confirmation et exécuter les commandes sans
                               bac à sable. Uniquement destiné aux tests locaux éphémères.

  Options expérimentales
    -f, --full-context         Lancer en mode "contexte complet" qui charge l'ensemble du dépôt
                               dans le contexte et applique un lot de modifications en une fois.

  Exemples
    $ codex "Écrire et exécuter un programme Python qui affiche de l'art ASCII"
    $ codex -q "Corriger les problèmes de build"
    $ codex completion bash
    $ codex --provider ollama --model llama3 "écris une fonction qui calcule fibonacci"
`,
    
    // Exemples et suggestions
    'example_1': 'Explique-moi ce code',
    'example_2': 'Corrige les erreurs de compilation',
    'example_3': 'Y a-t-il des bugs dans mon code?',
    'example_4': 'Écris un programme qui affiche de l\'art ASCII',
    'example_5': 'Optimise cette fonction',
    
    // Messages divers de CLI
    'missing_prompt': 'Le mode silencieux nécessite une chaîne prompt, ex.: codex -q "Corriger le bug #123 dans le projet foobar"',
    'initializing': 'Initialisation de l\'agent...',
    'completion_unsupported_shell': 'Shell non supporté: {shell}',
  },
  
  // Messages d'interface
  interface: {
    // Header et informations de session
    'header_title': 'Codex',
    'header_subtitle': 'assistant de code',
    'session_info': 'session: {id}',
    'workdir': 'workdir: {path}',
    'provider': 'fournisseur: {provider}',
    'model': 'modèle: {model}',
    'approval': 'approbation: {mode}',
    
    // Messages d'interface
    'input_placeholder': 'Envoyer un message ou Tab pour une suggestion',
    'send_message': 'Envoyer',
    'cancel_request': 'Annuler la requête',
    'git_warning_title': 'Attention !',
    'git_warning_message': 'Il peut être dangereux d\'exécuter un agent de codage en dehors d\'un dépôt git, car vous ne pourrez pas annuler facilement les modifications. Voulez-vous continuer ?',
    
    // Messages de fonctionnalités
    'command_review': 'Révision de commande',
    'execute_command': 'Exécuter cette commande ?',
    'approve': 'Approuver',
    'deny': 'Refuser',
    'skip': 'Ignorer',
    'loading_status': '{seconds}s écoulées',
    'context_remaining': 'Contexte restant: {percent}%',
    
    // Overlays
    'history_title': 'Historique',
    'model_selection_title': 'Sélection du modèle',
    'model_switch': 'Changé de modèle vers {model}',
    'approval_mode_title': 'Mode d\'approbation',
    'approval_switch': 'Changé de mode d\'approbation vers {mode}',
  },
  
  // Messages liés aux fournisseurs LLM
  providers: {
    'ollama_connecting': 'Connexion à Ollama...',
    'ollama_connected': 'Connexion à Ollama établie avec succès: {url}',
    'ollama_streaming': 'Démarrage de la réponse en streaming',
    'ollama_request': 'Requête Ollama - Modèle: {model}',
    'ollama_models_available': 'Modèles Ollama disponibles: {models}',
    'ollama_model_info': 'Informations sur le modèle: {info}',
    
    'openai_models_available': 'Modèles OpenAI disponibles: {models}',
    'openai_request': 'Requête OpenAI - Modèle: {model}',
    
    'huggingface_connecting': 'Connexion à HuggingFace...',
    'huggingface_models_available': 'Modèles HuggingFace disponibles: {models}',
  },
  
  // Messages de l'écran d'accueil
  splashScreen: {
    'welcome': '* Bienvenue dans votre assistant de code',
    'loading': 'Initialisation... {percent}%',
    'ready': 'Prêt !',
    'login_success': '🚀 Connexion réussie. Appuyez sur ',
    'enter_to_continue': 'Entrée',
    'to_continue': ' pour continuer',
    'version': 'Version {version}',
    'provider_info': 'Fournisseur: {provider} | Modèle: {model}',
  },
  
  // Messages d'aide
  help: {
    'title': 'Aide Codex',
    'subtitle': 'Raccourcis et commandes',
    'shortcuts_title': 'Raccourcis clavier',
    'commands_title': 'Commandes',
    
    'shortcut_esc': 'Échap',
    'shortcut_esc_desc': 'Annuler la requête en cours / Quitter l\'overlay',
    'shortcut_enter': 'Entrée',
    'shortcut_enter_desc': 'Envoyer le message / Confirmer',
    'shortcut_tab': 'Tab',
    'shortcut_tab_desc': 'Afficher les suggestions',
    'shortcut_arrows': 'Flèches Haut/Bas',
    'shortcut_arrows_desc': 'Naviguer dans l\'historique des messages',
    'shortcut_ctrl_c': 'Ctrl+C',
    'shortcut_ctrl_c_desc': 'Quitter Codex',
    
    'command_help': '/help',
    'command_help_desc': 'Afficher cette aide',
    'command_clear': '/clear',
    'command_clear_desc': 'Effacer l\'historique de la conversation',
    'command_model': '/model',
    'command_model_desc': 'Changer de modèle',
    'command_mode': '/mode',
    'command_mode_desc': 'Changer de mode d\'approbation',
    'command_ollama': '/ollama',
    'command_ollama_desc': 'Configurer les paramètres Ollama',
    'command_models': '/models',
    'command_models_desc': 'Gérer les modèles Ollama',
  },
};

/**
 * Fonction pour obtenir une traduction
 * @param key Clé de traduction sous forme 'groupe.clé'
 * @param params Paramètres optionnels pour les substitutions
 */
export function translate(key: string, params?: Record<string, string | number>): string {
  const [group, subKey] = key.split('.');
  
  if (!group || !subKey) {
    console.warn(`Clé de traduction invalide: ${key}`);
    return key;
  }
  
  // Vérifier si le groupe existe
  if (!(group in fr)) {
    console.warn(`Groupe de traduction inconnu: ${group}`);
    return key;
  }
  
  // Obtenir le texte traduit
  const translationGroup = fr[group as keyof TranslationGroups];
  const translated = translationGroup[subKey];
  
  if (!translated) {
    console.warn(`Clé de traduction inconnue: ${key}`);
    return key;
  }
  
  // Remplacer les paramètres si nécessaire
  if (params) {
    return Object.entries(params).reduce(
      (text, [paramKey, paramValue]) => 
        text.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue)),
      translated
    );
  }
  
  return translated;
}

// Alias pour simplifier l'utilisation
export const t = translate;

// Exporter le dictionnaire et la fonction
export default { fr, translate, t };
