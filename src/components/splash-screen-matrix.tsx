import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { CLI_VERSION } from "../utils/session";
import { t } from "../locales/en"; // Changed import to English localization
import { isOllamaRunning, listLocalModels } from "../utils/ollama-model-manager";
import { getModelParams } from "../utils/ollama-config";
import MatrixRain from "./matrix-rain-animation";

// Codex-CLI ASCII art logo with CLI centered
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

/**
 * Welcome screen with Matrix animation
 */
const SplashScreenMatrix: React.FC<SplashScreenProps> = ({ 
  onComplete,
  providerType = 'ollama',
  model = 'gemma3:4b'
}) => {
  // States to control different animation phases
  const [showRain, setShowRain] = useState(true);
  const [showWakeUp, setShowWakeUp] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [waitForEnter, setWaitForEnter] = useState(false);
  
  // States for Ollama information
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'running' | 'not_running'>('checking');
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [modelCount, setModelCount] = useState<number | null>(null);
  
  // Messages for the "Wake Up" animation
  const [wakeUpMessages, setWakeUpMessages] = useState<string[]>([
    "Wake up...",
    "The Matrix has you...",
    "Follow the white rabbit...",
    "Codex-CLI is waiting for you."
  ]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageComplete, setMessageComplete] = useState(false);
  
  // Matrix green color for all elements
  const color = "green";
  
  // Check Ollama status
  useEffect(() => {
    const checkOllama = async () => {
      if (providerType === 'ollama') {
        const running = await isOllamaRunning();
        setOllamaStatus(running ? 'running' : 'not_running');
        
        if (running) {
          // Get available models
          try {
            const models = await listLocalModels();
            setModelCount(models.length);
            
            // Get current model information
            const params = getModelParams(model);
            setModelInfo(params);
          } catch (error) {
            // Ignore errors
          }
        }
      }
    };
    
    checkOllama();
  }, [providerType, model]);
  
  // Animation for "Wake Up" messages
  useEffect(() => {
    if (!showWakeUp || currentMessageIndex >= wakeUpMessages.length) {
      return;
    }
    
    const message = wakeUpMessages[currentMessageIndex];
    let index = 0;
    
    const interval = setInterval(() => {
      if (index <= message.length) {
        setCurrentMessage(message.substring(0, index));
        index++;
      } else {
        clearInterval(interval);
        setMessageComplete(true);
        
        // Pause before next message
        setTimeout(() => {
          if (currentMessageIndex < wakeUpMessages.length - 1) {
            setCurrentMessageIndex(prev => prev + 1);
            setMessageComplete(false);
          } else {
            // After all messages, show the logo
            setShowLogo(true);
          }
        }, 1000);
      }
    }, 80);
    
    return () => clearInterval(interval);
  }, [showWakeUp, currentMessageIndex, wakeUpMessages]);
  
  // Effect to animate loading
  useEffect(() => {
    if (!showInfo) return;
    
    const loadingInterval = setInterval(() => {
      setLoaded(prev => {
        if (prev >= 100) {
          clearInterval(loadingInterval);
          setWaitForEnter(true);
          return 100;
        }
        return prev + 2; // Increment by 2% each time
      });
    }, 50);
    
    return () => clearInterval(loadingInterval);
  }, [showInfo]);
  
  // Handle the end of Matrix rain animation
  const handleRainComplete = () => {
    setShowRain(false);
    setShowWakeUp(true);
  };
  
  // Handle the end of logo and info animations
  useEffect(() => {
    if (showLogo && !showInfo) {
      // Wait a bit before showing info
      setTimeout(() => {
        setShowInfo(true);
      }, 1000);
    }
  }, [showLogo, showInfo]);
  
  // Allow user to press Enter to continue
  useInput((input, key) => {
    if (key.return && waitForEnter) {
      onComplete();
    }
  });
  
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" padding={1}>
      {/* Initial Matrix rain animation */}
      {showRain && (
        <MatrixRain
          width={80}
          height={20}
          duration={3000}
          onComplete={handleRainComplete}
        />
      )}
      
      {/* "Wake Up" animation after the rain */}
      {showWakeUp && !showLogo && (
        <Box flexDirection="column" marginY={10} paddingX={10}>
          <Text color="greenBright">{currentMessage}{messageComplete ? "" : "█"}</Text>
        </Box>
      )}
      
      {/* Logo and information */}
      {showLogo && (
        <>
          {/* Welcome header */}
          <Box marginBottom={1} borderStyle="round" borderColor={color} paddingX={2} width={80}>
            <Text color={color}>{t('splashScreen.welcome')}</Text>
          </Box>
          
          {/* ASCII art logo */}
          <Box flexDirection="column" alignItems="center" justifyContent="center" marginY={1}>
            {codexAsciiArt.map((line, index) => (
              <Text key={index} color={color}>{line}</Text>
            ))}
            
            {/* "by eybo" just below the logo, right-aligned */}
            <Box width={56} alignItems="flex-end" marginTop={0}>
              <Text color={color}>by eybo</Text>
            </Box>
          </Box>
          
          {/* System information - only visible after the logo */}
          {showInfo && (
            <>
              {/* Provider and model information */}
              <Box marginTop={1} borderStyle="round" borderColor={color} paddingX={2} width={60}>
                <Text>
                  <Text color={color}>●</Text> {t('splashScreen.provider_info', { 
                    provider: providerType === 'ollama' ? 'Ollama' : providerType === 'openai' ? 'OpenAI' : 'HuggingFace', 
                    model 
                  })}
                </Text>
              </Box>
              
              {/* Ollama-specific information */}
              {providerType === 'ollama' && (
                <Box marginTop={1} borderStyle="single" paddingX={2} width={60}>
                  <Box flexDirection="column">
                    <Text>
                      <Text color={ollamaStatus === 'running' ? 'green' : 'green'}>●</Text> Ollama Status: {
                        ollamaStatus === 'checking' ? 'Checking...' :
                        ollamaStatus === 'running' ? 'Running' : 
                        'Not running'
                      }
                    </Text>
                    
                    {ollamaStatus === 'running' && (
                      <>
                        <Text>
                          <Text color="green">i</Text> Local models: {modelCount !== null ? modelCount : '...'}
                        </Text>
                        
                        {modelInfo && (
                          <Text>
                            <Text color="green">i</Text> Parameters: temp={modelInfo.temperature}, 
                            ctx={modelInfo.num_ctx}
                          </Text>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
              )}
              
              {/* Progress bar */}
              <Box marginTop={2} width={50}>
                <Text color={color}>
                  {loaded < 100 
                    ? t('splashScreen.loading', { percent: loaded }) 
                    : t('splashScreen.ready')}
                </Text>
              </Box>
              
              {/* Footer with message and version */}
              <Box marginTop={2}>
                <Text color="green">
                  {waitForEnter ? t('splashScreen.login_success') : ""}
                  <Text bold color="greenBright">{waitForEnter ? t('splashScreen.enter_to_continue') : ""}</Text>
                  {waitForEnter ? t('splashScreen.to_continue') : ""}
                </Text>
              </Box>
              
              {/* Version */}
              <Box marginTop={1}>
                <Text color="green">{t('splashScreen.version', { version: CLI_VERSION })}</Text>
              </Box>
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default SplashScreenMatrix;
