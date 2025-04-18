/**
 * Module de configuration avancée pour Ollama
 * Ce module permet de gérer les paramètres spécifiques aux modèles Ollama
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import { isLoggingEnabled, log } from './agent/log.js';

// Répertoire de configuration
const CONFIG_DIR = join(homedir(), '.codex');
const OLLAMA_CONFIG_PATH = join(CONFIG_DIR, 'ollama_config.yaml');

// Paramètres par défaut pour Ollama
export const DEFAULT_OLLAMA_PARAMS = {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  repeat_penalty: 1.1,
  presence_penalty: 0,
  frequency_penalty: 0,
  mirostat: 0,
  mirostat_tau: 5,
  mirostat_eta: 0.1,
  seed: -1, // -1 signifie aléatoire
  num_ctx: 4096, // Taille du contexte
  num_batch: 512, // Taille du batch
  num_gpu: 1, // Nombre de GPUs à utiliser
  num_thread: 4, // Nombre de threads CPU
  stop_sequences: [], // Séquences pour arrêter la génération
  use_streaming: true, // Utiliser le streaming par défaut
};

// Types pour la configuration Ollama
export interface OllamaModelConfig {
  name: string;
  description?: string;
  params: Partial<typeof DEFAULT_OLLAMA_PARAMS>;
}

export interface OllamaConfig {
  default_model: string;
  models: Record<string, OllamaModelConfig>;
  global_params: Partial<typeof DEFAULT_OLLAMA_PARAMS>;
}

// Configuration par défaut
const DEFAULT_CONFIG: OllamaConfig = {
  default_model: 'gemma3:4b',
  models: {
    'gemma3:4b': {
      name: 'gemma3:4b',
      description: 'Gemma 3 (4B) - Modèle léger et rapide pour les tâches quotidiennes',
      params: {
        temperature: 0.7,
        top_p: 0.9,
        num_ctx: 4096,
      }
    },
    'llama3': {
      name: 'llama3',
      description: 'Llama 3 - Modèle polyvalent pour le développement',
      params: {
        temperature: 0.8,
        top_p: 0.95,
        num_ctx: 8192,
      }
    },
    'codellama': {
      name: 'codellama',
      description: 'CodeLlama - Spécialisé pour le code et la programmation',
      params: {
        temperature: 0.6,
        top_p: 0.95,
        repeat_penalty: 1.2,
        num_ctx: 16384,
      }
    }
  },
  global_params: {
    use_streaming: true,
    num_thread: 4,
  }
};

/**
 * Charge la configuration Ollama
 * Crée une configuration par défaut si elle n'existe pas
 */
export function loadOllamaConfig(): OllamaConfig {
  try {
    // Créer le répertoire de configuration s'il n'existe pas
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    // Vérifier si le fichier de configuration existe
    if (!existsSync(OLLAMA_CONFIG_PATH)) {
      // Créer une configuration par défaut
      saveOllamaConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    
    // Charger la configuration existante
    const configYaml = readFileSync(OLLAMA_CONFIG_PATH, 'utf-8');
    const config = loadYaml(configYaml) as OllamaConfig;
    
    if (isLoggingEnabled()) {
      log(`Configuration Ollama chargée: ${JSON.stringify(config, null, 2)}`);
    }
    
    return config;
  } catch (error) {
    console.error('Erreur lors du chargement de la configuration Ollama:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Sauvegarde la configuration Ollama
 */
export function saveOllamaConfig(config: OllamaConfig): void {
  try {
    const configYaml = dumpYaml(config);
    writeFileSync(OLLAMA_CONFIG_PATH, configYaml, 'utf-8');
    
    if (isLoggingEnabled()) {
      log(`Configuration Ollama sauvegardée: ${OLLAMA_CONFIG_PATH}`);
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la configuration Ollama:', error);
  }
}

/**
 * Obtient les paramètres complets pour un modèle spécifique
 * Fusionne les paramètres spécifiques au modèle avec les paramètres globaux et les valeurs par défaut
 */
export function getModelParams(modelName: string): typeof DEFAULT_OLLAMA_PARAMS {
  const config = loadOllamaConfig();
  
  // Paramètres par défaut de base
  const baseParams = { ...DEFAULT_OLLAMA_PARAMS };
  
  // Ajouter les paramètres globaux s'ils existent
  if (config.global_params) {
    Object.assign(baseParams, config.global_params);
  }
  
  // Ajouter les paramètres spécifiques au modèle s'ils existent
  if (config.models[modelName] && config.models[modelName].params) {
    Object.assign(baseParams, config.models[modelName].params);
  }
  
  return baseParams;
}

/**
 * Met à jour les paramètres d'un modèle spécifique
 */
export function updateModelParams(modelName: string, params: Partial<typeof DEFAULT_OLLAMA_PARAMS>): void {
  const config = loadOllamaConfig();
  
  // Créer une configuration pour le modèle s'il n'existe pas
  if (!config.models[modelName]) {
    config.models[modelName] = {
      name: modelName,
      params: {}
    };
  }
  
  // Mettre à jour les paramètres
  config.models[modelName].params = {
    ...config.models[modelName].params,
    ...params
  };
  
  // Sauvegarder la configuration
  saveOllamaConfig(config);
}

/**
 * Met à jour les paramètres globaux
 */
export function updateGlobalParams(params: Partial<typeof DEFAULT_OLLAMA_PARAMS>): void {
  const config = loadOllamaConfig();
  
  // Mettre à jour les paramètres globaux
  config.global_params = {
    ...config.global_params,
    ...params
  };
  
  // Sauvegarder la configuration
  saveOllamaConfig(config);
}

/**
 * Définit le modèle par défaut
 */
export function setDefaultModel(modelName: string): void {
  const config = loadOllamaConfig();
  
  // Vérifier si le modèle existe
  if (!config.models[modelName]) {
    throw new Error(`Le modèle ${modelName} n'existe pas dans la configuration`);
  }
  
  // Mettre à jour le modèle par défaut
  config.default_model = modelName;
  
  // Sauvegarder la configuration
  saveOllamaConfig(config);
}

/**
 * Supprime un modèle de la configuration
 */
export function removeModel(modelName: string): void {
  const config = loadOllamaConfig();
  
  // Vérifier si le modèle existe
  if (!config.models[modelName]) {
    throw new Error(`Le modèle ${modelName} n'existe pas dans la configuration`);
  }
  
  // Vérifier si c'est le modèle par défaut
  if (config.default_model === modelName) {
    throw new Error(`Impossible de supprimer le modèle par défaut: ${modelName}`);
  }
  
  // Supprimer le modèle
  delete config.models[modelName];
  
  // Sauvegarder la configuration
  saveOllamaConfig(config);
}

/**
 * Obtient la liste des modèles configurés
 */
export function getConfiguredModels(): Array<OllamaModelConfig> {
  const config = loadOllamaConfig();
  return Object.values(config.models);
}

/**
 * Vérifie si un modèle est configuré
 */
export function isModelConfigured(modelName: string): boolean {
  const config = loadOllamaConfig();
  return modelName in config.models;
}

/**
 * Crée une configuration de requête Ollama à partir des paramètres du modèle
 */
export function createOllamaRequestConfig(modelName: string, prompt: string): Record<string, any> {
  const params = getModelParams(modelName);
  
  // Créer la configuration de la requête
  const requestConfig: Record<string, any> = {
    model: modelName,
    prompt: prompt,
    stream: params.use_streaming,
    options: {}
  };
  
  // Ajouter les paramètres de génération
  const paramMap: Record<string, string> = {
    temperature: 'temperature',
    top_p: 'top_p',
    top_k: 'top_k',
    repeat_penalty: 'repeat_penalty',
    presence_penalty: 'presence_penalty',
    frequency_penalty: 'frequency_penalty',
    mirostat: 'mirostat',
    mirostat_tau: 'mirostat_tau',
    mirostat_eta: 'mirostat_eta',
    num_ctx: 'num_ctx',
    num_batch: 'num_batch',
    num_gpu: 'num_gpu',
    num_thread: 'num_thread',
    seed: 'seed',
  };
  
  // Transférer les paramètres dans la configuration
  for (const [paramKey, requestKey] of Object.entries(paramMap)) {
    const value = params[paramKey as keyof typeof params];
    if (value !== undefined) {
      requestConfig.options[requestKey] = value;
    }
  }
  
  // Ajouter les séquences d'arrêt si définies
  if (params.stop_sequences && params.stop_sequences.length > 0) {
    requestConfig.options.stop = params.stop_sequences;
  }
  
  return requestConfig;
}

// Exporter les fonctions et constantes
export default {
  DEFAULT_OLLAMA_PARAMS,
  loadOllamaConfig,
  saveOllamaConfig,
  getModelParams,
  updateModelParams,
  updateGlobalParams,
  setDefaultModel,
  removeModel,
  getConfiguredModels,
  isModelConfigured,
  createOllamaRequestConfig
};
