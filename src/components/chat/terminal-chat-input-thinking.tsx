import { log, isLoggingEnabled } from "../../utils/agent/log.js";
import Spinner from "../vendor/ink-spinner.js";
import { Box, Text, useInput, useStdin } from "ink";
import React, { useState } from "react";
import { useInterval } from "use-interval";

const thinkingTexts = [
  "Réflexion",
  "Analyse",
  "Traitement",
  "Calcul",
  "Génération",
  "Recherche",
  "Préparation",
  "Élaboration",
  "Conception",
  "Formulation",
  "Résolution",
  "Exploration",
  "Structuration",
  "Synthèse",
  "Organisation"
];

export default function TerminalChatInputThinking({
  onInterrupt,
  active,
}: {
  onInterrupt: () => void;
  active: boolean;
}): React.ReactElement {
  const [dots, setDots] = useState("");
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  const [thinkingText, setThinkingText] = useState(
    () => thinkingTexts[Math.floor(Math.random() * thinkingTexts.length)],
  );

  const { stdin, setRawMode } = useStdin();

  React.useEffect(() => {
    if (!active) {
      return;
    }

    setRawMode?.(true);

    const onData = (data: Buffer | string) => {
      if (awaitingConfirm) {
        return;
      }

      const str = Buffer.isBuffer(data) ? data.toString("utf8") : data;
      if (str === "\x1b\x1b") {
        if (isLoggingEnabled()) {
          log(
            "raw stdin: received collapsed ESC ESC – starting confirmation timer",
          );
        }
        setAwaitingConfirm(true);
        setTimeout(() => setAwaitingConfirm(false), 1500);
      }
    };

    stdin?.on("data", onData);
    return () => {
      stdin?.off("data", onData);
    };
  }, [stdin, awaitingConfirm, onInterrupt, active, setRawMode]);

  useInterval(() => {
    setDots((prev) => (prev.length < 3 ? prev + "." : ""));
  }, 500);

  useInterval(
    () => {
      setThinkingText((prev) => {
        let next = prev;
        if (thinkingTexts.length > 1) {
          while (next === prev) {
            next =
              thinkingTexts[Math.floor(Math.random() * thinkingTexts.length)];
          }
        }
        return next;
      });
    },
    active ? 30000 : null,
  );

  useInput(
    (_input, key) => {
      if (!key.escape) {
        return;
      }

      if (awaitingConfirm) {
        if (isLoggingEnabled()) {
          log("useInput: second ESC detected – triggering onInterrupt()");
        }
        onInterrupt();
        setAwaitingConfirm(false);
      } else {
        if (isLoggingEnabled()) {
          log("useInput: first ESC detected – waiting for confirmation");
        }
        setAwaitingConfirm(true);
        setTimeout(() => setAwaitingConfirm(false), 1500);
      }
    },
    { isActive: active },
  );

  return (
    <Box flexDirection="column" gap={1}>
      <Box gap={2}>
        <Spinner type="dots" />
        <Text color="magenta">
          {thinkingText}
          {dots}
        </Text>
      </Box>
      {awaitingConfirm && (
        <Text dimColor>
          Appuyez à nouveau sur <Text bold>Échap</Text> pour interrompre et saisir une nouvelle instruction
        </Text>
      )}
    </Box>
  );
}
