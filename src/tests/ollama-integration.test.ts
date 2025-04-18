/**
 * Tests d'intégration pour le fournisseur Ollama
 * 
 * Note: Ces tests nécessitent une instance d'Ollama en cours d'exécution
 * et sont donc désactivés par défaut. Pour les exécuter, retirez le ".skip"
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OllamaProvider } from '../utils/agent/providers/ollama-provider';

// Désactiver les tests d'intégration par défaut car ils nécessitent un serveur Ollama
// Pour les activer, changez ".skip" en ".only" ou supprimez le ".skip"
describe.skip('OllamaProvider Integration Tests', () => {
  let provider: OllamaProvider;

  beforeAll(async () => {
    provider = new OllamaProvider();
    try {
      await provider.initialize({});
    } catch (error) {
      console.error('Les tests d\'intégration nécessitent un serveur Ollama en cours d\'exécution.');
      console.error('Erreur:', error.message);
      throw error;
    }
  });

  it('devrait lister les modèles disponibles', async () => {
    const models = await provider.listAvailableModels();
    expect(Array.isArray(models)).toBe(true);
    console.log('Modèles disponibles:', models);
  });

  it('devrait vérifier si un modèle est supporté', async () => {
    // Remarque: Adaptez ce test avec un modèle qui est réellement disponible sur votre instance Ollama
    const isSupported = await provider.isModelSupported('gemma3:4b');
    expect(typeof isSupported).toBe('boolean');
  });

  it('devrait générer une réponse', async () => {
    // Remarque: Adaptez ce test avec un modèle qui est réellement disponible sur votre instance Ollama
    const model = 'gemma3:4b';
    const prompt = 'Dis bonjour en français';

    // Vérifier si le modèle est disponible avant de faire le test
    const isModelAvailable = await provider.isModelSupported(model);
    if (!isModelAvailable) {
      console.warn(`Le modèle ${model} n'est pas disponible, test ignoré.`);
      return;
    }

    const generator = provider.createStreamingResponse(
      model,
      '',
      [
        {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt
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

    // Vérifier qu'au moins un événement a été émis
    expect(events.length).toBeGreaterThan(0);
    
    // Vérifier que le dernier événement est 'response.completed'
    const lastEvent = events[events.length - 1];
    expect(lastEvent.type).toBe('response.completed');
    
    // Afficher la réponse pour inspection manuelle
    console.log('Réponse reçue:', JSON.stringify(events, null, 2));
  }, 30000); // Timeout plus long pour ce test

  it('devrait gérer correctement les échanges en français', async () => {
    // Remarque: Adaptez ce test avec un modèle qui est réellement disponible sur votre instance Ollama
    const model = 'gemma3:4b';
    const prompt = 'Quels sont les principaux monuments de Paris?';
    
    // Vérifier si le modèle est disponible avant de faire le test
    const isModelAvailable = await provider.isModelSupported(model);
    if (!isModelAvailable) {
      console.warn(`Le modèle ${model} n'est pas disponible, test ignoré.`);
      return;
    }

    const generator = provider.createStreamingResponse(
      model,
      'Tu es un assistant de voyage français très utile.',
      [
        {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt
            }
          ]
        }
      ]
    );

    // Collecter tous les événements émis
    const events = [];
    for await (const event of generator) {
      events.push(event);
      
      // Afficher les deltas pour le débogage
      if (event.type === 'response.output_item.delta') {
        console.log('Delta reçu:', event.delta?.content?.[0]?.text);
      }
    }

    // Vérifier qu'au moins un événement a été émis
    expect(events.length).toBeGreaterThan(0);
    
    // Trouver l'événement 'response.output_item.done' qui contient la réponse complète
    const doneEvent = events.find(e => e.type === 'response.output_item.done');
    expect(doneEvent).toBeDefined();
    
    if (doneEvent) {
      const responseText = doneEvent.item?.content?.[0]?.text;
      console.log('Réponse complète:', responseText);
      
      // Vérifier que la réponse contient au moins la Tour Eiffel
      expect(responseText).toContain('Eiffel');
    }
  }, 30000); // Timeout plus long pour ce test
});
