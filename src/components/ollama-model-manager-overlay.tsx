import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { listLocalModels, pullModel, deleteModel, POPULAR_MODELS, ModelInfo } from '../utils/ollama-model-manager';
import { t } from '../locales/en';

// Overlay properties definition
interface OllamaModelManagerOverlayProps {
  onExit: () => void;
  onSelect: (modelName: string) => void;
}

// Display modes
type ViewMode = 'local' | 'popular' | 'download' | 'delete';

// Ollama model manager overlay component
const OllamaModelManagerOverlay: React.FC<OllamaModelManagerOverlayProps> = ({
  onExit,
  onSelect,
}) => {
  // Local models list
  const [localModels, setLocalModels] = useState<ModelInfo[]>([]);
  // Selected index
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Current display mode
  const [viewMode, setViewMode] = useState<ViewMode>('local');
  // Loading state
  const [loading, setLoading] = useState(false);
  // Status message
  const [statusMessage, setStatusMessage] = useState('');
  // Model to download
  const [downloadModelName, setDownloadModelName] = useState('');
  // Model selected for deletion
  const [modelToDelete, setModelToDelete] = useState<string | null>(null);

  // Load models on startup
  useEffect(() => {
    loadLocalModels();
  }, []);

  // Function to load local models
  const loadLocalModels = async () => {
    setLoading(true);
    setStatusMessage('Loading models...');
    
    try {
      const models = await listLocalModels();
      setLocalModels(models);
      setStatusMessage('');
    } catch (error) {
      setStatusMessage('Error loading models');
    } finally {
      setLoading(false);
    }
  };

  // Function to download a model
  const handlePullModel = async (modelName: string) => {
    setLoading(true);
    setStatusMessage(`Downloading ${modelName}...`);
    
    try {
      const result = await pullModel(modelName);
      setStatusMessage(result);
      // Reload the model list
      await loadLocalModels();
    } catch (error) {
      setStatusMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
      setViewMode('local');
    }
  };

  // Function to delete a model
  const handleDeleteModel = async (modelName: string) => {
    setLoading(true);
    setStatusMessage(`Deleting ${modelName}...`);
    
    try {
      const result = await deleteModel(modelName);
      setStatusMessage(result);
      // Reload the model list
      await loadLocalModels();
    } catch (error) {
      setStatusMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
      setModelToDelete(null);
      setViewMode('local');
    }
  };

  // Handle keyboard inputs
  useInput((input, key) => {
    if (loading) {
      // Disable inputs during loading
      return;
    }

    if (key.escape) {
      // Exit overlay
      onExit();
    } else if (viewMode === 'download' && downloadModelName !== undefined) {
      // Input mode for download
      if (key.return) {
        // Download the model
        handlePullModel(downloadModelName);
        setDownloadModelName('');
      } else if (key.backspace || key.delete) {
        // Delete last character
        setDownloadModelName(prev => prev.slice(0, -1));
      } else if (input && /^[a-zA-Z0-9:_-]$/.test(input)) {
        // Add typed character
        setDownloadModelName(prev => prev + input);
      }
    } else if (viewMode === 'delete' && modelToDelete) {
      // Delete confirmation
      if (key.return) {
        // Confirm deletion
        handleDeleteModel(modelToDelete);
      } else if (key.escape || input === 'n') {
        // Cancel deletion
        setModelToDelete(null);
        setViewMode('local');
      }
    } else {
      // General navigation
      if (key.upArrow) {
        // Navigate up
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        // Navigate down
        let maxIndex = 0;
        
        if (viewMode === 'local') {
          maxIndex = localModels.length + 3; // +3 for menu options
        } else if (viewMode === 'popular') {
          maxIndex = POPULAR_MODELS.length;
        }
        
        setSelectedIndex(prev => Math.min(maxIndex, prev + 1));
      } else if (key.return) {
        // Select option
        if (viewMode === 'local') {
          if (selectedIndex < localModels.length) {
            // Select a local model
            onSelect(localModels[selectedIndex].name);
            onExit();
          } else if (selectedIndex === localModels.length) {
            // View popular models
            setViewMode('popular');
            setSelectedIndex(0);
          } else if (selectedIndex === localModels.length + 1) {
            // Download a model
            setViewMode('download');
            setDownloadModelName('');
          } else if (selectedIndex === localModels.length + 2) {
            // Delete a model
            setViewMode('local');
            setSelectedIndex(0);
          } else if (selectedIndex === localModels.length + 3) {
            // Refresh list
            loadLocalModels();
          }
        } else if (viewMode === 'popular') {
          if (selectedIndex < POPULAR_MODELS.length) {
            // Download a popular model
            handlePullModel(POPULAR_MODELS[selectedIndex].name);
          }
        }
      } else if (key.tab) {
        // Toggle between different views
        if (viewMode === 'local') {
          setViewMode('popular');
        } else {
          setViewMode('local');
        }
        setSelectedIndex(0);
      } else if (viewMode === 'local' && selectedIndex < localModels.length && (input === 'd' || input === 'D')) {
        // Delete selected model
        setModelToDelete(localModels[selectedIndex].name);
        setViewMode('delete');
      }
    }
  });

  // Spinner component for loading animations
  const Spinner = ({ color = 'greenBright' }: { color?: string }) => {
    const [frame, setFrame] = useState(0);
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    
    useEffect(() => {
      // Animate spinner
      const timer = setInterval(() => {
        setFrame(prev => (prev + 1) % frames.length);
      }, 100);
      
      return () => clearInterval(timer);
    }, []);
    
    return <Text color={color}>{frames[frame]}</Text>;
  };

  // Conditional display based on mode
  let content;
  
  if (viewMode === 'delete' && modelToDelete) {
    // Delete confirmation
    content = (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>
          Are you sure you want to delete the model {modelToDelete}?
        </Text>
        <Text marginTop={1}>
          This action cannot be undone. Press Enter to confirm or Esc to cancel.
        </Text>
      </Box>
    );
  } else if (viewMode === 'download') {
    // Download interface
    content = (
      <Box flexDirection="column" padding={1}>
        <Text bold>Download Ollama Model</Text>
        <Text marginTop={1}>
          Enter the model name to download (e.g.: llama3, phi3:12b, etc.)
        </Text>
        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text>{downloadModelName || ''}</Text>
        </Box>
        <Text marginTop={1} color="gray">
          Press Enter to download or Esc to cancel
        </Text>
      </Box>
    );
  } else if (viewMode === 'popular') {
    // Popular models list
    content = (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Popular Models</Text>
          <Text> (Tab to return to local models)</Text>
        </Box>
        
        {POPULAR_MODELS.map((model, index) => {
          const isSelected = selectedIndex === index;
          
          return (
            <Box key={model.name} marginY={0}>
              <Text>
                <Text color={isSelected ? 'greenBright' : undefined} bold={isSelected}>
                  {isSelected ? '▶ ' : '  '}
                  {model.name}
                </Text>
                <Text dimColor> - {model.description}</Text>
              </Text>
            </Box>
          );
        })}
        
        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">
            Enter: Download | Esc: Exit | Tab: Change view
          </Text>
        </Box>
      </Box>
    );
  } else {
    // Default view - local models
    content = (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Installed Ollama Models</Text>
          <Text> (Tab to view popular models)</Text>
        </Box>
        
        {localModels.length === 0 ? (
          <Text color="yellow">No models installed</Text>
        ) : (
          localModels.map((model, index) => {
            const isSelected = selectedIndex === index;
            
            return (
              <Box key={model.name} marginY={0}>
                <Text>
                  <Text color={isSelected ? 'greenBright' : undefined} bold={isSelected}>
                    {isSelected ? '▶ ' : '  '}
                    {model.name}
                  </Text>
                  <Text dimColor>
                    {' '}
                    ({model.size ? `${Math.round(model.size / 1024 / 1024)} MB` : 'Unknown size'})
                  </Text>
                </Text>
              </Box>
            );
          })
        )}
        
        {/* Menu options */}
        <Box marginTop={1}>
          <Text color={selectedIndex === localModels.length ? 'greenBright' : undefined} bold={selectedIndex === localModels.length}>
            {selectedIndex === localModels.length ? '▶ ' : '  '}
            View popular models
          </Text>
        </Box>
        
        <Box>
          <Text color={selectedIndex === localModels.length + 1 ? 'greenBright' : undefined} bold={selectedIndex === localModels.length + 1}>
            {selectedIndex === localModels.length + 1 ? '▶ ' : '  '}
            Download a model
          </Text>
        </Box>
        
        <Box>
          <Text color={selectedIndex === localModels.length + 3 ? 'greenBright' : undefined} bold={selectedIndex === localModels.length + 3}>
            {selectedIndex === localModels.length + 3 ? '▶ ' : '  '}
            Refresh list
          </Text>
        </Box>
        
        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">
            Enter: Select | D: Delete | Esc: Exit | Tab: Change view
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="greenBright"
      paddingX={2}
      paddingY={1}
      width={80}
      height={20}
    >
      <Box>
        <Text bold color="greenBright">
          Ollama Model Manager
        </Text>
      </Box>
      
      <Box height={1} />
      
      {/* Main content */}
      {content}
      
      {/* Status bar */}
      <Box marginTop={1} height={1}>
        {loading ? (
          <Box>
            <Spinner color="greenBright" />
            <Text color="greenBright"> {statusMessage}</Text>
          </Box>
        ) : (
          statusMessage && <Text color="yellow">{statusMessage}</Text>
        )}
      </Box>
    </Box>
  );
};

export default OllamaModelManagerOverlay;