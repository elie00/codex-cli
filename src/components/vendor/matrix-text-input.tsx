import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import chalk from 'chalk';

// Définition de la couleur verte Matrix
const MATRIX_GREEN = '#00FF00';
const MATRIX_BRIGHT_GREEN = 'greenBright';

interface MatrixTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  focus?: boolean;
  showCursor?: boolean;
  mask?: string;
}

/**
 * Composant TextInput personnalisé qui affiche le texte en vert matrix
 * lorsque le texte commence par un slash (commande)
 */
const MatrixTextInput: React.FC<MatrixTextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  focus = true,
  showCursor = true,
  mask,
}) => {
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Détecter si le texte est une commande (commence par '/')
  const isCommand = value.startsWith('/');

  // Gestion du clignotement du curseur
  useEffect(() => {
    if (!showCursor) {
      return;
    }

    const timer = setInterval(() => {
      setCursorVisible(visible => !visible);
    }, 500);

    return () => {
      clearInterval(timer);
    };
  }, [showCursor]);

  // Mise à jour de la position du curseur lorsque la valeur change
  useEffect(() => {
    setCursorPosition(value.length);
  }, [value]);

  // Gestion des entrées clavier
  useInput(
    (input, key) => {
      if (!focus) {
        return;
      }

      // Gestion des touches de navigation
      if (key.leftArrow) {
        setCursorPosition(prev => Math.max(0, prev - 1));
        return;
      }

      if (key.rightArrow) {
        setCursorPosition(prev => Math.min(value.length, prev + 1));
        return;
      }

      if (key.home) {
        setCursorPosition(0);
        return;
      }

      if (key.end) {
        setCursorPosition(value.length);
        return;
      }

      // Gestion de la suppression
      if (key.backspace || key.delete) {
        // Pour backspace et delete, supprimer le caractère à gauche du curseur
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(prev => Math.max(0, prev - 1));
        return;
      }

      // Validation
      if (key.return) {
        onSubmit(value);
        return;
      }

      // Ignorer les combinaisons de touches avec Alt/Ctrl/Meta
      if (key.meta || key.ctrl || key.alt) {
        return;
      }

      // Insertion de texte
      if (input) {
        const newValue = 
          value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(prev => prev + input.length);
      }
    },
    { isActive: focus }
  );

  // Affichage du texte avec mise en évidence des commandes
  const renderText = () => {
    if (!value && placeholder) {
      return <Text dimColor>{placeholder}</Text>;
    }

    if (mask) {
      return <Text color={isCommand ? MATRIX_BRIGHT_GREEN : undefined}>{mask.repeat(value.length)}</Text>;
    }

    const displayedValue = value;
    
    if (isCommand) {
      // Si c'est une commande, colorer tout le texte en vert
      return <Text color={MATRIX_BRIGHT_GREEN}>{displayedValue}</Text>;
    }
    
    return <Text>{displayedValue}</Text>;
  };

  // Affichage du curseur
  const renderCursor = () => {
    if (!showCursor || !cursorVisible) {
      return null;
    }

    const cursorChar = ' ';
    
    return (
      <Text backgroundColor={isCommand ? MATRIX_BRIGHT_GREEN : 'white'} color="black">
        {cursorChar}
      </Text>
    );
  };

  return (
    <Box>
      {renderText()}
      {renderCursor()}
    </Box>
  );
};

export default MatrixTextInput;
