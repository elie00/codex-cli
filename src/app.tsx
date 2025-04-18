import type { ApprovalPolicy } from "./approvals";
import type { AppConfig } from "./utils/config";
import type { ResponseItem } from "openai/resources/responses/responses";

import TerminalChat from "./components/chat/terminal-chat";
import TerminalChatPastRollout from "./components/chat/terminal-chat-past-rollout";
import SplashScreen from "./components/splash-screen-enhanced";
import SplashScreenFrench from "./components/splash-screen-french";
import SplashScreenMatrix from "./components/splash-screen-matrix";import ModelSelectionScreen from "./components/model-selection-screen";
import { setActiveInterface, appendNextActiveInterface } from "./utils/screen-manager";
import { checkInGit } from "./utils/check-in-git";
import { CLI_VERSION, type TerminalChatSession } from "./utils/session.js";
import { onExit } from "./utils/terminal";
import { ConfirmInput } from "@inkjs/ui";
import { Box, Text, useApp, useStdin } from "ink";
import React, { useMemo, useState } from "react";

export type AppRollout = {
  session: TerminalChatSession;
  items: Array<ResponseItem>;
};

type Props = {
  prompt?: string;
  config: AppConfig;
  imagePaths?: Array<string>;
  rollout?: AppRollout;
  approvalPolicy: ApprovalPolicy;
  fullStdout: boolean;
};

export default function App({
  prompt,
  config,
  rollout,
  imagePaths,
  approvalPolicy,
  fullStdout,
}: Props): JSX.Element {
  const app = useApp();
  const [accepted, setAccepted] = useState(() => false);
  // Toujours montrer l'écran d'accueil au démarrage, même avec un prompt
  const [showSplash, setShowSplash] = useState(() => true);
  // Écran de sélection de modèle
  const [showModelSelection, setShowModelSelection] = useState(() => false);
  // Modèle sélectionné par l'utilisateur (va remplacer config.model)
  const [selectedModel, setSelectedModel] = useState(config.model);
  const [cwd, inGitRepo] = useMemo(
    () => [process.cwd(), checkInGit(process.cwd())],
    [],
  );
  const { internal_eventEmitter } = useStdin();
  internal_eventEmitter.setMaxListeners(20);

  // Gestionnaire pour masquer l'écran d'accueil et afficher la sélection de modèle
  const hideSplash = () => {
    // Préparer l'ajout de l'écran de sélection de modèle en-dessous de l'écran d'accueil
    appendNextActiveInterface();
    setActiveInterface("model-selection");
    setShowSplash(false);
    setShowModelSelection(true);
  };
  
  // Gestionnaire pour le choix d'un modèle
  const handleModelSelected = (model: string) => {
    // Préparer l'ajout de l'interface de chat en-dessous de l'écran de sélection
    appendNextActiveInterface();
    setActiveInterface("terminal-chat");
    setSelectedModel(model);
    setShowModelSelection(false);
    
    // Mettre à jour la configuration avec le modèle sélectionné
    config.model = model;
  };

  // Si nous avons un rollout à afficher, ignorer l'écran d'accueil
  if (rollout) {
    setActiveInterface("rollout");
    return (
      <TerminalChatPastRollout
        session={rollout.session}
        items={rollout.items}
      />
    );
  }

  // Afficher l'écran d'accueil si nécessaire
  if (showSplash) {
    setActiveInterface("splash-screen");
    // Utiliser l'écran d'accueil français amélioré
    return (
      <SplashScreenMatrix 
        onComplete={hideSplash}
        providerType={config.providerType} 
        model={config.model}
      />
    );
  }

  // Afficher l'écran de sélection de modèle après l'écran d'accueil
  if (showModelSelection) {
    setActiveInterface("model-selection");
    return (
      <ModelSelectionScreen 
        onComplete={handleModelSelected}
        currentModel={config.model}
      />
    );
  }

  // Avertissement si pas dans un repo git
  if (!inGitRepo && !accepted) {
    setActiveInterface("git-warning");
    return (
      <Box flexDirection="column">
        <Box borderStyle="round" paddingX={1} width={64}>
          <Text>
            ● <Text color={config.providerType === 'ollama' ? "magentaBright" : "green"}>
              {config.providerType === 'ollama' ? 'Ollama' : 'OpenAI'}
            </Text>{" "}
            <Text bold>Codex-CLI</Text>{" "}
            <Text dimColor>
              (assistant de code) <Text color="blueBright">v{CLI_VERSION}</Text>
            </Text>
          </Text>
        </Box>
        <Box
          borderStyle="round"
          borderColor="redBright"
          flexDirection="column"
          gap={1}
        >
          <Text>
            <Text color="yellow">Attention !</Text> Il peut être dangereux d'exécuter
            un agent de codage en dehors d'un dépôt git, car vous ne pourrez pas
            annuler facilement les modifications. Voulez-vous continuer ?
          </Text>
          <Text>{cwd}</Text>
          <ConfirmInput
            defaultChoice="cancel"
            onCancel={() => {
              app.exit();
              onExit();
              // eslint-disable-next-line
              console.error(
                "Quitting! Run again to accept or from inside a git repo",
              );
            }}
            onConfirm={() => {
              setActiveInterface("terminal-chat");
              setAccepted(true);
            }}
          />
        </Box>
      </Box>
    );
  }

  // Interface principale de chat
  setActiveInterface("terminal-chat");
  return (
    <TerminalChat
      config={config}
      prompt={prompt}
      imagePaths={imagePaths}
      approvalPolicy={approvalPolicy}
      fullStdout={fullStdout}
    />
  );
}
