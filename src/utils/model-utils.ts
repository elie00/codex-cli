import { OPENAI_API_KEY } from "./config";
import type { AppConfig } from "./config";
import type { LLMProviderType } from "./config";
import OpenAI from "openai";
import axios from "axios";
import { isLoggingEnabled, log } from "./agent/log.js";

const MODEL_LIST_TIMEOUT_MS = 2_000; // 2 seconds
export const RECOMMENDED_MODELS: Array<string> = ["o4-mini", "o3"];
export const RECOMMENDED_OLLAMA_MODELS: Array<string> = ["llama3", "llama2", "mistral"];
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
async function fetchModels(provider: LLMProviderType = 'openai', providerUrl?: string): Promise<Array<string>> {
  if (isLoggingEnabled()) {
    log(`Fetching models for provider: ${provider}, URL: ${providerUrl || 'default'}`);
  }
  
  if (provider === 'openai') {
    return fetchOpenAIModels();
  } else if (provider === 'ollama') {
    return fetchOllamaModels(providerUrl);
  } else if (provider === 'huggingface') {
    return fetchHuggingFaceModels(providerUrl);
  }
  
  return RECOMMENDED_MODELS; // Fallback par défaut
}

/**
 * Récupérer les modèles depuis OpenAI
 */
async function fetchOpenAIModels(): Promise<Array<string>> {
  // Si l'utilisateur n'a pas configuré de clé API, on ne peut pas contacter le réseau
  if (!OPENAI_API_KEY) {
    return RECOMMENDED_MODELS;
  }

  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const list = await openai.models.list();

    const models: Array<string> = [];
    for await (const model of list as AsyncIterable<{ id?: string }>) {
      if (model && typeof model.id === "string") {
        models.push(model.id);
      }
    }

    return models.sort();
  } catch (error) {
    if (isLoggingEnabled()) {
      log(`Error fetching OpenAI models: ${error}`);
    }
    return RECOMMENDED_MODELS;
  }
}

/**
 * Récupérer les modèles depuis Ollama
 */
async function fetchOllamaModels(baseURL?: string): Promise<Array<string>> {
  try {
    const url = `${baseURL || 'http://localhost:11434/api'}/tags`;
    
    if (isLoggingEnabled()) {
      log(`Fetching Ollama models from: ${url}`);
    }
    
    const response = await axios.get(url, { timeout: MODEL_LIST_TIMEOUT_MS });
    
    if (response.data && response.data.models) {
      const modelNames = response.data.models.map((m: any) => m.name);
      return modelNames.sort();
    }
    
    return RECOMMENDED_OLLAMA_MODELS;
  } catch (error) {
    if (isLoggingEnabled()) {
      log(`Error fetching Ollama models: ${error}`);
    }
    return RECOMMENDED_OLLAMA_MODELS;
  }
}

/**
 * Récupérer les modèles depuis Hugging Face
 */
async function fetchHuggingFaceModels(baseURL?: string): Promise<Array<string>> {
  try {
    const url = `${baseURL || 'http://localhost:8080'}/models`;
    
    if (isLoggingEnabled()) {
      log(`Fetching Hugging Face models from: ${url}`);
    }
    
    const response = await axios.get(url, { timeout: MODEL_LIST_TIMEOUT_MS });
    
    if (response.data && response.data.data) {
      return response.data.data.sort();
    }
    
    return RECOMMENDED_HF_MODELS;
  } catch (error) {
    if (isLoggingEnabled()) {
      log(`Error fetching Hugging Face models: ${error}`);
    }
    return RECOMMENDED_HF_MODELS;
  }
}

export function preloadModels(config?: AppConfig): void {
  const provider = config?.providerType || 'openai';
  
  if (!modelsPromiseMap[provider]) {
    // Fire‑and‑forget - les appelants qui ont réellement besoin de la liste 
    // devraient utiliser `await getAvailableModels()`
    void getAvailableModels(provider, config?.providerUrl);
  }
}

export async function getAvailableModels(provider: LLMProviderType = 'openai', providerUrl?: string): Promise<Array<string>> {
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
  provider: LLMProviderType = 'openai',
  providerUrl?: string
): Promise<boolean> {
  if (typeof model !== "string" || model.trim() === "") {
    return true;
  }
  
  // Liste de modèles recommandés selon le fournisseur
  const recommendedModels = provider === 'openai' 
    ? RECOMMENDED_MODELS 
    : provider === 'ollama' 
      ? RECOMMENDED_OLLAMA_MODELS 
      : RECOMMENDED_HF_MODELS;
  
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
      log(`Error checking model support: ${error}`);
    }
    // Erreur réseau ou de bibliothèque → ne pas bloquer le démarrage
    return true;
  }
}