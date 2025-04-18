import { PROVIDER_CONFIGS } from "./config";
import type { AppConfig } from "./config";
import type { LLMProviderType } from "./config";
import axios from "axios";
import { isLoggingEnabled, log } from "./agent/log.js";

const MODEL_LIST_TIMEOUT_MS = 2_000; // 2 secondes
export const RECOMMENDED_MODELS: Array<string> = ["o4-mini", "o3"];
export const RECOMMENDED_OLLAMA_MODELS: Array<string> = ["llama3", "deepseek-coder-v2:16b", "gemma3:12b", "gemma3:4b", "cogito:8b", "phi3"];
export const RECOMMENDED_HF_MODELS: Array<string> = ["mistral-7b-instruct", "gemma-7b-it"];

/**
 * Background model loader / cache.
 *
 * Nous commençons à récupérer la liste des modèles disponibles dès que le CLI
 * entre en mode interactif. La requête est faite exactement une fois pendant la
 * durée de vie du processus et les résultats sont mis en cache.
 */

// Variable pour stocker les modèles par fournisseur
let modelsPromiseMap: Record<string, Promise<Array<string>> | null> = {
  openai: null,
  ollama: null,
  huggingface: null
};

/**
 * Récupérer les modèles depuis le fournisseur spécifié
 */
async function fetchModels(provider: LLMProviderType = 'ollama', providerUrl?: string): Promise<Array<string>> {
  if (isLoggingEnabled()) {
    log(`Récupération des modèles pour le fournisseur: ${provider}, URL: ${providerUrl || 'défaut'}`);
  }
  
  if (provider === 'openai') {
    // OpenAI est désactivé, retourner simplement les modèles recommandés
    return RECOMMENDED_MODELS;
  } else if (provider === 'ollama') {
    return fetchOllamaModels(providerUrl);
  } else if (provider === 'huggingface') {
    return fetchHuggingFaceModels(providerUrl);
  }
  
  return RECOMMENDED_MODELS; // Fallback par défaut
}

/**
 * Récupérer les modèles depuis OpenAI (désactivé)
 */

/**
 * Récupérer les modèles depuis Ollama
 */
async function fetchOllamaModels(baseURL?: string): Promise<Array<string>> {
  try {
    const url = `${baseURL || PROVIDER_CONFIGS.ollama.baseURL || 'http://localhost:11434/api'}/tags`;
    
    if (isLoggingEnabled()) {
      log(`Récupération des modèles Ollama depuis: ${url}`);
    }
    
    const response = await axios.get(url, { timeout: MODEL_LIST_TIMEOUT_MS });
    
    if (response.data && response.data.models) {
      const modelNames = response.data.models.map((m: any) => m.name);
      return modelNames.sort();
    }
    
    return RECOMMENDED_OLLAMA_MODELS;
  } catch (error) {
    if (isLoggingEnabled()) {
      log(`Erreur lors de la récupération des modèles Ollama: ${error}`);
    }
    return RECOMMENDED_OLLAMA_MODELS;
  }
}

/**
 * Récupérer les modèles depuis Hugging Face
 */
async function fetchHuggingFaceModels(baseURL?: string): Promise<Array<string>> {
  try {
    const apiURL = baseURL || PROVIDER_CONFIGS.huggingface.baseURL || 'http://localhost:8080';
    const url = `${apiURL}/models`;
    
    if (isLoggingEnabled()) {
      log(`Récupération des modèles Hugging Face depuis: ${url}`);
    }
    
    const response = await axios.get(url, { timeout: MODEL_LIST_TIMEOUT_MS });
    
    if (response.data && response.data.data) {
      return response.data.data.sort();
    }
    
    return RECOMMENDED_HF_MODELS;
  } catch (error) {
    if (isLoggingEnabled()) {
      log(`Erreur lors de la récupération des modèles Hugging Face: ${error}`);
    }
    return RECOMMENDED_HF_MODELS;
  }
}

export function preloadModels(config?: AppConfig): void {
  // Si aucun fournisseur n'est spécifié, utiliser Ollama par défaut
  const provider = config?.providerType || 'ollama';
  
  if (!modelsPromiseMap[provider]) {
    // Fire‑and‑forget - les appelants qui ont réellement besoin de la liste 
    // devraient utiliser `await getAvailableModels()`
    void getAvailableModels(provider, config?.providerUrl);
  }
}

export async function getAvailableModels(provider: LLMProviderType = 'ollama', providerUrl?: string): Promise<Array<string>> {
  if (!modelsPromiseMap[provider]) {
    modelsPromiseMap[provider] = fetchModels(provider, providerUrl);
  }
  return modelsPromiseMap[provider] || [];
}

/**
 * Vérifier si le modèle fourni est supporté par le fournisseur spécifié
 */
export async function isModelSupportedForResponses(
  model: string | undefined | null,
  provider: LLMProviderType = 'ollama',
  providerUrl?: string
): Promise<boolean> {
  if (typeof model !== "string" || model.trim() === "") {
    return true;
  }
  
  // Si le fournisseur est OpenAI, rediriger vers Ollama
  if (provider === 'openai') {
    console.warn('Le fournisseur OpenAI est désactivé. Vérification de la compatibilité du modèle avec Ollama à la place.');
    provider = 'ollama';
  }
  
  // Liste de modèles recommandés selon le fournisseur
  const recommendedModels = provider === 'ollama'
    ? RECOMMENDED_OLLAMA_MODELS
      : provider === 'huggingface'
      ? RECOMMENDED_HF_MODELS 
      : RECOMMENDED_MODELS; // Fallback par défaut
  
  if (recommendedModels.includes(model)) {
    return true;
  }

  try {
    const models = await Promise.race<Array<string>>([
      getAvailableModels(provider, providerUrl),
      new Promise<Array<string>>((resolve) =>
        setTimeout(() => resolve([]), MODEL_LIST_TIMEOUT_MS),
      ),
    ]);

    // Si le timeout s'est déclenché, on obtient une liste vide → traité comme supporté 
    // pour éviter les faux négatifs
    if (models.length === 0) {
      return true;
    }

    return models.includes(model.trim());
  } catch (error) {
    if (isLoggingEnabled()) {
      log(`Erreur lors de la vérification de la compatibilité du modèle: ${error}`);
    }
    // Erreur réseau ou de bibliothèque → ne pas bloquer le démarrage
    return true;
  }
}