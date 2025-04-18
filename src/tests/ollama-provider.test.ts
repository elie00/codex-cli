/**
 * Tests pour le fournisseur Ollama
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider } from '../utils/agent/providers/ollama-provider';
import axios from 'axios';

// Mock axios pour simuler les appels réseau
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider();
    vi.clearAllMocks();
    // Configuration par défaut des mocks axios
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/tags')) {
        return Promise.resolve({
          data: {
            models: [
              { name: 'llama3:8b' },
              { name: 'gemma3:4b' },
              { name: 'mixtral:8x7b' }
            ]
          }
        });
      }
      return Promise.reject(new Error('URL non gérée dans le mock'));
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialize', () => {
    it('devrait initialiser correctement avec les options par défaut', async () => {
      await provider.initialize({});
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:11434/api/tags', expect.anything());
    });

    it('devrait initialiser avec une URL de base personnalisée', async () => {
      await provider.initialize({ baseURL: 'http://custom-ollama:11434/api' });
      expect(mockedAxios.get).toHaveBeenCalledWith('http://custom-ollama:11434/api/tags', expect.anything());
    });

    it('devrait lever une exception si la connexion échoue', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connexion refusée'));
      await expect(provider.initialize({})).rejects.toThrow('Impossible de se connecter à Ollama');
    });
  });

  describe('listAvailableModels', () => {
    it('devrait retourner la liste des modèles disponibles', async () => {
      const models = await provider.listAvailableModels();
      expect(models).toEqual(['llama3:8b', 'gemma3:4b', 'mixtral:8x7b']);
    });

    it('devrait retourner une liste vide en cas d\'erreur', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Erreur réseau'));
      const models = await provider.listAvailableModels();
      expect(models).toEqual([]);
    });
  });

  describe('isModelSupported', () => {
    it('devrait retourner true pour un modèle supporté', async () => {
      const isSupported = await provider.isModelSupported('gemma3:4b');
      expect(isSupported).toBe(true);
    });

    it('devrait retourner false pour un modèle non supporté', async () => {
      const isSupported = await provider.isModelSupported('modele-inexistant');
      expect(isSupported).toBe(false);
    });
  });

  describe('extractUserPrompt', () => {
    it('devrait extraire correctement le prompt utilisateur du format OpenAI', () => {
      const input = [
        {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Bonjour, comment vas-tu?'
            }
          ]
        }
      ];
      
      // @ts-expect-error méthode privée mais accessible pour le test
      const prompt = provider.extractUserPrompt(input);
      expect(prompt).toBe('Bonjour, comment vas-tu?');
    });

    it('devrait gérer le cas où l\'entrée est vide', () => {
      // @ts-expect-error méthode privée mais accessible pour le test
      const prompt = provider.extractUserPrompt([]);
      expect(prompt).toBe('');
    });
  });

  describe('createStreamingResponse', () => {
    it('devrait gérer correctement la réponse non-streaming', async () => {
      // Mock pour le post de non-streaming
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          message: {
            content: 'Bonjour! Je vais bien, merci de demander.'
          }
        }
      });

      const generator = provider.createStreamingResponse(
        'gemma3:4b',
        'Sois un assistant utile',
        [
          {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Bonjour, comment vas-tu?'
              }
            ]
          }
        ]
      );

      // Collecter tous les événements émis
      const events = [];
      for await (const event of generator) {
        events.push(event);
      }

      // Vérifier que les événements attendus ont été émis
      expect(events.length).toBe(2);
      expect(events[0].type).toBe('response.output_item.done');
      expect(events[1].type).toBe('response.completed');
      
      // Vérifier que le contenu de la réponse est correct
      const messageItem = events[0].item;
      expect(messageItem.role).toBe('assistant');
      expect(messageItem.content[0].text).toBe('Bonjour! Je vais bien, merci de demander.');
    });

    it('devrait gérer correctement les erreurs', async () => {
      // Mock pour simuler une erreur
      mockedAxios.post.mockRejectedValueOnce(new Error('Erreur de connexion'));

      const generator = provider.createStreamingResponse(
        'gemma3:4b',
        '',
        [
          {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Test'
              }
            ]
          }
        ]
      );

      // Collecter l'événement d'erreur
      const events = [];
      try {
        for await (const event of generator) {
          events.push(event);
        }
      } catch (error) {
        // L'erreur est attendue
      }

      // Vérifier que l'événement d'erreur a été émis
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('response.output_item.done');
      expect(events[0].item.role).toBe('system');
      expect(events[0].item.content[0].text).toContain('Erreur lors de la communication avec Ollama');
    });
  });
});
