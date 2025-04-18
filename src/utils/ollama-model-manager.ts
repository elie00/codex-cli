/**
 * Gestionnaire de modèles Ollama
 * Permet de lister, télécharger et supprimer des modèles Ollama localement
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { isLoggingEnabled, log } from './agent/log.js';
import { t } from '../locales/fr';

// Convertir exec en version Promise
const execAsync = promisify(exec);

// Modèles recommandés
export const POPULAR_MODELS = [
  { name: 'llama3', description: 'Llama 3 (8B) - Modèle polyvalent pour le développement' },
  { name: 'llama3:70b', description: 'Llama 3 (70B) - Version complète, plus puissante et précise' },
  { name: 'gemma3:4b', description: 'Gemma 3 (4B) - Modèle léger et rapide pour les tâches quotidiennes' },
  { name: 'gemma3:12b', description: 'Gemma 3 (12B) - Modèle plus précis et polyvalent (modèle moyen)' },
  { name: 'mixtral', description: 'Mixtral 8x7B - Modèle à experts mélangés, très performant' },
  { name: 'phi3:12b', description: 'Phi-3 (12B) - Modèle Microsoft optimisé pour le code' },
  { name: 'codellama', description: 'CodeLlama (7B) - Spécialisé pour le code et la programmation' },
  { name: 'deepseek-coder:v2-16b', description: 'DeepSeek Coder v2 (16B) - Performant pour le code (C++, Python, etc.)' },
  { name: 'neural-chat', description: 'Neural-Chat (7B) - Modèle conversationnel optimisé' },
  { name: 'mistral', description: 'Mistral (7B) - Modèle bien équilibré, bonne performance' },
  { name: 'cogito:8b', description: 'Cogito (8B) - Modèle français par Giskard, optimisé pour la langue française' }
];

// Interface pour les informations de modèle
export interface ModelInfo {
  name: string;
  description?: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

// URL de base pour l'API Ollama
const DEFAULT_API_URL = 'http://localhost:11434/api';

/**
 * Liste tous les modèles disponibles localement sur Ollama
 */
export async function listLocalModels(apiUrl: string = DEFAULT_API_URL): Promise<ModelInfo[]> {
  try {
    const response = await axios.get(`${apiUrl}/tags`, { timeout: 5000 });
    
    if (response.data && response.data.models) {
      // Transformer la réponse en format ModelInfo
      const models: ModelInfo[] = response.data.models.map((model: any) => ({
        name: model.name,
        model: model.model,
        modified_at: model.modified_at,
        size: model.size,
        digest: model.digest,
        details: model.details || {}
      }));
      
      if (isLoggingEnabled()) {
        log(`Modèles Ollama locaux: ${models.map(m => m.name).join(', ')}`);
      }
      
      return models;
    }
    
    return [];
  } catch (error) {
    console.error(`Erreur lors de la liste des modèles Ollama:`, error);
    throw new Error(t('errors.ollama_connection_error'));
  }
}

/**
 * Télécharge un modèle Ollama
 */
export async function pullModel(modelName: string): Promise<string> {
  try {
    // Vérifier d'abord si le modèle existe déjà
    const localModels = await listLocalModels();
    const modelExists = localModels.some(model => model.name === modelName);
    
    if (modelExists) {
      // Le modèle existe déjà, mettre à jour
      if (isLoggingEnabled()) {
        log(`Le modèle ${modelName} existe déjà, mise à jour...`);
      }
    }
    
    // Exécuter la commande ollama pull
    const { stdout, stderr } = await execAsync(`ollama pull ${modelName}`);
    
    if (stderr && !stderr.includes('pulling')) {
      throw new Error(stderr);
    }
    
    if (isLoggingEnabled()) {
      log(`Modèle ${modelName} téléchargé avec succès: ${stdout}`);
    }
    
    return `Modèle ${modelName} ${modelExists ? 'mis à jour' : 'téléchargé'} avec succès.`;
  } catch (error) {
    console.error(`Erreur lors du téléchargement du modèle ${modelName}:`, error);
    throw new Error(`Erreur lors du téléchargement du modèle ${modelName}: ${error}`);
  }
}

/**
 * Supprime un modèle Ollama
 */
export async function deleteModel(modelName: string): Promise<string> {
  try {
    // Vérifier d'abord si le modèle existe
    const localModels = await listLocalModels();
    const modelExists = localModels.some(model => model.name === modelName);
    
    if (!modelExists) {
      throw new Error(`Le modèle ${modelName} n'existe pas localement.`);
    }
    
    // Exécuter la commande ollama rm
    const { stdout, stderr } = await execAsync(`ollama rm ${modelName}`);
    
    if (stderr) {
      throw new Error(stderr);
    }
    
    if (isLoggingEnabled()) {
      log(`Modèle ${modelName} supprimé avec succès: ${stdout}`);
    }
    
    return `Modèle ${modelName} supprimé avec succès.`;
  } catch (error) {
    console.error(`Erreur lors de la suppression du modèle ${modelName}:`, error);
    throw new Error(`Erreur lors de la suppression du modèle ${modelName}: ${error}`);
  }
}

/**
 * Obtient des informations détaillées sur un modèle
 */
export async function getModelInfo(modelName: string, apiUrl: string = DEFAULT_API_URL): Promise<ModelInfo | null> {
  try {
    // Liste tous les modèles et trouve celui qui correspond
    const models = await listLocalModels(apiUrl);
    const model = models.find(m => m.name === modelName);
    
    if (!model) {
      return null;
    }
    
    // Enrichir avec des informations supplémentaires si disponibles
    let enrichedModel = { ...model };
    
    // Ajouter la description depuis les modèles populaires si disponible
    const popularModel = POPULAR_MODELS.find(m => m.name === modelName);
    if (popularModel) {
      enrichedModel.description = popularModel.description;
    }
    
    // Essayer d'obtenir plus d'informations via l'API Ollama (si disponible)
    try {
      // Cette endpoint n'existe pas dans l'API officielle mais pourrait exister dans des versions futures
      const response = await axios.get(`${apiUrl}/show`, { 
        params: { name: modelName },
        timeout: 2000
      });
      
      if (response.data) {
        // Fusionner les informations
        enrichedModel = { ...enrichedModel, ...response.data };
      }
    } catch {
      // Ignorer les erreurs, cette endpoint peut ne pas exister
    }
    
    return enrichedModel;
  } catch (error) {
    console.error(`Erreur lors de l'obtention des informations du modèle ${modelName}:`, error);
    return null;
  }
}

/**
 * Vérifie si Ollama est en cours d'exécution
 */
export async function isOllamaRunning(apiUrl: string = DEFAULT_API_URL): Promise<boolean> {
  try {
    await axios.get(`${apiUrl}/tags`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Démarre le serveur Ollama (si possible)
 * Note: cette fonction peut ne pas fonctionner sur tous les systèmes
 */
export async function startOllama(): Promise<boolean> {
  try {
    // Essayer de démarrer Ollama
    await execAsync('ollama serve', { timeout: 5000 });
    
    // Attendre un peu que le serveur démarre
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Vérifier si Ollama est en cours d'exécution
    return await isOllamaRunning();
  } catch {
    return false;
  }
}

/**
 * Recherche des modèles dans la bibliothèque Ollama
 */
export async function searchModels(query: string): Promise<ModelInfo[]> {
  try {
    // Filtre les modèles populaires en fonction de la requête
    const filteredModels = POPULAR_MODELS.filter(model => 
      model.name.toLowerCase().includes(query.toLowerCase()) || 
      (model.description && model.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    // Convertit en format ModelInfo
    return filteredModels.map(model => ({
      name: model.name,
      description: model.description
    }));
  } catch (error) {
    console.error(`Erreur lors de la recherche de modèles:`, error);
    return [];
  }
}

// Exporter les fonctions
export default {
  POPULAR_MODELS,
  listLocalModels,
  pullModel,
  deleteModel,
  getModelInfo,
  isOllamaRunning,
  startOllama,
  searchModels
};
