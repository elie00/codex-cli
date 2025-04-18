import { Box, Text, useInput } from "ink";
import React from "react";

/**
 * Une superposition qui liste les commandes slash disponibles et leurs descriptions.
 * Cette superposition est purement informative et peut être fermée avec la touche Échap.
 * L'implémentation est volontairement simple pour éviter d'ajouter de nouvelles
 * dépendances ou une gestion d'état complexe.
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
          <Text color="cyan">/help</Text> – afficher cette aide
        </Text>
        <Text>
          <Text color="cyan">/model</Text> – changer de modèle LLM pendant la session
        </Text>
        <Text>
          <Text color="cyan">/approval</Text> – modifier le mode d'approbation automatique
        </Text>
        <Text>
          <Text color="cyan">/history</Text> – afficher l'historique des commandes et fichiers
        </Text>
        <Text>
          <Text color="cyan">/clear</Text> – effacer l'écran et le contexte
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
