import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";

// Caractères utilisés pour l'effet "pluie de code" Matrix
const MATRIX_CHARS = "田ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍｦｲｸｺｿﾁﾄﾉﾌﾔﾖﾙﾚﾛﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Propriétés du composant MatrixRain
interface MatrixRainProps {
  width?: number;        // Largeur de l'animation
  height?: number;       // Hauteur de l'animation
  duration?: number;     // Durée de l'animation en millisecondes
  onComplete?: () => void; // Callback à appeler quand l'animation est terminée
}

/**
 * Composant pour afficher une animation de "pluie de code" Matrix
 */
const MatrixRain: React.FC<MatrixRainProps> = ({
  width = 80,            // Largeur par défaut
  height = 20,           // Hauteur par défaut
  duration = 5000,       // Durée par défaut: 5 secondes
  onComplete = () => {}  // Callback vide par défaut
}) => {
  // État pour stocker la matrice de caractères à afficher
  const [matrix, setMatrix] = useState<string[][]>([]);
  
  // État pour suivre si l'animation est terminée
  const [isComplete, setIsComplete] = useState(false);
  
  // Positions et vitesses des "cascades" de code
  const [raindrops, setRaindrops] = useState<number[]>([]);
  const [speeds, setSpeeds] = useState<number[]>([]);
  
  // Initialiser la matrice et les gouttes de pluie
  useEffect(() => {
    // Créer une matrice vide remplie d'espaces
    const newMatrix = Array(height).fill(null).map(() => 
      Array(width).fill(' ')
    );
    
    // Initialiser les positions des gouttes avec des valeurs aléatoires négatives
    // (pour qu'elles apparaissent progressivement)
    const initialRaindrops = Array(width).fill(0).map(() => 
      -Math.floor(Math.random() * height * 2)
    );
    
    // Initialiser les vitesses avec des valeurs entre 1 et 3
    const initialSpeeds = Array(width).fill(0).map(() => 
      1 + Math.floor(Math.random() * 3)
    );
    
    setMatrix(newMatrix);
    setRaindrops(initialRaindrops);
    setSpeeds(initialSpeeds);
    
    // Mettre fin à l'animation après la durée spécifiée
    const timer = setTimeout(() => {
      setIsComplete(true);
      onComplete();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [width, height, duration, onComplete]);
  
  // Mettre à jour l'animation à chaque frame
  useEffect(() => {
    if (isComplete) return;
    
    const updateInterval = setInterval(() => {
      // Mettre à jour les positions des gouttes
      const newRaindrops = [...raindrops];
      const newMatrix = Array(height).fill(null).map(() => Array(width).fill(' '));
      
      // Pour chaque colonne
      for (let col = 0; col < width; col++) {
        // Avancer la goutte selon sa vitesse
        newRaindrops[col] += speeds[col];
        
        // Réinitialiser la goutte si elle sort de l'écran
        if (newRaindrops[col] > height * 2) {
          newRaindrops[col] = -Math.floor(Math.random() * 10);
        }
        
        // Dessiner la "traînée" de la goutte
        const trailLength = 5 + Math.floor(Math.random() * 15);
        for (let i = 0; i < trailLength; i++) {
          const row = Math.floor(newRaindrops[col]) - i;
          
          // Vérifier si cette position est dans les limites de la matrice
          if (row >= 0 && row < height) {
            // Obtenir un caractère aléatoire pour cette position
            const charIndex = Math.floor(Math.random() * MATRIX_CHARS.length);
            newMatrix[row][col] = MATRIX_CHARS[charIndex];
          }
        }
      }
      
      setRaindrops(newRaindrops);
      setMatrix(newMatrix);
    }, 100); // Mettre à jour 10 fois par seconde
    
    return () => clearInterval(updateInterval);
  }, [matrix, raindrops, speeds, isComplete, height, width]);
  
  // Si l'animation est terminée, ne rien afficher
  if (isComplete) {
    return null;
  }
  
  return (
    <Box flexDirection="column">
      {matrix.map((row, rowIndex) => (
        <Box key={rowIndex}>
          {row.map((char, colIndex) => {
            // Calculer l'intensité du vert en fonction de la position dans la traînée
            const position = Math.floor(raindrops[colIndex]) - rowIndex;
            
            // Le caractère en tête de traînée est plus brillant
            const isHead = position === 0;
            
            // Déterminer la nuance de vert en fonction de la position
            let color = "green";
            if (isHead) {
              color = "greenBright";
            }
            
            return (
              <Text key={colIndex} color={color}>
                {char}
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

export default MatrixRain;
