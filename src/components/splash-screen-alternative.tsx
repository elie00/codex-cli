import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { CLI_VERSION } from "../utils/session";

// Logo Codex CLI en ASCII art
const codexAsciiArt = [
  "  ██████╗ ██████╗ ██████╗ ███████╗██╗  ██╗",
  " ██╔════╝██╔═══██╗██╔══██╗██╔════╝╚██╗██╔╝",
  " ██║     ██║   ██║██║  ██║█████╗   ╚███╔╝ ",
  " ██║     ██║   ██║██║  ██║██╔══╝   ██╔██╗ ",
  " ╚██████╗╚██████╔╝██████╔╝███████╗██╔╝ ██╗",
  "  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝",
  "  ██████╗██╗     ██╗                      ",
  " ██╔════╝██║     ██║                      ",
  " ██║     ██║     ██║                      ",
  " ██║     ██║     ██║                      ",
  " ╚██████╗███████╗██║                      ",
  "  ╚═════╝╚══════╝╚═╝                      "
];

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);
  const [loaded, setLoaded] = useState(0);

  // Effet pour animer le chargement
  useEffect(() => {
    const loadingInterval = setInterval(() => {
      setLoaded(prev => {
        if (prev >= 100) {
          clearInterval(loadingInterval);
          return 100;
        }
        return prev + 5; // Incrémenter de 5% à chaque fois
      });
    }, 100);

    return () => clearInterval(loadingInterval);
  }, []);

  // Permettre à l'utilisateur d'appuyer sur Entrée pour continuer
  useInput((input, key) => {
    if (key.return && loaded >= 100) {
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
      <Box marginBottom={1} borderStyle="round" borderColor="green" paddingX={2} width={80}>
        <Text color="green">* Welcome to the <Text bold color="green">codex-cli</Text> research preview!</Text>
      </Box>

      {/* Logo ASCII art avec "by eybo" à côté */}
      <Box flexDirection="column" alignItems="center" justifyContent="center" marginY={1}>
        <Box>
          <Box flexDirection="column">
            {codexAsciiArt.map((line, index) => (
              <Text key={index} color="green">{line}</Text>
            ))}
          </Box>
          <Box flexDirection="column" marginLeft={2} justifyContent="center">
            <Text color="green">by eybo</Text>
          </Box>
        </Box>
      </Box>

      {/* Barre de progression */}
      <Box marginTop={2}>
        <Text color="green">
          {loaded < 100 
            ? `Initialisation... ${loaded}%` 
            : "Prêt !"}
        </Text>
      </Box>

      {/* Footer avec message et version */}
      <Box marginTop={2}>
        <Text color="cyan">🚀 Login successful. Press <Text bold color="green">Enter</Text> to continue</Text>
      </Box>
      
      {/* Version */}
      <Box marginTop={1}>
        <Text color="gray">Version {CLI_VERSION}</Text>
      </Box>
    </Box>
  );
};

export default SplashScreen;
