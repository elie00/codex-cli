import type { ApplyPatchCommand, ApprovalPolicy } from "../../approvals.js";
import type { CommandConfirmation } from "../../utils/agent/agent-loop.js";
import type { AppConfig } from "../../utils/config.js";
import type { ColorName } from "chalk";
import type { ResponseItem } from "openai/resources/responses/responses.mjs";
import type { ReviewDecision } from "src/utils/agent/review.ts";

import TerminalChatInput from "./terminal-chat-input.js";
import { TerminalChatToolCallCommand } from "./terminal-chat-tool-call-item.js";
import {
  calculateContextPercentRemaining,
  uniqueById,
} from "./terminal-chat-utils.js";
import TerminalMessageHistory from "./terminal-message-history.js";
import { formatCommandForDisplay } from "../../format-command.js";
import { useConfirmation } from "../../hooks/use-confirmation.js";
import { useTerminalSize } from "../../hooks/use-terminal-size.js";
import { AgentLoop } from "../../utils/agent/agent-loop.js";
import { log, isLoggingEnabled } from "../../utils/agent/log.js";
import { createInputItem } from "../../utils/input-utils.js";
import { getAvailableModels } from "../../utils/model-utils.js";
import { CLI_VERSION } from "../../utils/session.js";
import { shortCwd } from "../../utils/short-path.js";
import { saveRollout } from "../../utils/storage/save-rollout.js";
import ApprovalModeOverlay from "../approval-mode-overlay.js";
import HelpOverlay from "../help-overlay.js";
import HistoryOverlay from "../history-overlay.js";
import ModelOverlay from "../model-overlay.js";
import OllamaConfigOverlay from "../ollama-config-overlay.js";
import OllamaModelManagerOverlay from "../ollama-model-manager-overlay.js";
import { updateModelParams } from "../../utils/ollama-config.js";
import { t } from "../../locales/en";
import { setActiveInterface } from "../../utils/screen-manager";
import { Box, Text } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import { inspect } from "util";

type Props = {
  config: AppConfig;
  prompt?: string;
  imagePaths?: Array<string>;
  approvalPolicy: ApprovalPolicy;
  fullStdout: boolean;
};

const colorsByPolicy: Record<ApprovalPolicy, ColorName | undefined> = {
  "suggest": undefined,
  "auto-edit": "green",
  "full-auto": "green",
};

// Function to get the friendly name of the provider
const getProviderName = (type: string = 'openai'): string => {
  switch(type) {
    case 'openai': return 'OpenAI';
    case 'ollama': return 'Ollama';
    case 'huggingface': return 'HuggingFace';
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

export default function TerminalChat({
  config,
  prompt: _initialPrompt,
  imagePaths: _initialImagePaths,
  approvalPolicy: initialApprovalPolicy,
  fullStdout,
}: Props): React.ReactElement {
  const [model, setModel] = useState<string>(config.model);
  const [lastResponseId, setLastResponseId] = useState<string | null>(null);
  const [items, setItems] = useState<Array<ResponseItem>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  // Allow switching approval modes at runtime via an overlay.
  const [approvalPolicy, setApprovalPolicy] = useState<ApprovalPolicy>(
    initialApprovalPolicy,
  );
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const { requestConfirmation, confirmationPrompt, submitConfirmation } =
    useConfirmation();
  const [overlayMode, setOverlayMode] = useState<
    "none" | "history" | "model" | "approval" | "help" | "ollama-config" | "ollama-models"
  >("none");

  const [initialPrompt, setInitialPrompt] = useState(_initialPrompt);
  const [initialImagePaths, setInitialImagePaths] =
    useState(_initialImagePaths);

  const PWD = React.useMemo(() => shortCwd(), []);

  // Keep a single AgentLoop instance alive across renders;
  // recreate only when model/instructions/approvalPolicy change.
  const agentRef = React.useRef<AgentLoop>();
  const [, forceUpdate] = React.useReducer((c) => c + 1, 0); // trigger re‑render

  // ────────────────────────────────────────────────────────────────
  // DEBUG: log every render w/ key bits of state
  // ────────────────────────────────────────────────────────────────
  if (isLoggingEnabled()) {
    log(
      `render – agent? ${Boolean(agentRef.current)} loading=${loading} items=${
        items.length
      }`,
    );
  }

  useEffect(() => {
    if (isLoggingEnabled()) {
      log("creating NEW AgentLoop");
      log(
        `model=${model} instructions=${Boolean(
          config.instructions,
        )} approvalPolicy=${approvalPolicy} providerType=${config.providerType}`,
      );
    }

    // Tear down any existing loop before creating a new one
    agentRef.current?.terminate();

    agentRef.current = new AgentLoop({
      model,
      config,
      instructions: config.instructions,
      approvalPolicy,
      onLastResponseId: setLastResponseId,
      onItem: (item) => {
        log(`onItem: ${JSON.stringify(item)}`);
        setItems((prev) => {
          const updated = uniqueById([...prev, item as ResponseItem]);
          saveRollout(updated);
          return updated;
        });
      },
      onLoading: setLoading,
      getCommandConfirmation: async (
        command: Array<string>,
        applyPatch: ApplyPatchCommand | undefined,
      ): Promise<CommandConfirmation> => {
        log(`getCommandConfirmation: ${command}`);
        const commandForDisplay = formatCommandForDisplay(command);
        const { decision: review, customDenyMessage } =
          await requestConfirmation(
            <TerminalChatToolCallCommand
              commandForDisplay={commandForDisplay}
            />,
          );
        return { review, customDenyMessage, applyPatch };
      },
      // Ajout des paramètres pour le fournisseur LLM
      providerType: config.providerType,
      providerUrl: config.providerUrl,
    });

    // force a render so JSX below can "see" the freshly created agent
    forceUpdate();

    if (isLoggingEnabled()) {
      log(`AgentLoop created: ${inspect(agentRef.current, { depth: 1 })}`);
    }

    return () => {
      if (isLoggingEnabled()) {
        log("terminating AgentLoop");
      }
      agentRef.current?.terminate();
      agentRef.current = undefined;
      forceUpdate(); // re‑render after teardown too
    };
  }, [model, config, approvalPolicy, requestConfirmation]);

  // whenever loading starts/stops, reset or start a timer — but pause the
  // timer while a confirmation overlay is displayed so we don't trigger a
  // re‑render every second during apply_patch reviews.
  useEffect(() => {
    let handle: ReturnType<typeof setInterval> | null = null;
    // Only tick the "thinking…" timer when the agent is actually processing
    // a request *and* the user is not being asked to review a command.
    if (loading && confirmationPrompt == null) {
      setThinkingSeconds(0);
      handle = setInterval(() => {
        setThinkingSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (handle) {
        clearInterval(handle);
      }
      setThinkingSeconds(0);
    }
    return () => {
      if (handle) {
        clearInterval(handle);
      }
    };
  }, [loading, confirmationPrompt]);

  // Let's also track whenever the ref becomes available
  const agent = agentRef.current;
  useEffect(() => {
    if (isLoggingEnabled()) {
      log(`agentRef.current is now ${Boolean(agent)}`);
    }
  }, [agent]);

  // ---------------------------------------------------------------------
  // Dynamic layout constraints – keep total rendered rows <= terminal rows
  // ---------------------------------------------------------------------

  const { rows: terminalRows } = useTerminalSize();

  useEffect(() => {
    const processInitialInputItems = async () => {
      if (
        (!initialPrompt || initialPrompt.trim() === "") &&
        (!initialImagePaths || initialImagePaths.length === 0)
      ) {
        return;
      }
      const inputItems = [
        await createInputItem(initialPrompt || "", initialImagePaths || []),
      ];
      // Clear them to prevent subsequent runs
      setInitialPrompt("");
      setInitialImagePaths([]);
      agent?.run(inputItems);
    };
    processInitialInputItems();
  }, [agent, initialPrompt, initialImagePaths]);

  // ────────────────────────────────────────────────────────────────
  // In-app warning if CLI --model isn't in fetched list
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const providerType = config.providerType || 'openai';
      const providerName = getProviderName(providerType);
      const available = await getAvailableModels(providerType, config.providerUrl);
      
      if (model && available.length > 0 && !available.includes(model)) {
        setItems((prev) => [
          ...prev,
          {
            id: `unknown-model-${Date.now()}`,
            type: "message",
            role: "system",
            content: [
              {
                type: "input_text",
                text: `Warning: model "${model}" is not in the list of available models returned by ${providerName}.`,
              },
            ],
          },
        ]);
      }
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Just render every item in order, no grouping/collapse
  const lastMessageBatch = items.map((item) => ({ item }));
  const groupCounts: Record<string, number> = {};
  const userMsgCount = items.filter(
    (i) => i.type === "message" && i.role === "user",
  ).length;

  const contextLeftPercent = useMemo(
    () => calculateContextPercentRemaining(items, model),
    [items, model],
  );

  return (
    <Box flexDirection="column">
      <Box flexDirection="column">
        {agent ? (
          <TerminalMessageHistory
            batch={lastMessageBatch}
            groupCounts={groupCounts}
            items={items}
            userMsgCount={userMsgCount}
            confirmationPrompt={confirmationPrompt}
            loading={loading}
            thinkingSeconds={thinkingSeconds}
            fullStdout={fullStdout}
            headerProps={{
              terminalRows,
              version: CLI_VERSION,
              PWD,
              model,
              approvalPolicy,
              colorsByPolicy,
              agent,
              initialImagePaths,
              providerType: config.providerType, // Add provider type for display
            }}
          />
        ) : (
          <Box>
            <Text color="gray">Initializing agent…</Text>
          </Box>
        )}
        {agent && (
          <TerminalChatInput
            loading={loading}
            setItems={setItems}
            isNew={Boolean(items.length === 0)}
            setLastResponseId={setLastResponseId}
            confirmationPrompt={confirmationPrompt}
            submitConfirmation={(
              decision: ReviewDecision,
              customDenyMessage?: string,
            ) =>
              submitConfirmation({
                decision,
                customDenyMessage,
              })
            }
            contextLeftPercent={contextLeftPercent}
            openOverlay={() => {
              setActiveInterface("history-overlay");
              setOverlayMode("history");
            }}
            openModelOverlay={() => {
              setActiveInterface("model-overlay");
              setOverlayMode("model");
            }}
            openApprovalOverlay={() => {
              setActiveInterface("approval-overlay");
              setOverlayMode("approval");
            }}
            openHelpOverlay={() => {
              setActiveInterface("help-overlay");
              setOverlayMode("help");
            }}
            openOllamaConfig={config.providerType === 'ollama' ? () => {
              setActiveInterface("ollama-config-overlay");
              setOverlayMode("ollama-config");
            } : undefined}
            openOllamaModels={config.providerType === 'ollama' ? () => {
              setActiveInterface("ollama-models-overlay");
              setOverlayMode("ollama-models");
            } : undefined}
            active={overlayMode === "none"}
            interruptAgent={() => {
              if (!agent) {
                return;
              }
              if (isLoggingEnabled()) {
                log(
                  "TerminalChat: interruptAgent invoked – calling agent.cancel()",
                );
              }
              agent.cancel();
              setLoading(false);

              // Add a system message to indicate the interruption
              setItems((prev) => [
                ...prev,
                {
                  id: `interrupt-${Date.now()}`,
                  type: "message",
                  role: "system",
                  content: [
                    {
                      type: "input_text",
                      text: "⏹️  Execution interrupted by user. You can continue typing.",
                    },
                  ],
                },
              ]);
            }}
            submitInput={(inputs) => {
              agent.run(inputs, lastResponseId || "");
              return {};
            }}
          />
        )}
        {overlayMode === "history" && (
          <HistoryOverlay items={items} onExit={() => {
            setActiveInterface("terminal-chat");
            setOverlayMode("none");
          }} />
        )}
        {overlayMode === "model" && (
          <ModelOverlay
            currentModel={model}
            hasLastResponse={Boolean(lastResponseId)}
            onSelect={(newModel) => {
              if (isLoggingEnabled()) {
                log(
                  "TerminalChat: interruptAgent invoked – calling agent.cancel()",
                );
                if (!agent) {
                  log("TerminalChat: agent is not ready yet");
                }
              }
              agent?.cancel();
              setLoading(false);

              setModel(newModel);
              setLastResponseId((prev) =>
                prev && newModel !== model ? null : prev,
              );

              setItems((prev) => [
                ...prev,
                {
                  id: `switch-model-${Date.now()}`,
                  type: "message",
                  role: "system",
                  content: [
                    {
                      type: "input_text",
                      text: `Switched model to ${newModel}`,
                    },
                  ],
                },
              ]);
              
              setActiveInterface("terminal-chat");
              setOverlayMode("none");
            }}
            onExit={() => {
              setActiveInterface("terminal-chat");
              setOverlayMode("none");
            }}
          />
        )}

        {overlayMode === "approval" && (
          <ApprovalModeOverlay
            currentMode={approvalPolicy}
            onSelect={(newMode) => {
              agent?.cancel();
              setLoading(false);
              if (newMode === approvalPolicy) {
                return;
              }
              setApprovalPolicy(newMode as ApprovalPolicy);
              setItems((prev) => [
                ...prev,
                {
                  id: `switch-approval-${Date.now()}`,
                  type: "message",
                  role: "system",
                  content: [
                    {
                      type: "input_text",
                      text: `Switched approval mode to ${newMode}`,
                    },
                  ],
                },
              ]);

              setActiveInterface("terminal-chat");
              setOverlayMode("none");
            }}
            onExit={() => {
              setActiveInterface("terminal-chat");
              setOverlayMode("none");
            }}
          />
        )}

        {overlayMode === "help" && (
          <HelpOverlay onExit={() => {
            setActiveInterface("terminal-chat");
            setOverlayMode("none");
          }} />
        )}
        
        {overlayMode === "ollama-config" && config.providerType === 'ollama' && (
          <OllamaConfigOverlay
            currentModel={model}
            onExit={() => {
              setActiveInterface("terminal-chat");
              setOverlayMode("none");
            }}
            onSave={(modelName, params) => {
              // Update model parameters
              updateModelParams(modelName, params);
              
              // Add system message to inform the user
              setItems((prev) => [
                ...prev,
                {
                  id: `config-update-${Date.now()}`,
                  type: "message",
                  role: "system",
                  content: [
                    {
                      type: "input_text",
                      text: `Model configuration updated for ${modelName}.`,
                    },
                  ],
                },
              ]);
              setActiveInterface("terminal-chat");
              setOverlayMode("none");
            }}
          />
        )}
        
        {overlayMode === "ollama-models" && config.providerType === 'ollama' && (
          <OllamaModelManagerOverlay
            onExit={() => {
              setActiveInterface("terminal-chat");
              setOverlayMode("none");
            }}
            onSelect={(modelName) => {
              // If the model has changed, update it
              if (modelName !== model) {
                // Cancel any ongoing request
                agent?.cancel();
                setLoading(false);

                // Update the model
                setModel(modelName);
                setLastResponseId((prev) =>
                  prev && modelName !== model ? null : prev
                );

                // Add system message to inform the user
                setItems((prev) => [
                  ...prev,
                  {
                    id: `switch-model-${Date.now()}`,
                    type: "message",
                    role: "system",
                    content: [
                      {
                        type: "input_text",
                        text: `Model changed to ${modelName}`,
                      },
                    ],
                  },
                ]);
              }
              setActiveInterface("terminal-chat");
              setOverlayMode("none");
            }}
          />
        )}
      </Box>
    </Box>
  );
}
