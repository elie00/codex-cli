import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { CLI_VERSION } from "../utils/session";
import { t } from "../locales/en";
import { isOllamaRunning, listLocalModels } from "../utils/ollama-model-manager";
import { getModelParams } from "../utils/ollama-config";

// Logo Codex CLI en ASCII art avec CLI centré
const codexAsciiArt = [
  "  ██████╗ ██████╗ ██████╗ ███████╗██╗  ██╗",
  " ██╔════╝██╔═══██╗██╔══██╗██╔════╝╚██╗██╔╝",
  " ██║     ██║   ██║██║  ██║█████╗   ╚███╔╝ ",
  " ██║     ██║   ██║██║  ██║██╔══╝   ██╔██╗ ",
  " ╚██████╗╚██████╔╝██████╔╝███████╗██╔╝ ██╗",
  "  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝",
  "           ██████╗██╗     ██╗              ",
  "          ██╔════╝██║     ██║              ",
  "          ██║     ██║     ██║              ",
  "          ██║     ██║     ██║              ",
  "          ╚██████╗███████╗██║              ",
  "           ╚═════╝╚══════╝╚═╝              "
];

// Logo Ollama simplifié en ASCII
const ollamaAsciiArt = [
  "  ████████╗   ██╗       ██╗       █████╗    ███╗   ███╗      █████╗   ",
  " ██╔═══██║   ██║       ██║      ██╔══██╗   ████╗ ████║     ██╔══██╗  ",
  " ██║   ██║   ██║       ██║      ███████║   ██╔████╔██║     ███████║  ",
  " ██║   ██║   ██║       ██║      ██╔══██║   ██║╚██╔╝██║     ██╔══██║  ",
  "  ████████║   ██████╗   ██████╗  ██║  ██║   ██║ ╚═╝ ██║     ██║  ██║  ",
  "  ╚══════╝    ╚═════╝   ╚═════╝  ╚═╝  ╚═╝   ╚═╝     ╚═╝     ╚═╝  ╚═╝  "
];

interface SplashScreenProps {
  onComplete: () => void;
  providerType?: string;
  model?: string;
}

const SplashScreenFrench: React.FC<SplashScreenProps> = ({ 
  onComplete,
  providerType = 'ollama',
  model = 'gemma3:4b'
}) => {
  const [visible, setVisible] = useState(true);
  const [loaded, setLoaded] = useState(0);
  const [waitForEnter, setWaitForEnter] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'running' | 'not_running'>('checking');
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [modelCount, setModelCount] = useState<number | null>(null);
  
  // Choisir la couleur en fonction du fournisseur
  const getProviderColor = (): string => { return "green"; return "green";
    switch(providerType) {
      case 'ollama': return 'magenta';
      case 'openai': return 'green';
      case 'huggingface': return 'blue';
      default: return 'green';
    }
  };
  
  const color = "green";

  // Vérifier le statut d'Ollama
  useEffect(() => {
    const checkOllama = async () => {
      if (providerType === 'ollama') {
        const running = await isOllamaRunning();
        setOllamaStatus(running ? 'running' : 'not_running');
        
        if (running) {
          // Obtenir les modèles disponibles
          try {
            const models = await listLocalModels();
            setModelCount(models.length);
            
            // Obtenir les informations sur le modèle actuel
            const params = getModelParams(model);
            setModelInfo(params);
          } catch (error) {
            // Ignorer les erreurs
          }
        }
      }
    };
    
    checkOllama();
  }, [providerType, model]);

  // Effet pour animer le chargement
  useEffect(() => {
    const loadingInterval = setInterval(() => {
      setLoaded(prev => {
        if (prev >= 100) {
          clearInterval(loadingInterval);
          setWaitForEnter(true);
          return 100;
        }
        return prev + 2; // Incrémenter de 2% à chaque fois (animation plus lente)
      });
    }, 50);

    return () => clearInterval(loadingInterval);
  }, []);

  // Permettre à l'utilisateur d'appuyer sur Entrée pour continuer
  useInput((input, key) => {
    if (key.return && waitForEnter) {
      setVisible(false);
      onComplete();
    }
  });

  if (!visible) {
    return null;
  }

  // Toujours utiliser le logo Codex CLI
  const logo = codexAsciiArt;

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" padding={1}>
      {/* En-tête de bienvenue */}
      <Box marginBottom={1} borderStyle="round" borderColor={color} paddingX={2} width={80}>
        <Text color={color}>{t('splashScreen.welcome', { name: 'codex-cli' })}</Text>
      </Box>

      {/* Logo ASCII art */}
      <Box flexDirection="column" alignItems="center" justifyContent="center" marginY={1}>
        {logo.map((line, index) => (
          <Text key={index} color={color}>{line}</Text>
        ))}
        
        {/* "by eybo" juste en dessous du logo, aligné à droite */}
        <Box width={56} alignItems="flex-end" marginTop={0}>
          <Text color={color}>by eybo</Text>
        </Box>
      </Box>

      {/* Information sur le fournisseur et le modèle */}
      <Box marginTop={1} borderStyle="round" borderColor={color} paddingX={2} width={60}>
        <Text>
          <Text color={color}>●</Text> {t('splashScreen.provider_info', { 
            provider: providerType === 'ollama' ? 'Ollama' : providerType === 'openai' ? 'OpenAI' : 'HuggingFace', 
            model 
          })}
        </Text>
      </Box>

      {/* Informations spécifiques à Ollama */}
      {providerType === 'ollama' && (
        <Box marginTop={1} borderStyle="single" paddingX={2} width={60}>
          <Box flexDirection="column">
            <Text>
              <Text color="green">●</Text> Statut d'Ollama: {
                ollamaStatus === 'checking' ? 'Vérification...' :
                ollamaStatus === 'running' ? 'En cours d\'exécution' : 
                'Non démarré'
              }
            </Text>
            
            {ollamaStatus === 'running' && (
              <>
                <Text>
                  <Text color="green">i</Text> Modèles locaux: {modelCount !== null ? modelCount : '...'}
                </Text>
                
                {modelInfo && (
                  <Text>
                    <Text color="green">i</Text> Paramètres: temp={modelInfo.temperature}, 
                    ctx={modelInfo.num_ctx}
                  </Text>
                )}
              </>
            )}
          </Box>
        </Box>
      )}

      {/* Barre de progression */}
      <Box marginTop={2} width={50}>
        <Text color={color}>
          {loaded < 100 
            ? t('splashScreen.loading', { percent: loaded }) 
            : t('splashScreen.ready')}
        </Text>
      </Box>

      {/* Footer avec message et version */}
      <Box marginTop={2}>
        <Text color="green">
          {waitForEnter ? t('splashScreen.login_success') : ""}
          <Text bold color={color}>{waitForEnter ? t('splashScreen.enter_to_continue') : ""}</Text>
          {waitForEnter ? t('splashScreen.to_continue') : ""}
        </Text>
      </Box>
      
      {/* Version */}
      <Box marginTop={1}>
        <Text color="gray">{t('splashScreen.version', { version: CLI_VERSION })}</Text>
      </Box>
    </Box>
  );
};

export default SplashScreenFrench;
