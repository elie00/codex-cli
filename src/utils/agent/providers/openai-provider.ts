/**
 * Implémentation du fournisseur LLM pour OpenAI
 * Utilise directement l'API OpenAI sans conversion
 * 
 * IMPORTANT: Importation dynamique d'OpenAI pour éviter l'initialisation automatique
 */

import { LLMProvider, LLMProviderOptions, LLMResponseEvent, ResponseInputItem } from '../llm-provider';

// Suppression de l'importation statique d'OpenAI pour éviter le chargement systématique
// import OpenAI from 'openai';

export class OpenAIProvider implements LLMProvider {
  private client: any; // Type any pour éviter la dépendance au type OpenAI

  /**
   * Initialise le client OpenAI avec les options fournies
   * Utilise une importation dynamique pour éviter le chargement du module OpenAI
   * lorsqu'il n'est pas nécessaire
   */
  async initialize(options: LLMProviderOptions): Promise<void> {
    // Importation dynamique d'OpenAI uniquement lorsque ce fournisseur est utilisé
    const OpenAI = (await import('openai')).default;
    
    if (!options.apiKey) {
      throw new Error("OpenAI provider requires an API key. Please set the OPENAI_API_KEY environment variable.");
    }
    
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      timeout: options.timeout,
    });
  }

  /**
   * Crée une réponse en streaming en utilisant directement l'API OpenAI
   */
  async *createStreamingResponse(
    model: string,
    instructions: string,
    input: Array<ResponseInputItem>,
    previousResponseId?: string
  ): AsyncIterable<LLMResponseEvent> {
    if (!this.client) {
      throw new Error("OpenAI client not initialized. Did you call initialize()?");
    }
    
    // Utiliser directement l'API OpenAI car le format est déjà compatible
    const stream = await this.client.responses.create({
      model,
      instructions,
      input,
      previous_response_id: previousResponseId,
      stream: true,
    });

    // Transmettre directement les événements du stream
    for await (const event of stream) {
      yield event as LLMResponseEvent;
    }
  }

  /**
   * Vérifie si le modèle spécifié est supporté par OpenAI
   */
  async isModelSupported(model: string): Promise<boolean> {
    if (!this.client) {
      throw new Error("OpenAI client not initialized. Did you call initialize()?");
    }
    
    const models = await this.listAvailableModels();
    return models.includes(model);
  }

  /**
   * Liste tous les modèles disponibles sur OpenAI
   */
  async listAvailableModels(): Promise<Array<string>> {
    if (!this.client) {
      throw new Error("OpenAI client not initialized. Did you call initialize()?");
    }
    
    try {
      const list = await this.client.models.list();
      const models: Array<string> = [];
      
      for await (const model of list) {
        if (model.id) {
          models.push(model.id);
        }
      }
      
      return models;
    } catch (error) {
      console.error("Erreur lors de la récupération des modèles OpenAI:", error);
      return [];
    }
  }
}
