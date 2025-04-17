/**
 * Implémentation du fournisseur LLM pour Ollama
 * Adapte les entrées/sorties entre le format OpenAI et Ollama
 */

import { LLMProvider, LLMProviderOptions, LLMResponseEvent, ResponseInputItem, ResponseItem } from '../llm-provider';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export class OllamaProvider implements LLMProvider {
  private baseURL: string = 'http://localhost:11434/api';
  private timeout: number = 60000;

  /**
   * Initialise le fournisseur avec les options spécifiées
   */
  async initialize(options: LLMProviderOptions): Promise<void> {
    if (options.baseURL) {
      this.baseURL = options.baseURL;
    }
    if (options.timeout) {
      this.timeout = options.timeout;
    }
  }

  /**
   * Crée une réponse en streaming à partir des entrées
   * Convertit les formats entre OpenAI et Ollama
   */
  async *createStreamingResponse(
    model: string,
    instructions: string,
    input: Array<ResponseInputItem>,
    previousResponseId?: string
  ): AsyncIterable<LLMResponseEvent> {
    // Convertir les entrées au format Ollama
    const messages = this.convertInputToOllamaFormat(instructions, input);
    
    try {
      // Requête en streaming à Ollama
      const response = await axios.post(
        `${this.baseURL}/chat`,
        {
          model,
          messages,
          stream: true,
        },
        {
          timeout: this.timeout,
          responseType: 'stream',
        }
      );

      const responseId = uuidv4();
      let fullResponse = '';
      
      // Traiter le stream de réponse
      for await (const chunk of response.data) {
        const text = chunk.toString();
        fullResponse += text;
        
        // Essayer de parser le JSON
        try {
          const jsonChunk = JSON.parse(text);
          const item = this.convertOllamaChunkToResponseItem(jsonChunk);
          
          if (item) {
            yield {
              type: 'response.output_item.done',
              item,
            };
          }
        } catch (e) {
          // Ignorer les erreurs de parsing - certains morceaux peuvent ne pas être du JSON valide
        }
      }

      // Événement final avec la réponse complète
      yield {
        type: 'response.completed',
        response: {
          id: responseId,
          output: this.convertOllamaResponseToOutputItems(fullResponse),
          status: 'completed',
        },
      };
    } catch (error) {
      console.error("Erreur lors de la communication avec Ollama:", error);
      throw error;
    }
  }

  /**
   * Vérifie si un modèle spécifique est supporté par Ollama
   */
  async isModelSupported(model: string): Promise<boolean> {
    try {
      const models = await this.listAvailableModels();
      return models.includes(model);
    } catch (error) {
      console.error("Erreur lors de la vérification du modèle Ollama:", error);
      return false;
    }
  }

  /**
   * Liste tous les modèles disponibles sur Ollama
   */
  async listAvailableModels(): Promise<Array<string>> {
    try {
      const response = await axios.get(`${this.baseURL}/tags`, {
        timeout: this.timeout
      });
      return response.data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error("Erreur lors de la récupération des modèles Ollama:", error);
      return [];
    }
  }

  /**
   * Convertit les entrées du format OpenAI au format Ollama
   */
  private convertInputToOllamaFormat(instructions: string, input: Array<ResponseInputItem>): Array<any> {
    const messages = [];
    
    // Ajouter les instructions comme message système
    if (instructions) {
      messages.push({
        role: 'system',
        content: instructions
      });
    }
    
    // Convertir chaque élément d'entrée en message Ollama
    for (const item of input) {
      if (item.type === 'user' || item.type === 'assistant') {
        let content = '';
        
        // Traiter le contenu qui peut être une chaîne ou un tableau
        if (typeof item.content === 'string') {
          content = item.content;
        } else if (Array.isArray(item.content)) {
          // Concaténer les parties de contenu
          content = item.content
            .filter(part => typeof part === 'object' && part.text)
            .map(part => part.text)
            .join('');
        }
        
        messages.push({
          role: item.type,
          content
        });
      }
    }
    
    return messages;
  }

  /**
   * Convertit un morceau de réponse Ollama en ResponseItem
   */
  private convertOllamaChunkToResponseItem(chunk: any): ResponseItem | undefined {
    if (chunk && typeof chunk.message === 'object' && chunk.message.content) {
      return {
        type: 'text',
        text: chunk.message.content
      };
    }
    return undefined;
  }

  /**
   * Convertit la réponse complète Ollama en tableau de ResponseItem
   */
  private convertOllamaResponseToOutputItems(response: string): Array<ResponseItem> {
    let fullText = '';
    
    // Tenter d'extraire tout le texte des morceaux JSON
    try {
      const lines = response.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message && json.message.content) {
            fullText += json.message.content;
          }
        } catch (e) {
          // Ignorer les lignes qui ne sont pas du JSON valide
        }
      }
    } catch (e) {
      // En cas d'échec, utiliser la chaîne brute (meilleur que rien)
      fullText = response;
    }
    
    // Retourner comme un seul élément de texte
    return [{
      type: 'text',
      text: fullText
    }];
  }
}
