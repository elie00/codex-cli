import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { DEFAULT_OLLAMA_PARAMS, getModelParams, updateModelParams } from '../utils/ollama-config';
import { t } from '../locales/en';

// Definition of overlay properties
interface OllamaConfigOverlayProps {
  currentModel: string;
  onExit: () => void;
  onSave: (model: string, params: Partial<typeof DEFAULT_OLLAMA_PARAMS>) => void;
}

// Ollama configuration overlay component
const OllamaConfigOverlay: React.FC<OllamaConfigOverlayProps> = ({
  currentModel,
  onExit,
  onSave,
}) => {
  // Current model parameters
  const [params, setParams] = useState<typeof DEFAULT_OLLAMA_PARAMS>(() => 
    getModelParams(currentModel)
  );
  
  // Selected parameter index
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState('');
  
  // List of parameters to display
  const paramsList = [
    { key: 'temperature', label: 'Temperature', min: 0, max: 2, step: 0.05 },
    { key: 'top_p', label: 'Top P', min: 0, max: 1, step: 0.05 },
    { key: 'top_k', label: 'Top K', min: 1, max: 100, step: 1 },
    { key: 'repeat_penalty', label: 'Repeat Penalty', min: 0.5, max: 2, step: 0.05 },
    { key: 'presence_penalty', label: 'Presence Penalty', min: -2, max: 2, step: 0.1 },
    { key: 'frequency_penalty', label: 'Frequency Penalty', min: -2, max: 2, step: 0.1 },
    { key: 'num_ctx', label: 'Context Size', min: 512, max: 32768, step: 512 },
    { key: 'num_batch', label: 'Batch Size', min: 1, max: 2048, step: 1 },
    { key: 'num_thread', label: 'CPU Threads', min: 1, max: 16, step: 1 },
    { key: 'use_streaming', label: 'Streaming', min: 0, max: 1, step: 1, boolean: true },
  ];
  
  // Load model parameters
  useEffect(() => {
    const modelParams = getModelParams(currentModel);
    setParams(modelParams);
  }, [currentModel]);
  
  // Handle keyboard inputs
  useInput((input, key) => {
    if (editMode) {
      // Edit mode
      if (key.return) {
        // Validate value
        const param = paramsList[selectedIndex];
        const paramKey = param.key as keyof typeof params;
        
        if (param.boolean) {
          // For booleans, convert 0/1 to boolean
          const boolValue = editValue === '1' || editValue.toLowerCase() === 'true';
          setParams(prev => ({ ...prev, [paramKey]: boolValue }));
        } else {
          // For numbers, convert and validate
          const numValue = parseFloat(editValue);
          if (!isNaN(numValue)) {
            const min = param.min ?? -Infinity;
            const max = param.max ?? Infinity;
            const clampedValue = Math.max(min, Math.min(max, numValue));
            setParams(prev => ({ ...prev, [paramKey]: clampedValue }));
          }
        }
        
        setEditMode(false);
      } else if (key.escape) {
        // Cancel edit
        setEditMode(false);
      } else if (key.backspace || key.delete) {
        // Delete last character
        setEditValue(prev => prev.slice(0, -1));
      } else if (input) {
        // Add typed character
        // Only allow digits, period, and comma for numbers
        const param = paramsList[selectedIndex];
        if (param.boolean) {
          // For booleans, only accept 0, 1, true, false
          if (['0', '1', 't', 'r', 'u', 'e', 'f', 'a', 'l', 's'].includes(input.toLowerCase())) {
            setEditValue(prev => prev + input);
          }
        } else {
          // For numbers
          if (/^[0-9.,\-]$/.test(input)) {
            setEditValue(prev => prev + input);
          }
        }
      }
    } else {
      // Navigation
      if (key.escape) {
        // Exit without saving
        onExit();
      } else if (key.return) {
        if (selectedIndex === paramsList.length) {
          // Save and exit
          onSave(currentModel, params);
          onExit();
        } else if (selectedIndex === paramsList.length + 1) {
          // Cancel and exit
          onExit();
        } else {
          // Edit selected parameter
          const param = paramsList[selectedIndex];
          const paramKey = param.key as keyof typeof params;
          const currentValue = params[paramKey];
          setEditValue(String(currentValue));
          setEditMode(true);
        }
      } else if (key.upArrow) {
        // Navigate up
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        // Navigate down
        setSelectedIndex(prev => Math.min(paramsList.length + 1, prev + 1));
      }
    }
  });
  
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="greenBright"
      paddingX={2}
      paddingY={1}
      width={70}
    >
      <Box>
        <Text bold color="greenBright">
          Ollama Model Configuration: {currentModel}
        </Text>
      </Box>
      
      <Box height={1} />
      
      {/* Parameter list */}
      {paramsList.map((param, index) => {
        const paramKey = param.key as keyof typeof params;
        const value = params[paramKey];
        const isSelected = selectedIndex === index;
        
        return (
          <Box key={param.key} marginY={0}>
            <Text>
              <Text color={isSelected ? 'greenBright' : undefined} bold={isSelected}>
                {isSelected ? '▶ ' : '  '}
                {param.label}: {' '}
              </Text>
              
              {editMode && isSelected ? (
                <Text backgroundColor="greenBright" color="black">
                  {editValue}
                </Text>
              ) : (
                <Text bold={isSelected}>
                  {param.boolean 
                    ? (value ? 'Enabled' : 'Disabled')
                    : value
                  }
                </Text>
              )}
            </Text>
          </Box>
        );
      })}
      
      <Box height={1} />
      
      {/* Action buttons */}
      <Box marginY={0}>
        <Text color={selectedIndex === paramsList.length ? 'greenBright' : undefined} bold={selectedIndex === paramsList.length}>
          {selectedIndex === paramsList.length ? '▶ ' : '  '}
          Save
        </Text>
      </Box>
      
      <Box marginY={0}>
        <Text color={selectedIndex === paramsList.length + 1 ? 'greenBright' : undefined} bold={selectedIndex === paramsList.length + 1}>
          {selectedIndex === paramsList.length + 1 ? '▶ ' : '  '}
          Cancel
        </Text>
      </Box>
      
      <Box height={1} />
      
      {/* Help */}
      <Box borderStyle="single" paddingX={1} borderColor="gray">
        <Text color="gray">
          {editMode 
            ? 'Enter: Confirm | Esc: Cancel'
            : 'Arrows: Navigate | Enter: Select | Esc: Exit'
          }
        </Text>
      </Box>
    </Box>
  );
};

export default OllamaConfigOverlay;