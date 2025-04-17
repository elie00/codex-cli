/**
 * Implémentation du fournisseur LLM pour Hugging Face
 * Adapte les entrées/sorties entre le format OpenAI et Hugging Face
 */

import { LLMProvider, LLMProviderOptions, LLMResponseEvent, ResponseInputItem, ResponseItem } from '../llm-provider';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export class HuggingFaceProvider implements LLMProvider {
  private baseURL: string = 'http://localhost:8080';
  private timeout: number = 60000;
  private apiKey?: string;

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
    if (options.apiKey) {
      this.apiKey = options.apiKey;
    }
  }

  /**
   * Crée une réponse en streaming à partir des entrées
   * Convertit les formats entre OpenAI et Hugging Face
   */
  async *createStreamingResponse(
    model: string,
    instructions: string,
    input: Array<ResponseInputItem>,
    previousResponseId?: string
  ): AsyncIterable<LLMResponseEvent> {
    // Conversion au format HF
    const payload = this.convertInputToHFFormat(instructions, input, model);
    
    // Options pour la requête
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    try {
      const response = await axios.post(
        `${this.baseURL}/generate_stream`,
        payload,
        {
          timeout: this.timeout,
          headers,
          responseType: 'stream',
        }
      );

      const responseId = uuidv4();
      let fullResponse = '';
      
      // Traiter le stream de réponse
      for await (const chunk of response.data) {
        const text = chunk.toString();
        fullResponse += text;
        
        // Créer un élément de réponse pour chaque morceau significatif
        const item = this.convertHFChunkToResponseItem(text);
        if (item) {
          yield {
            type: 'response.output_item.done',
            item,
          };
        }
      }

      // Événement final avec la réponse complète
      yield {
        type: 'response.completed',
        response: {
          id: responseId,
          output: this.convertHFResponseToOutputItems(fullResponse),
          status: 'completed',
        },
      };
    } catch (error) {
      console.error("Erreur lors de la communication avec Hugging Face:", error);
      throw error;
    }
  }

  /**
   * Vérifie si un modèle spécifique est supporté par Hugging Face
   */
  async isModelSupported(model: string): Promise<boolean> {
    try {
      const models = await this.listAvailableModels();
      return models.includes(model);
    } catch (error) {
      console.error("Erreur lors de la vérification du modèle Hugging Face:", error);
      return false;
    }
  }

  /**
   * Liste tous les modèles disponibles sur Hugging Face
   */
  async listAvailableModels(): Promise<Array<string>> {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        timeout: this.timeout,
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : undefined
      });
      return response.data.data || [];
    } catch (error) {
      console.error("Erreur lors de la récupération des modèles Hugging Face:", error);
      return [];
    }
  }

  /**
   * Convertit les entrées du format OpenAI au format Hugging Face
   */
  private convertInputToHFFormat(instructions: string, input: Array<ResponseInputItem>, model: string): any {
    // Extraire le contexte et la question de l'input
    let prompt = '';
    let systemPrompt = instructions || '';
    
    // Construire le prompt au format d'instruction
    for (const item of input) {
      if (item.type === 'user' && typeof item.content === 'string') {
        prompt += `User: ${item.content}\n`;
      } else if (item.type === 'assistant' && typeof item.content === 'string') {
        prompt += `Assistant: ${item.content}\n`;
      } else if (Array.isArray(item.content)) {
        // Gérer le contenu sous forme de tableau (texte et images)
        const textParts = item.content
          .filter(part => typeof part === 'object' && part.text)
          .map(part => part.text)
          .join('');
          
        if (item.type === 'user') {
          prompt += `User: ${textParts}\n`;
        } else if (item.type === 'assistant') {
          prompt += `Assistant: ${textParts}\n`;
        }
      }
    }
    
    // Ajouter le dernier tour pour l'assistant
    prompt += `Assistant: `;
    
    // Format de la requête pour Text Generation Inference
    return {
      inputs: prompt,
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.7,
        top_p: 0.95,
        do_sample: true,
        return_full_text: false
      },
      model: model,
      stream: true,
      system_prompt: systemPrompt
    };
  }

  /**
   * Convertit un morceau de réponse HF en ResponseItem
   */
  private convertHFChunkToResponseItem(chunk: string): ResponseItem | undefined {
    // Essayer de parser le JSON
    try {
      const data = JSON.parse(chunk);
      if (data.token && data.token.text) {
        return {
          type: 'text',
          text: data.token.text
        };
      }
    } catch (e) {
      // Si ce n'est pas du JSON valide, vérifier si c'est du texte brut
      if (chunk.trim()) {
        return {
          type: 'text',
          text: chunk
        };
      }
    }
    
    return undefined;
  }

  /**
   * Convertit la réponse complète HF en tableau de ResponseItem
   */
  private convertHFResponseToOutputItems(response: string): Array<ResponseItem> {
    let fullText = '';
    
    // Essayer d'extraire le texte des morceaux JSON
    try {
      const lines = response.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.token && json.token.text) {
            fullText += json.token.text;
          }
        } catch (e) {
          // Si ce n'est pas du JSON, l'ajouter directement
          fullText += line;
        }
      }
    } catch (e) {
      // En cas d'échec, utiliser la chaîne brute
      fullText = response;
    }
    
    // Retourner comme un seul élément de texte
    return [{
      type: 'text',
      text: fullText
    }];
  }
}
