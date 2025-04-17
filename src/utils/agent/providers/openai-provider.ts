/**
 * Implémentation du fournisseur LLM pour OpenAI
 * Utilise directement l'API OpenAI sans conversion
 */

import { LLMProvider, LLMProviderOptions, LLMResponseEvent, ResponseInputItem } from '../llm-provider';
import OpenAI from 'openai';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  /**
   * Initialise le client OpenAI avec les options fournies
   */
  async initialize(options: LLMProviderOptions): Promise<void> {
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
    const models = await this.listAvailableModels();
    return models.includes(model);
  }

  /**
   * Liste tous les modèles disponibles sur OpenAI
   */
  async listAvailableModels(): Promise<Array<string>> {
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
