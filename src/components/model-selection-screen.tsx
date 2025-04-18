import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { listLocalModels, type ModelInfo, POPULAR_MODELS, pullModel } from "../utils/ollama-model-manager";
import { getModelParams, loadOllamaConfig, setDefaultModel } from "../utils/ollama-config";
import { t } from "../locales/en"; // Changed import to English localization

interface ModelSelectionScreenProps {
  onComplete: (selectedModel: string) => void;
  currentModel: string;
}

const ModelSelectionScreen: React.FC<ModelSelectionScreenProps> = ({ 
  onComplete,
  currentModel
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showingPopular, setShowingPopular] = useState(false);
  
  // States for download
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  
  // State for search
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filteredModels, setFilteredModels] = useState<ModelInfo[]>([]);
  const [filteredPopularModels, setFilteredPopularModels] = useState(POPULAR_MODELS);
  
  // Load model list on startup
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        const localModels = await listLocalModels();
        setModels(localModels);
        setFilteredModels(localModels); // Initialize filtered models
        
        // Find the index of the current model
        const currentModelIndex = localModels.findIndex(m => m.name === currentModel);
        if (currentModelIndex >= 0) {
          setSelectedIndex(currentModelIndex);
        }
        
        setLoading(false);
      } catch (err) {
        setError(t('errors.ollama_connection_error'));
        setLoading(false);
      }
    };
    
    loadModels();
  }, [currentModel]);
  
  // Effect to filter models when search text changes
  useEffect(() => {
    if (searchText.trim() === "") {
      // If search is empty, show all models
      setFilteredModels(models);
      setFilteredPopularModels(POPULAR_MODELS);
      return;
    }
    
    // Filter local models
    const filtered = models.filter(model => 
      model.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (model.description && model.description.toLowerCase().includes(searchText.toLowerCase()))
    );
    setFilteredModels(filtered);
    
    // Filter popular models
    const filteredPopular = POPULAR_MODELS.filter(model =>
      model.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (model.description && model.description.toLowerCase().includes(searchText.toLowerCase()))
    );
    setFilteredPopularModels(filteredPopular);
    
    // Reset selection index
    setSelectedIndex(0);
  }, [searchText, models]);
  
  // Function to download a model
  const downloadModel = async () => {
    if (!showingPopular) return; // Only download popular models
    
    const modelToDownload = filteredPopularModels[selectedIndex].name;
    
    // Check if the model is already installed
    const isInstalled = models.some(m => m.name === modelToDownload);
    if (isInstalled) {
      // Model is already installed, no need to download
      return;
    }
    
    try {
      setDownloading(true);
      setDownloadProgress(`Starting download of ${modelToDownload}...`);
      setDownloadError(null);
      
      // Download the model
      const result = await pullModel(modelToDownload);
      
      // Refresh the model list to include the new model
      const updatedModels = await listLocalModels();
      setModels(updatedModels);
      setFilteredModels(updatedModels);
      
      setDownloadProgress(`${modelToDownload} downloaded successfully!`);
      
      // After a short delay, hide the success message
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress("");
      }, 3000);
    } catch (err) {
      setDownloadError(`Error downloading ${modelToDownload}: ${err.message}`);
      setDownloading(false);
      
      // After a short delay, hide the error message
      setTimeout(() => {
        setDownloadError(null);
      }, 5000);
    }
  };
  
  // Search mode handling
  const handleSearchInput = (input: string) => {
    if (searchMode) {
      if (input === '\u001b') { // Escape key to exit search mode
        setSearchMode(false);
        setSearchText("");
      } else if (input === '\u0008' || input === '\u007f') { // Backspace or Delete
        setSearchText(prev => prev.slice(0, -1));
      } else if (input === '\r') { // Enter to validate search
        setSearchMode(false);
      } else if (input.length === 1 && input.match(/[a-zA-Z0-9\s\-:_\.]/)) { // Allowed characters
        setSearchText(prev => prev + input);
      }
    }
  };
  
  
  // Keyboard input handling
  useInput((input, key) => {
    // If in search mode, handle search input
    if (searchMode) {
      handleSearchInput(input);
      return;
    }
    
    if (key.upArrow || input === 'k') {
      // Move up in the list
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (key.downArrow || input === 'j') {
      // Move down in the list
      const maxIndex = showingPopular 
        ? filteredPopularModels.length - 1 
        : filteredModels.length - 1;
      setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
    } else if (key.return) {
      // Select model and continue
      if (showingPopular) {
        // If the model is not installed, offer to download it
        const modelName = filteredPopularModels[selectedIndex].name;
        const isInstalled = models.some(m => m.name === modelName);
        
        if (!isInstalled) {
          downloadModel();
          return;
        }
      }
      
      const selectedModel = showingPopular 
        ? filteredPopularModels[selectedIndex].name 
        : filteredModels[selectedIndex].name;
      
      // Set as default model
      try {
        setDefaultModel(selectedModel);
      } catch (e) {
        // If the model is not in the configuration, simply ignore it
      }
      
      onComplete(selectedModel);
    } else if (input === 'p') {
      // Toggle between local and popular models
      setShowingPopular(prev => !prev);
      setSelectedIndex(0);
    } else if (input === 'q' || key.escape) {
      // Exit without changing model
      onComplete(currentModel);
    } else if (input === '/') {
      // Activate search mode
      setSearchMode(true);
      setSearchText("");
    } else if (input === 'd' && showingPopular) {
      // Download the selected model
      downloadModel();
    }
  });
  
  // Generate a list item for each model
  const renderModels = () => {
    const displayedModels = showingPopular ? filteredPopularModels : filteredModels;
    
    if (displayedModels.length === 0) {
      return (
        <Box paddingY={1}>
          <Text color="greenBright">
            {showingPopular 
              ? t('model_selection.no_popular_models') 
              : t('model_selection.no_local_models')}
          </Text>
        </Box>
      );
    }
    
    return displayedModels.map((model, index) => {
      const isSelected = index === selectedIndex;
      const isCurrentModel = !showingPopular && model.name === currentModel;
      
      // For local models, get additional info
      let sizeInfo = '';
      if (!showingPopular && model.size) {
        // Convert size to readable format (GB)
        const sizeGB = (model.size / (1024 * 1024 * 1024)).toFixed(1);
        sizeInfo = `${sizeGB}GB`;
      }
      
      // Check if the popular model is installed
      const isInstalled = showingPopular 
        ? models.some(m => m.name === model.name)
        : true;
      
      return (
        <Box key={index} paddingY={0.5}>
          <Text>
            <Text color={isSelected ? "greenBright" : "green"}>{isSelected ? '>' : ' '} </Text>
            <Text color={isSelected ? "greenBright" : isCurrentModel ? "green" : "green"} bold={isSelected || isCurrentModel}>
              {model.name}
            </Text>
            {!showingPopular && sizeInfo && (
              <Text color="gray"> ({sizeInfo})</Text>
            )}
            {isCurrentModel && (
              <Text color="green"> ✓</Text>
            )}
            {showingPopular && isInstalled && (
              <Text color="green"> [installed]</Text>
            )}
            {showingPopular && !isInstalled && isSelected && (
              <Text color="greenBright"> [press D to download]</Text>
            )}
            {model.description && (
              <Text color="gray"> - {model.description}</Text>
            )}
          </Text>
        </Box>
      );
    });
  };
  
  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header */}
      <Box borderStyle="round" borderColor="green" paddingX={2} width={70} marginBottom={1}>
        <Text color="green" bold>
          {t('model_selection.title')}
        </Text>
      </Box>
      
      {/* Instructions */}
      <Box paddingX={2} marginBottom={1}>
        <Text>
          {t('model_selection.instructions')}
        </Text>
      </Box>
      
      {/* Search bar */}
      {searchMode && (
        <Box paddingX={2} marginBottom={1} borderStyle="round" borderColor="green">
          <Text>
            <Text color="green" bold>/</Text> 
            <Text>{searchText}</Text>
            <Text color="green" bold>_</Text>
          </Text>
        </Box>
      )}
      
      {/* Download messages */}
      {downloading && (
        <Box paddingX={2} marginY={1} borderStyle="round" borderColor="green">
          <Text color="greenBright">
            {downloadProgress}
          </Text>
        </Box>
      )}
      
      {downloadError && (
        <Box paddingX={2} marginY={1} borderStyle="round" borderColor="green">
          <Text color="greenBright">
            {downloadError}
          </Text>
        </Box>
      )}
      
      {/* Local/popular models tabs */}
      <Box marginBottom={1}>
        <Box paddingX={2} paddingY={0.5} borderStyle="round" borderColor={!showingPopular ? "cyan" : "gray"}>
          <Text color={!showingPopular ? "green" : "green"} bold={!showingPopular}>
            {t('model_selection.local_models')} ({models.length})
          </Text>
        </Box>
        <Box width={3}></Box>
        <Box paddingX={2} paddingY={0.5} borderStyle="round" borderColor={showingPopular ? "cyan" : "gray"}>
          <Text color={showingPopular ? "green" : "green"} bold={showingPopular}>
            {t('model_selection.popular_models')} ({POPULAR_MODELS.length})
          </Text>
        </Box>
      </Box>
      
      {/* Main content */}
      <Box borderStyle="single" paddingX={2} paddingY={1} flexDirection="column" width={80}>
        {loading ? (
          <Text color="greenBright">{t('model_selection.loading')}</Text>
        ) : error ? (
          <Text color="greenBright">{error}</Text>
        ) : (
          renderModels()
        )}
      </Box>
      
      {/* Help text */}
      <Box marginTop={1} paddingX={2}>
        <Text color="gray">
          Press <Text color="green" bold>P</Text> to toggle between local/popular models, <Text color="green" bold>↑/↓</Text> to navigate, <Text color="green" bold>Enter</Text> to select
        </Text>
      </Box>
      <Box paddingX={2}>
        <Text color="gray">
          <Text color="green" bold>/</Text> to search, <Text color="green" bold>D</Text> to download a model, <Text color="green" bold>Esc</Text> to cancel
        </Text>
      </Box>
      
      {/* Selected model parameters */}
      {!loading && !error && !showingPopular && models.length > 0 && (
        <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={2} width={70}>
          <Text color="gray">
            {t('model_selection.params', {
              model: models[selectedIndex]?.name || '',
              params: JSON.stringify(getModelParams(models[selectedIndex]?.name || ''))
                .replace(/[{}"]/g, '')
                .replace(/,/g, ', ')
                .substring(0, 100) + '...'
            })}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ModelSelectionScreen;