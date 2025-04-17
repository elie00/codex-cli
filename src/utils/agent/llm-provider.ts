/**
 * Interface commune pour tous les fournisseurs de modèles de langage (LLM)
 * Cette interface définit le contrat que tous les fournisseurs doivent implémenter
 */

// Types pour les événements et options
export interface LLMProviderOptions {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  [key: string]: any; // Propriétés additionnelles pour plus de flexibilité
}

// Types simplifiés pour éviter la dépendance à OpenAI
export interface ResponseItem {
  type: string;
  text?: string;
  [key: string]: any;
}

export interface ResponseInputItem {
  type: string;
  content: string | Array<any>;
  [key: string]: any;
}

export interface LLMResponseEvent {
  type: string;
  item?: ResponseItem;
  response?: {
    id: string;
    output: Array<ResponseItem>;
    status: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Interface définissant les fonctionnalités requises pour un fournisseur LLM
 */
export interface LLMProvider {
  /**
   * Initialise le fournisseur avec les options spécifiées
   * @param options Options de configuration du fournisseur
   */
  initialize(options: LLMProviderOptions): Promise<void>;

  /**
   * Crée une réponse en streaming à partir des entrées
   * @param model Nom du modèle à utiliser
   * @param instructions Instructions pour le modèle
   * @param input Tableau d'éléments d'entrée
   * @param previousResponseId ID de la réponse précédente (optionnel)
   * @returns Un itérable asynchrone d'événements de réponse
   */
  createStreamingResponse(
    model: string,
    instructions: string,
    input: Array<ResponseInputItem>,
    previousResponseId?: string
  ): AsyncIterable<LLMResponseEvent>;

  /**
   * Vérifie si un modèle spécifique est supporté par ce fournisseur
   * @param model Nom du modèle à vérifier
   * @returns True si le modèle est supporté, sinon False
   */
  isModelSupported(model: string): Promise<boolean>;

  /**
   * Liste tous les modèles disponibles pour ce fournisseur
   * @returns Liste des noms de modèles disponibles
   */
  listAvailableModels(): Promise<Array<string>>;
}
