/**
 * Implémentation du fournisseur LLM pour Ollama
 * Adapte les entrées/sorties entre le format OpenAI et Ollama
 */

import { LLMProvider, LLMProviderOptions, LLMResponseEvent, ResponseInputItem, ResponseItem } from '../llm-provider';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { isLoggingEnabled, log } from '../../agent/log.js';

export class OllamaProvider implements LLMProvider {
  private baseURL: string = 'http://localhost:11434/api';
  private timeout: number = 120000; // Timeout plus long pour les requêtes
  private abortController: AbortController | null = null;
  private useStreaming: boolean = false; // Désactivation par défaut du streaming

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
    if (options['useStreaming'] !== undefined) {
      this.useStreaming = options['useStreaming'];
    }
    
    // Vérifier la connexion à Ollama
    try {
      await axios.get(`${this.baseURL}/tags`, { timeout: 5000 });
      if (isLoggingEnabled()) {
        log(`Connexion à Ollama établie avec succès: ${this.baseURL}`);
      }
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? error.message 
        : String(error);
      console.error(`Erreur lors de la connexion à Ollama (${this.baseURL}):`, errorMessage);
      throw new Error(`Impossible de se connecter à Ollama sur ${this.baseURL}. Vérifiez que le serveur est en cours d'exécution.`);
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
    // Créer un nouvel AbortController pour cette requête
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    
    try {
      // Extraire le prompt de l'utilisateur
      const userPrompt = this.extractUserPrompt(input);
      
      if (isLoggingEnabled()) {
        log(`Requête Ollama - Modèle: ${model}`);
        log(`Requête Ollama - Prompt: "${userPrompt}"`);
        log(`Requête Ollama - Mode streaming: ${this.useStreaming ? "Oui" : "Non"}`);
        log(`Requête Ollama - Instructions système: ${instructions ? "Oui" : "Non"}`);
      }
      
      // Créer les messages au format Ollama
      const messages = [];
      
      // Ajouter les instructions comme message système
      if (instructions && instructions.trim()) {
        messages.push({
          role: 'system',
          content: instructions
        });
      }
      
      // Ajouter le prompt de l'utilisateur
      if (userPrompt && userPrompt.trim()) {
        messages.push({
          role: 'user',
          content: userPrompt
        });
      } else {
        // Si aucun prompt utilisateur n'est trouvé, utiliser un message par défaut
        messages.push({
          role: 'user',
          content: "Bonjour, pouvez-vous m'aider?"
        });
      }
      
      if (isLoggingEnabled()) {
        log(`Messages Ollama: ${JSON.stringify(messages, null, 2)}`);
      }
      
      // Générer un ID unique pour la réponse
      const responseId = previousResponseId || uuidv4();
      
      // Créer un item de message pour la réponse
      const messageItem: ResponseItem = {
        id: `ollama-response-${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'input_text',
            text: ''
          }
        ],
        // Ajouter des métadonnées pour identifier le fournisseur
        metadata: {
          provider_name: 'ollama'
        }
      };

      if (this.useStreaming) {
        // Version streaming
        // Informer que la réponse commence
        const startEvent: LLMResponseEvent = {
          type: 'response.output_item.start',
          item: messageItem
        };
        yield startEvent;

        if (isLoggingEnabled()) {
          log(`Démarrage de la réponse en streaming`);
        }

        // Utiliser l'option responseType: 'text' pour traiter correctement le streaming
        const response = await axios.post(
          `${this.baseURL}/chat`,
          {
            model: model,
            messages: messages,
            stream: true
          },
          {
            timeout: this.timeout,
            responseType: 'stream',
            signal: signal,
          }
        );

        // Variable pour stocker la réponse complète
        let fullResponse = '';

        // Obtenir le stream de données
        const stream = response.data;

        try {
          // Pour chaque chunk de données reçu
          for await (const chunk of stream) {
            // Arrêter si la requête a été annulée
            if (signal.aborted) {
              break;
            }

            // Convertir le chunk en texte
            const chunkText = chunk.toString('utf-8');
            
            if (isLoggingEnabled()) {
              log(`Chunk reçu: ${chunkText.length} caractères`);
            }

            // Traiter chaque ligne du chunk (un JSON par ligne)
            const lines = chunkText.split('\n').filter((line: string) => line.trim() !== '');
            
            for (const line of lines) {
              try {
                // Parser la ligne en JSON
                const data = JSON.parse(line);
                
                if (data.message && typeof data.message === 'object' && 'content' in data.message && typeof data.message['content'] === 'string') {
                  // Dans le format d'Ollama, chaque message contient le texte complet jusqu'à ce point
                  // Donc nous remplaçons notre réponse complète au lieu de l'accumuler
                  fullResponse = data.message['content'];
                  
                  // Mettre à jour le contenu de l'item de message
                  messageItem['content'] = [
                    {
                      type: 'input_text',
                      text: fullResponse
                    }
                  ];
                  
                  // Créer l'événement delta
                  const deltaEvent: LLMResponseEvent = {
                    type: 'response.output_item.delta',
                    delta: {
                      type: 'message',
                      'content': [
                        {
                          type: 'input_text',
                          text: fullResponse
                        }
                      ]
                    },
                    itemId: messageItem.id
                  };
                  
                  // Émettre l'événement delta
                  yield deltaEvent;
                }
                
                // Vérifier si c'est la fin de la génération
                if (data.done === true) {
                  if (isLoggingEnabled()) {
                    log(`Fin de la réponse en streaming. Texte complet: ${fullResponse.length} caractères`);
                  }
                  
                  // Créer l'événement de fin d'item
                  const doneEvent: LLMResponseEvent = {
                    type: 'response.output_item.done',
                    item: messageItem
                  };
                  
                  // Émettre l'événement de fin d'item
                  yield doneEvent;
                  
                  // Créer l'événement de complétion
                  const completedEvent: LLMResponseEvent = {
                    type: 'response.completed',
                    response: {
                      id: responseId,
                      output: [messageItem],
                      status: 'completed'
                    }
                  };
                  
                  // Émettre l'événement de complétion
                  yield completedEvent;
                  
                  // Sortir de la boucle
                  return;
                }
              } catch (jsonError) {
                if (isLoggingEnabled()) {
                  const errorMessage = jsonError && typeof jsonError === 'object' && 'message' in jsonError 
                    ? jsonError.message 
                    : String(jsonError);
                  log(`Erreur de parsing JSON: ${errorMessage}, ligne: ${line}`);
                }
                // Continuer avec la ligne suivante
                continue;
              }
            }
          }
          
          // Si on arrive ici, le stream s'est terminé sans marqueur "done"
          // On finalise quand même la réponse
          if (isLoggingEnabled()) {
            log(`Stream terminé sans marqueur done. Finalisation de la réponse.`);
          }
          
          // Créer l'événement de fin d'item
          const doneEvent: LLMResponseEvent = {
            type: 'response.output_item.done',
            item: messageItem
          };
          
          // Émettre l'événement de fin d'item
          yield doneEvent;
          
          // Créer l'événement de complétion
          const completedEvent: LLMResponseEvent = {
            type: 'response.completed',
            response: {
              id: responseId,
              output: [messageItem],
              status: 'completed'
            }
          };
          
          // Émettre l'événement de complétion
          yield completedEvent;
          
        } catch (streamError) {
          if (isLoggingEnabled()) {
            const errorMessage = streamError && typeof streamError === 'object' && 'message' in streamError 
              ? streamError.message 
              : String(streamError);
            log(`Erreur lors du traitement du stream: ${errorMessage}`);
          }
          throw streamError;
        }
      } else {
        // Version non-streaming (fallback)
        // Appel à l'API Ollama en mode non-streaming
        const response = await axios.post(
          `${this.baseURL}/chat`,
          {
            model: model,
            messages: messages,
            stream: false
          },
          {
            timeout: this.timeout
          }
        );
        
        if (isLoggingEnabled()) {
          log(`Réponse Ollama non-streaming: ${JSON.stringify(response.data, null, 2)}`);
        }
        
        // Extraire le texte de la réponse
        let assistantResponse = '';
        if (response.data && response.data.message && typeof response.data.message === 'object' && 'content' in response.data.message) {
          assistantResponse = response.data.message['content'];
        } else {
          assistantResponse = "Désolé, je n'ai pas pu générer de réponse. Veuillez réessayer.";
        }
        
        // Mettre à jour le contenu de l'item de message
        messageItem['content'] = [
          {
            type: 'input_text',
            text: assistantResponse
          }
        ];
        
        // Émettre l'item de message
        const outputEvent: LLMResponseEvent = {
          type: 'response.output_item.done',
          item: messageItem
        };
        yield outputEvent;
        
        // Émettre l'événement de complétion
        const completedEvent: LLMResponseEvent = {
          type: 'response.completed',
          response: {
            id: responseId,
            output: [messageItem],
            status: 'completed'
          }
        };
        yield completedEvent;
      }
    } catch (error) {
      // Ne pas traiter les erreurs d'annulation comme des erreurs
      if (error && typeof error === 'object' && 'name' in error && 
          (error.name === 'AbortError' || (signal && signal.aborted))) {
        if (isLoggingEnabled()) {
          log('Requête Ollama annulée');
        }
        return;
      }
      
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? error.message 
        : String(error);
      console.error("Erreur lors de la communication avec Ollama:", errorMessage);
      
      // Créer un message d'erreur pour l'utilisateur
      const errorText = `⚠️ Erreur lors de la communication avec Ollama: ${errorMessage}. Vérifiez que le serveur Ollama fonctionne correctement.`;
      
      const errorItem: ResponseItem = {
        id: `ollama-error-${Date.now()}`,
        type: 'message',
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: errorText
          }
        ]
      };
      
      // Émettre l'item d'erreur
      const errorEvent: LLMResponseEvent = {
        type: 'response.output_item.done',
        item: errorItem
      };
      yield errorEvent;
      
      throw error;
    } finally {
      // Nettoyer l'AbortController
      this.abortController = null;
    }
  }

  /**
   * Annule la requête en cours si elle existe
   */
  cancelRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      if (isLoggingEnabled()) {
        log('Requête Ollama annulée par l\'utilisateur');
      }
    }
  }

  /**
   * Extrait le prompt utilisateur depuis les entrées
   */
  private extractUserPrompt(input: Array<ResponseInputItem>): string {
    // Si l'entrée est vide, retourner une chaîne vide
    if (!input || input.length === 0) {
      return '';
    }
    
    let userPrompt = '';
    
    // Parcourir chaque élément d'entrée
    for (const item of input) {
      // Si c'est un message utilisateur
      if ((item.type === 'user' || (item.type === 'message' && item['role'] === 'user')) && item.content) {
        // Extraire le texte selon le format
        if (typeof item.content === 'string') {
          userPrompt = item.content;
        } else if (Array.isArray(item.content)) {
          // Parcourir les éléments de contenu
          for (const contentItem of item.content) {
            if (contentItem && typeof contentItem === 'object') {
              // Extraire le texte des éléments de type texte
              if (contentItem['type'] === 'input_text' && contentItem['text']) {
                userPrompt += contentItem['text'];
              }
            }
          }
        }
        
        // Nous avons trouvé un message utilisateur, on s'arrête là
        // (uniquement le dernier message utilisateur nous intéresse)
        break;
      }
    }
    
    return userPrompt;
  }

  /**
   * Vérifie si un modèle spécifique est supporté par Ollama
   */
  async isModelSupported(model: string): Promise<boolean> {
    try {
      const models = await this.listAvailableModels();
      return models.includes(model);
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? error.message 
        : String(error);
      console.error("Erreur lors de la vérification du modèle Ollama:", errorMessage);
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
      
      if (response.data && response.data.models) {
        const modelNames = response.data.models.map((m: any) => m.name);
        if (isLoggingEnabled()) {
          log(`Modèles Ollama disponibles: ${modelNames.join(', ')}`);
        }
        return modelNames;
      }
      return [];
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? error.message 
        : String(error);
      console.error("Erreur lors de la récupération des modèles Ollama:", errorMessage);
      return [];
    }
  }
}
