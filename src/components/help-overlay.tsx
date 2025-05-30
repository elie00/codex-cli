import { Box, Text, useInput } from "ink";
import React from "react";

/**
 * Une superposition qui liste les commandes slash disponibles et leurs descriptions.
 * Cette superposition est purement informative et peut être fermée avec la touche Échap.
 * L'implémentation est volontairement simple pour éviter d'ajouter de nouvelles
 * dépendances ou une gestion d'état complexe.
 * 
 * Version mise à jour avec le style "vert matrix" pour les commandes slash.
 */
export default function HelpOverlay({
  onExit,
}: {
  onExit: () => void;
}): JSX.Element {
  useInput((input, key) => {
    if (key.escape || input === "q") {
      onExit();
    }
  });

  // Utilisation du vert brillant pour les commandes slash (style "matrix")
  const MatrixCommand = ({ command }: { command: string }) => (
    <Text color="green" bold>{command}</Text>
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      width={80}
    >
      <Box paddingX={1}>
        <Text bold>Commandes disponibles</Text>
      </Box>

      <Box flexDirection="column" paddingX={1} paddingTop={1}>
        <Text bold dimColor>
          Commandes slash
        </Text>
        <Text>
          <MatrixCommand command="/help" /> – afficher cette aide
        </Text>
        <Text>
          <MatrixCommand command="/model" /> – changer de modèle LLM pendant la session
        </Text>
        <Text>
          <MatrixCommand command="/models" /> – gérer les modèles Ollama disponibles
        </Text>
        <Text>
          <MatrixCommand command="/approval" /> – modifier le mode d'approbation automatique
        </Text>
        <Text>
          <MatrixCommand command="/history" /> – afficher l'historique des commandes et fichiers
        </Text>
        <Text>
          <MatrixCommand command="/clear" /> – effacer l'écran et le contexte
        </Text>
        <Text>
          <MatrixCommand command="/ollama" /> – configurer les paramètres Ollama
        </Text>

        <Box marginTop={1}>
          <Text bold dimColor>
            Raccourcis clavier
          </Text>
        </Box>
        <Text>
          <Text color="yellow">Entrée</Text> – envoyer le message
        </Text>
        <Text>
          <Text color="yellow">Ctrl+J</Text> – insérer une nouvelle ligne
        </Text>
        {/* Re-enable once we re-enable new input */}
        {/*
        <Text>
          <Text color="yellow">Ctrl+X</Text>/<Text color="yellow">Ctrl+E</Text>
          &nbsp;– ouvrir l'éditeur externe ($EDITOR)
        </Text>
        */}
        <Text>
          <Text color="yellow">Haut/Bas</Text> – parcourir l'historique des commandes
        </Text>
        <Text>
          <Text color="yellow">
            Échap<Text dimColor>(✕2)</Text>
          </Text>{" "}
          – interrompre l'action en cours
        </Text>
        <Text>
          <Text color="yellow">Ctrl+C</Text> – quitter Codex
        </Text>
      </Box>

      <Box paddingX={1}>
        <Text dimColor>échap ou q pour fermer</Text>
      </Box>
    </Box>
  );
}
