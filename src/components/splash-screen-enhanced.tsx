import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { CLI_VERSION } from "../utils/session";

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

interface SplashScreenProps {
  onComplete: () => void;
  providerType?: string;
  model?: string;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onComplete,
  providerType = 'ollama',
  model = 'gemma3:4b'
}) => {
  const [visible, setVisible] = useState(true);
  const [loaded, setLoaded] = useState(0);
  const [waitForEnter, setWaitForEnter] = useState(false);
  
  // Choisir la couleur en fonction du fournisseur
  const getProviderColor = (): string => {
    switch(providerType) {
      case 'ollama': return 'magenta';
      case 'openai': return 'green';
      case 'huggingface': return 'blue';
      default: return 'green';
    }
  };
  
  const color = getProviderColor();

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

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" padding={1}>
      {/* En-tête de bienvenue */}
      <Box marginBottom={1} borderStyle="round" borderColor={color} paddingX={2} width={80}>
        <Text color={color}>* Welcome to the <Text bold color={color}>codex-cli</Text> research preview!</Text>
      </Box>

      {/* Logo ASCII art */}
      <Box flexDirection="column" alignItems="center" justifyContent="center" marginY={1}>
        {codexAsciiArt.map((line, index) => (
          <Text key={index} color={color}>{line}</Text>
        ))}
        
        {/* "by eybo" juste en dessous du logo, aligné à droite */}
        <Box width={56} alignItems="flex-end" marginTop={0}>
          <Text color={color}>by eybo</Text>
        </Box>
      </Box>

      {/* Information sur le fournisseur et le modèle */}
      <Box marginTop={1} borderStyle="round" borderColor={color} paddingX={2} width={50}>
        <Text>
          <Text color={color}>●</Text> Provider: <Text bold color={color}>{providerType}</Text> | Model: <Text bold color={color}>{model}</Text>
        </Text>
      </Box>

      {/* Barre de progression */}
      <Box marginTop={2} width={50}>
        <Text color={color}>
          {loaded < 100 
            ? `Initialisation... ${loaded}%` 
            : "Prêt !"}
        </Text>
      </Box>

      {/* Footer avec message et version */}
      <Box marginTop={2}>
        <Text color="cyan">{waitForEnter ? "🚀 Login successful. Press " : ""}<Text bold color={color}>{waitForEnter ? "Enter" : ""}</Text>{waitForEnter ? " to continue" : ""}</Text>
      </Box>
      
      {/* Version */}
      <Box marginTop={1}>
        <Text color="gray">Version {CLI_VERSION}</Text>
      </Box>
    </Box>
  );
};

export default SplashScreen;
