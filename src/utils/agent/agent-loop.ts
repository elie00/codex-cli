import type { ReviewDecision } from "./review.js";
import type { ApplyPatchCommand, ApprovalPolicy } from "../../approvals.js";
import type { AppConfig } from "../config.js";
import type {
  ResponseFunctionToolCall,
  ResponseInputItem,
  ResponseItem,
} from "openai/resources/responses/responses.mjs";
// Import de Reasoning supprimé car non utilisé
// import type { Reasoning } from "openai/resources.mjs";

import { log, isLoggingEnabled } from "./log.js";
import { OPENAI_BASE_URL, OPENAI_TIMEOUT_MS } from "../config.js";
import { parseToolCallArguments } from "../parsers.js";
import {
  // ORIGIN et CLI_VERSION supprimés car non utilisés
  getSessionId,
  setCurrentModel,
  setSessionId,
} from "../session.js";
import { handleExecCommand } from "./handle-exec-command.js";
import { randomUUID } from "node:crypto";

// Importation du type seulement, par son nom uniquement, sans variable non utilisée
// import type { APIConnectionTimeoutError } from "openai";

// Imports pour les fournisseurs LLM
import type { LLMProvider } from './llm-provider';
import type { LLMProviderType } from "../config.js";
// Nous n'importons plus aucun fournisseur spécifique ici - ils seront importés à la demande

// Wait time before retrying after rate limit errors (ms).
const RATE_LIMIT_RETRY_WAIT_MS = parseInt(
  process.env["OPENAI_RATE_LIMIT_RETRY_WAIT_MS"] || "2500",
  10,
);

export type CommandConfirmation = {
  review: ReviewDecision;
  applyPatch?: ApplyPatchCommand | undefined;
  customDenyMessage?: string;
};

const alreadyProcessedResponses = new Set();

type AgentLoopParams = {
  model: string;
  config?: AppConfig;
  instructions?: string;
  approvalPolicy: ApprovalPolicy;
  onItem: (item: ResponseItem) => void;
  onLoading: (loading: boolean) => void;

  /** Called when the command is not auto-approved to request explicit user review. */
  getCommandConfirmation: (
    command: Array<string>,
    applyPatch: ApplyPatchCommand | undefined,
  ) => Promise<CommandConfirmation>;
  onLastResponseId: (lastResponseId: string) => void;
  
  // Nouveaux paramètres pour le fournisseur LLM
  providerType?: LLMProviderType;
  providerUrl?: string;
};

export class AgentLoop {
  private model: string;
  private instructions?: string;
  private approvalPolicy: ApprovalPolicy;
  private config: AppConfig;
  
  // Attribut pour le fournisseur LLM
  private llmProvider: LLMProvider;
  private providerType: LLMProviderType;
  private providerInitialized: boolean = false;

  private onItem: (item: ResponseItem) => void;
  private onLoading: (loading: boolean) => void;
  private getCommandConfirmation: (
    command: Array<string>,
    applyPatch: ApplyPatchCommand | undefined,
  ) => Promise<CommandConfirmation>;
  private onLastResponseId: (lastResponseId: string) => void;

  /**
   * A reference to the currently active stream returned from the LLM provider
   * client. We keep this so that we can abort the request if the user decides
   * to interrupt the current task (e.g. via the escape hot‑key).
   */
  private currentStream: unknown | null = null;
  /** Incremented with every call to `run()`. Allows us to ignore stray events
   * from streams that belong to a previous run which might still be emitting
   * after the user has canceled and issued a new command. */
  private generation = 0;
  /** AbortController for in‑progress tool calls (e.g. shell commands). */
  private execAbortController: AbortController | null = null;
  /** Set to true when `cancel()` is called so `run()` can exit early. */
  private canceled = false;
  /** Function calls that were emitted by the model but never answered because
   *  the user cancelled the run.  We keep the `call_id`s around so the *next*
   *  request can send a dummy `function_call_output` that satisfies the
   *  contract and prevents the
   *    400 | No tool output found for function call …
   *  error from OpenAI. */
  private pendingAborts: Set<string> = new Set();
  /** Set to true by `terminate()` – prevents any further use of the instance. */
  private terminated = false;
  /** Master abort controller – fires when terminate() is invoked. */
  private readonly hardAbort = new AbortController();

  /**
   * Factory method to create uniquement le fournisseur LLM demandé
   * Cette approche évite d'instancier des fournisseurs non utilisés
   */
  private async createProvider(type: LLMProviderType): Promise<LLMProvider> {
    try {
      switch (type) {
        case 'ollama':
          const { OllamaProvider } = await import('./providers/ollama-provider-enhanced');
          return new OllamaProvider();
        case 'huggingface':
          const { HuggingFaceProvider } = await import('./providers/huggingface-provider');
          return new HuggingFaceProvider();
        case 'openai':
          const { OpenAIProvider } = await import('./providers/openai-provider');
          return new OpenAIProvider();
        default:
          throw new Error(`Fournisseur non supporté: ${type}`);
      }
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? error.message 
        : String(error);
      console.error(`Erreur lors de la création du fournisseur ${type}:`, errorMessage);
      throw error;
    }
  }

  /**
   * Abort the ongoing request/stream, if any. This allows callers (typically
   * the UI layer) to interrupt the current agent step so the user can issue
   * new instructions without waiting for the model to finish.
   */
  public cancel(): void {
    if (this.terminated) {
      return;
    }

    // Reset the current stream to allow new requests
    this.currentStream = null;
    if (isLoggingEnabled()) {
      log(
        `AgentLoop.cancel() invoked – currentStream=${Boolean(
          this.currentStream,
        )} execAbortController=${Boolean(
          this.execAbortController,
        )} generation=${this.generation}`,
      );
    }
    (
      this.currentStream as { controller?: { abort?: () => void } } | null
    )?.controller?.abort?.();

    this.canceled = true;

    // Abort any in-progress tool calls
    this.execAbortController?.abort();

    // Create a new abort controller for future tool calls
    this.execAbortController = new AbortController();
    if (isLoggingEnabled()) {
      log("AgentLoop.cancel(): execAbortController.abort() called");
    }

    // NOTE: We intentionally do *not* clear `lastResponseId` here.  If the
    // stream produced a `function_call` before the user cancelled, OpenAI now
    // expects a corresponding `function_call_output` that must reference that
    // very same response ID.  We therefore keep the ID around so the
    // follow‑up request can still satisfy the contract.

    // If we have *not* seen any function_call IDs yet there is nothing that
    // needs to be satisfied in a follow‑up request.  In that case we clear
    // the stored lastResponseId so a subsequent run starts a clean turn.
    if (this.pendingAborts.size === 0) {
      try {
        this.onLastResponseId("");
      } catch {
        /* ignore */
      }
    }

    this.onLoading(false);

    /* Inform the UI that the run was aborted by the user. */
    // const cancelNotice: ResponseItem = {
    //   id: `cancel-${Date.now()}`,
    //   type: "message",
    //   role: "system",
    //   content: [
    //     {
    //       type: "input_text",
    //       text: "⏹️  Execution canceled by user.",
    //     },
    //   ],
    // };
    // this.onItem(cancelNotice);

    this.generation += 1;
    if (isLoggingEnabled()) {
      log(`AgentLoop.cancel(): generation bumped to ${this.generation}`);
    }
  }

  /**
   * Hard‑stop the agent loop. After calling this method the instance becomes
   * unusable: any in‑flight operations are aborted and subsequent invocations
   * of `run()` will throw.
   */
  public terminate(): void {
    if (this.terminated) {
      return;
    }
    this.terminated = true;

    this.hardAbort.abort();

    this.cancel();
  }

  public sessionId: string;
  /*
   * Cumulative thinking time across this AgentLoop instance (ms).
   * Currently not used anywhere – comment out to keep the strict compiler
   * happy under `noUnusedLocals`.  Restore when telemetry support lands.
   */
  // private cumulativeThinkingMs = 0;
  constructor({
    model,
    instructions,
    approvalPolicy,
    // `config` used to be required.  Some unit‑tests (and potentially other
    // callers) instantiate `AgentLoop` without passing it, so we make it
    // optional and fall back to sensible defaults.  This keeps the public
    // surface backwards‑compatible and prevents runtime errors like
    // "Cannot read properties of undefined (reading 'apiKey')" when accessing
    // `config.apiKey` below.
    config,
    onItem,
    onLoading,
    getCommandConfirmation,
    onLastResponseId,
    
    // Nouveaux paramètres - providerUrl est transmis via config.providerUrl
    providerType = 'openai',
  }: AgentLoopParams & { config?: AppConfig }) {
    this.model = model;
    this.instructions = instructions;
    this.approvalPolicy = approvalPolicy;
    this.providerType = providerType;

    // If no `config` has been provided we derive a minimal stub so that the
    // rest of the implementation can rely on `this.config` always being a
    // defined object.  We purposefully copy over the `model` and
    // `instructions` that have already been passed explicitly so that
    // downstream consumers (e.g. telemetry) still observe the correct values.
    this.config =
      config ??
      ({
        model,
        instructions: instructions ?? "",
      } as AppConfig);
    this.onItem = onItem;
    this.onLoading = onLoading;
    this.getCommandConfirmation = getCommandConfirmation;
    this.onLastResponseId = onLastResponseId;
    this.sessionId = getSessionId() || randomUUID().replaceAll("-", "");
    
    setSessionId(this.sessionId);
    setCurrentModel(this.model);

    this.hardAbort = new AbortController();

    this.hardAbort.signal.addEventListener(
      "abort",
      () => this.execAbortController?.abort(),
      { once: true },
    );
    
    // Ne pas instancier le fournisseur dans le constructeur
    // Il sera créé à la demande lors de la première utilisation
    this.llmProvider = {} as LLMProvider; // Placeholder
  }

  // Méthode pour initialiser le fournisseur LLM à la demande
  private async initializeLLMProvider(providerUrl?: string): Promise<void> {
    if (this.providerInitialized) {
      return;
    }
    
    try {
      // Créer uniquement le fournisseur demandé
      this.llmProvider = await this.createProvider(this.providerType);
      
      // Préparer les options d'initialisation spécifiques à ce fournisseur
      const options: any = {
        timeout: OPENAI_TIMEOUT_MS,
      };
      
      // Ajouter l'URL de base si fournie
      if (providerUrl) {
        options.baseURL = providerUrl;
      }
      
      // Configuration spécifique selon le type de fournisseur
      switch (this.providerType) {
        case 'openai':
          // Ajouter la clé API pour OpenAI si disponible
          const apiKey = this.config.apiKey ?? process.env["OPENAI_API_KEY"];
          if (apiKey) {
            options.apiKey = apiKey;
          } else if (this.providerType === 'openai') {
            // Pour OpenAI uniquement: Permettre l'initialisation même sans clé API
            // C'est pour permettre à d'autres fournisseurs d'être utilisés sans erreur
            options.apiKey = "dummy-key-to-bypass-check";
            console.warn("Aucune clé API OpenAI trouvée, mais l'initialisation continue car un autre fournisseur pourrait être utilisé.");
          }
          options.baseURL = options.baseURL || OPENAI_BASE_URL;
          break;
        case 'huggingface':
          // Pour Hugging Face, ajouter la clé API si disponible
          const hfApiKey = process.env["HUGGINGFACE_API_KEY"];
          if (hfApiKey) {
            options.apiKey = hfApiKey;
          }
          break;
        case 'ollama':
          // Ollama n'a généralement pas besoin de clé API
          break;
      }
      
      // Initialiser le fournisseur avec les options appropriées
      await this.llmProvider.initialize(options);
      this.providerInitialized = true;
      
      if (isLoggingEnabled()) {
        log(`Fournisseur ${this.providerType} initialisé avec succès. URL: ${providerUrl || 'défaut'}`);
      }
    } catch (error) {
      this.providerInitialized = false;
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? error.message 
        : String(error);
      console.error(`Erreur lors de l'initialisation du fournisseur ${this.providerType}:`, errorMessage);
      
      // Informer l'utilisateur de l'erreur de manière explicite
      this.onItem({
        id: `error-${Date.now()}`,
        type: "message",
        role: "system",
        content: [
          {
            type: "input_text",
            text: `⚠️ Problème lors de l'initialisation du fournisseur ${this.providerType}. Erreur: ${errorMessage}`,
          },
        ],
      });
      throw error;
    }
  }

  private async handleFunctionCall(
    item: ResponseFunctionToolCall,
  ): Promise<Array<ResponseInputItem>> {
    // If the agent has been canceled in the meantime we should not perform any
    // additional work. Returning an empty array ensures that we neither execute
    // the requested tool call nor enqueue any follow‑up input items. This keeps
    // the cancellation semantics intuitive for users – once they interrupt a
    // task no further actions related to that task should be taken.
    if (this.canceled) {
      return [];
    }
    // ---------------------------------------------------------------------
    // Normalise the function‑call item into a consistent shape regardless of
    // whether it originated from the `/responses` or the `/chat/completions`
    // endpoint – their JSON differs slightly.
    // ---------------------------------------------------------------------

    const isChatStyle =
      // The chat endpoint nests function details under a `function` key.
      // We conservatively treat the presence of this field as a signal that
      // we are dealing with the chat format.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item as any).function != null;

    const name: string | undefined = isChatStyle
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item as any).function?.name
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item as any).name;

    const rawArguments: string | undefined = isChatStyle
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item as any).function?.arguments
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item as any).arguments;

    // The OpenAI "function_call" item may have either `call_id` (responses
    // endpoint) or `id` (chat endpoint).  Prefer `call_id` if present but fall
    // back to `id` to remain compatible.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callId: string = (item as any).call_id ?? (item as any).id;

    const args = parseToolCallArguments(rawArguments ?? "{}");
    if (isLoggingEnabled()) {
      log(
        `handleFunctionCall(): name=${
          name ?? "undefined"
        } callId=${callId} args=${rawArguments}`,
      );
    }

    if (args == null) {
      const outputItem: ResponseInputItem.FunctionCallOutput = {
        type: "function_call_output",
        call_id: item.call_id,
        output: `invalid arguments: ${rawArguments}`,
      };
      return [outputItem];
    }

    const outputItem: ResponseInputItem.FunctionCallOutput = {
      type: "function_call_output",
      // `call_id` is mandatory – ensure we never send `undefined` which would
      // trigger the "No tool output found…" 400 from the API.
      call_id: callId,
      output: "no function found",
    };

    // We intentionally *do not* remove this `callId` from the `pendingAborts`
    // set right away.  The output produced below is only queued up for the
    // *next* request to the OpenAI API – it has not been delivered yet.  If
    // the user presses ESC‑ESC (i.e. invokes `cancel()`) in the small window
    // between queuing the result and the actual network call, we need to be
    // able to surface a synthetic `function_call_output` marked as
    // "aborted".  Keeping the ID in the set until the run concludes
    // successfully lets the next `run()` differentiate between an aborted
    // tool call (needs the synthetic output) and a completed one (cleared
    // below in the `flush()` helper).

    // used to tell model to stop if needed
    const additionalItems: Array<ResponseInputItem> = [];

    // TODO: allow arbitrary function calls (beyond shell/container.exec)
    if (name === "container.exec" || name === "shell") {
      const {
        outputText,
        metadata,
        additionalItems: additionalItemsFromExec,
      } = await handleExecCommand(
        args,
        this.config,
        this.approvalPolicy,
        this.getCommandConfirmation,
        this.execAbortController?.signal,
      );
      outputItem.output = JSON.stringify({ output: outputText, metadata });

      if (additionalItemsFromExec) {
        additionalItems.push(...additionalItemsFromExec);
      }
    }

    return [outputItem, ...additionalItems];
  }

  public async run(
    input: Array<ResponseInputItem>,
    previousResponseId: string = "",
  ): Promise<void> {
    // ---------------------------------------------------------------------
    // Top‑level error wrapper so that known transient network issues like
    // `ERR_STREAM_PREMATURE_CLOSE` do not crash the entire CLI process.
    // Instead we surface the failure to the user as a regular system‑message
    // and terminate the current run gracefully. The calling UI can then let
    // the user retry the request if desired.
    // ---------------------------------------------------------------------

    try {
      if (this.terminated) {
        throw new Error("AgentLoop has been terminated");
      }
      
      // S'assurer que le fournisseur est initialisé avant d'exécuter quoi que ce soit
      try {
        await this.initializeLLMProvider(this.config.providerUrl);
      } catch (error) {
        // L'erreur a déjà été signalée à l'utilisateur dans initializeLLMProvider
        this.onLoading(false);
        return;
      }
      
      // Record when we start "thinking" so we can report accurate elapsed time.
      const thinkingStart = Date.now();
      // Bump generation so that any late events from previous runs can be
      // identified and dropped.
      const thisGeneration = ++this.generation;

      // Reset cancellation flag and stream for a fresh run.
      this.canceled = false;
      this.currentStream = null;

      // Create a fresh AbortController for this run so that tool calls from a
      // previous run do not accidentally get signalled.
      this.execAbortController = new AbortController();
      if (isLoggingEnabled()) {
        log(
          `AgentLoop.run(): new execAbortController created (${this.execAbortController.signal}) for generation ${this.generation}`,
        );
      }
      // NOTE: We no longer (re‑)attach an `abort` listener to `hardAbort` here.
      // A single listener that forwards the `abort` to the current
      // `execAbortController` is installed once in the constructor. Re‑adding a
      // new listener on every `run()` caused the same `AbortSignal` instance to
      // accumulate listeners which in turn triggered Node's
      // `MaxListenersExceededWarning` after ten invocations.

      let lastResponseId: string = previousResponseId;

      // If there are unresolved function calls from a previously cancelled run
      // we have to emit dummy tool outputs so that the API no longer expects
      // them.  We prepend them to the user‑supplied input so they appear
      // first in the conversation turn.
      const abortOutputs: Array<ResponseInputItem> = [];
      if (this.pendingAborts.size > 0) {
        for (const id of this.pendingAborts) {
          abortOutputs.push({
            type: "function_call_output",
            call_id: id,
            output: JSON.stringify({
              output: "aborted",
              metadata: { exit_code: 1, duration_seconds: 0 },
            }),
          } as ResponseInputItem.FunctionCallOutput);
        }
        // Once converted the pending list can be cleared.
        this.pendingAborts.clear();
      }

      let turnInput = [...abortOutputs, ...input];

      this.onLoading(true);

      const staged: Array<ResponseItem | undefined> = [];
      const stageItem = (item: ResponseItem) => {
        // Ignore any stray events that belong to older generations.
        if (thisGeneration !== this.generation) {
          return;
        }

        // Store the item so the final flush can still operate on a complete list.
        // We'll nil out entries once they're delivered.
        const idx: number = staged.push(item as ResponseItem) - 1;

        // Instead of emitting synchronously we schedule a short‑delay delivery.
        // This accomplishes two things:
        //   1. The UI still sees new messages almost immediately, creating the
        //      perception of real‑time updates.
        //   2. If the user calls `cancel()` in the small window right after the
        //      item was staged we can still abort the delivery because the
        //      generation counter will have been bumped by `cancel()`.
        setTimeout(() => {
          if (
            thisGeneration === this.generation &&
            !this.canceled &&
            !this.hardAbort.signal.aborted
          ) {
            this.onItem(item);
            // Mark as delivered so flush won't re-emit it
            staged[idx] = undefined;
          }
        }, 10);
      };

      while (turnInput.length > 0) {
        if (this.canceled || this.hardAbort.signal.aborted) {
          this.onLoading(false);
          return;
        }
        // send request to openAI
        for (const item of turnInput as unknown as ResponseItem[]) {
          stageItem(item as ResponseItem);
        }
        
        // Utilisez le fournisseur LLM au lieu de l'appel direct à OpenAI
        let stream;

        // Retry loop for transient errors. Up to MAX_RETRIES attempts.
        const MAX_RETRIES = 5;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const mergedInstructions = [prefix, this.instructions]
              .filter(Boolean)
              .join("\n");
              
            if (isLoggingEnabled()) {
              log(
                `instructions (length ${mergedInstructions.length}): ${mergedInstructions}`,
              );
            }
            
            // Utiliser le fournisseur LLM au lieu d'OpenAI directement
            // Pour Hugging Face, sauter la vérification du modèle car c'est géré par l'URL
            if (!(this.providerType === 'huggingface' || await this.llmProvider.isModelSupported(this.model))) {
              throw new Error(`Le modèle "${this.model}" n'apparaît pas dans la liste des modèles disponibles pour le fournisseur ${this.providerType}.\nVeuillez vérifier le nom du modèle et réessayer.`);
            }
            
            stream = await this.llmProvider.createStreamingResponse(
              this.model,
              mergedInstructions,
              turnInput,
              lastResponseId || undefined
            );
            
            break;
          } catch (error) {
            // Vérification du type d'erreur
            const isTimeout = error && typeof error === 'object' && 'name' in error && 
                              error.name === "APIConnectionTimeoutError";
            const isConnectionError = error && typeof error === 'object' && 'name' in error && 
                                      error.name === "APIConnectionError";
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errCtx = error as any;
            const status =
              errCtx?.status ?? errCtx?.httpStatus ?? errCtx?.statusCode;
            const isServerError = typeof status === "number" && status >= 500;
            if (
              (isTimeout || isServerError || isConnectionError) &&
              attempt < MAX_RETRIES
            ) {
              log(
                `LLM request failed (attempt ${attempt}/${MAX_RETRIES}), retrying...`,
              );
              continue;
            }

            const isTooManyTokensError =
              (errCtx.param === "max_tokens" ||
                (typeof errCtx.message === "string" &&
                  /max_tokens is too large/i.test(errCtx.message))) &&
              errCtx.type === "invalid_request_error";

            if (isTooManyTokensError) {
              this.onItem({
                id: `error-${Date.now()}`,
                type: "message",
                role: "system",
                content: [
                  {
                    type: "input_text",
                    text: "⚠️  La requête actuelle dépasse la longueur de contexte maximale supportée par le modèle choisi. Veuillez raccourcir la conversation, exécuter /clear, ou passer à un modèle avec une fenêtre de contexte plus grande et réessayer.",
                  },
                ],
              });
              this.onLoading(false);
              return;
            }

            const isRateLimit =
              status === 429 ||
              errCtx.code === "rate_limit_exceeded" ||
              errCtx.type === "rate_limit_exceeded" ||
              /rate limit/i.test(errCtx.message ?? "");
            if (isRateLimit) {
              if (attempt < MAX_RETRIES) {
                // Exponential backoff: base wait * 2^(attempt-1), or use suggested retry time
                // if provided.
                let delayMs = RATE_LIMIT_RETRY_WAIT_MS * 2 ** (attempt - 1);

                // Parse suggested retry time from error message, e.g., "Please try again in 1.3s"
                const msg = errCtx?.message ?? "";
                const m = /retry again in ([\d.]+)s/i.exec(msg);
                if (m && m[1]) {
                  const suggested = parseFloat(m[1]) * 1000;
                  if (!Number.isNaN(suggested)) {
                    delayMs = suggested;
                  }
                }
                log(
                  `Rate limit exceeded (attempt ${attempt}/${MAX_RETRIES}), retrying in ${Math.round(
                    delayMs,
                  )} ms...`,
                );
                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                continue;
              } else {
                // We have exhausted all retry attempts. Surface a message so the user understands
                // why the request failed and can decide how to proceed (e.g. wait and retry later
                // or switch to a different model / account).

                const errorDetails = [
                  `Status: ${status || "unknown"}`,
                  `Code: ${errCtx.code || "unknown"}`,
                  `Type: ${errCtx.type || "unknown"}`,
                  `Message: ${errCtx.message || "unknown"}`,
                ].join(", ");

                this.onItem({
                  id: `error-${Date.now()}`,
                  type: "message",
                  role: "system",
                  content: [
                    {
                      type: "input_text",
                      text: `⚠️  Limite de débit atteinte. Détails de l'erreur : ${errorDetails}. Veuillez réessayer plus tard.`,
                    },
                  ],
                });

                this.onLoading(false);
                return;
              }
            }

            const isClientError =
              (typeof status === "number" &&
                status >= 400 &&
                status < 500 &&
                status !== 429) ||
              errCtx.code === "invalid_request_error" ||
              errCtx.type === "invalid_request_error";
            if (isClientError) {
              this.onItem({
                id: `error-${Date.now()}`,
                type: "message",
                role: "system",
                content: [
                  {
                    type: "input_text",
                    // Surface the request ID when it is present on the error so users
                    // can reference it when contacting support or inspecting logs.
                    text: (() => {
                      const reqId =
                        (
                          errCtx as Partial<{
                            request_id?: string;
                            requestId?: string;
                          }>
                        )?.request_id ??
                        (
                          errCtx as Partial<{
                            request_id?: string;
                            requestId?: string;
                          }>
                        )?.requestId;

                      const errorDetails = [
                        `Status: ${status || "unknown"}`,
                        `Code: ${errCtx.code || "unknown"}`,
                        `Type: ${errCtx.type || "unknown"}`,
                        `Message: ${errCtx.message || "unknown"}`,
                      ].join(", ");

                      return `⚠️  Le fournisseur a rejeté la requête${
                        reqId ? ` (request ID: ${reqId})` : ""
                      }. Détails de l'erreur : ${errorDetails}. Veuillez vérifier vos paramètres et réessayer.`;
                    })(),
                  },
                ],
              });
              this.onLoading(false);
              return;
            }
            throw error;
          }
        }
        turnInput = []; // clear turn input, prepare for function call results

        // If the user requested cancellation while we were awaiting the network
        // request, abort immediately before we start handling the stream.
        if (this.canceled || this.hardAbort.signal.aborted) {
          // `stream` is defined; abort to avoid wasting tokens/server work
          try {
            (
              stream as { controller?: { abort?: () => void } }
            )?.controller?.abort?.();
          } catch {
            /* ignore */
          }
          this.onLoading(false);
          return;
        }

        // Keep track of the active stream so it can be aborted on demand.
        this.currentStream = stream;

        // guard against an undefined stream before iterating
        if (!stream) {
          this.onLoading(false);
          log("AgentLoop.run(): stream is undefined");
          return;
        }

        try {
          // eslint-disable-next-line no-await-in-loop
          for await (const event of stream) {
            if (isLoggingEnabled()) {
              log(`AgentLoop.run(): response event ${event.type}`);
            }

            // process and surface each item (no‑op until we can depend on streaming events)
            if (event.type === "response.output_item.done") {
              const item = event.item;
              // 1) if it's a reasoning item, annotate it
              type ReasoningItem = { type?: string; duration_ms?: number };
              const maybeReasoning = item as ReasoningItem;
              if (maybeReasoning && maybeReasoning.type === "reasoning") {
                maybeReasoning.duration_ms = Date.now() - thinkingStart;
              }
              if (item && item.type === "function_call") {
                // Track outstanding tool call so we can abort later if needed.
                // The item comes from the streaming response, therefore it has
                // either `id` (chat) or `call_id` (responses) – we normalise
                // by reading both.
                const callId =
                  (item as { call_id?: string; id?: string }).call_id ??
                  (item as { id?: string }).id;
                if (callId) {
                  this.pendingAborts.add(callId);
                }
              } else {
                stageItem(item as ResponseItem);
              }
            }

            if (event.type === "response.completed" && event.response) {
              if (thisGeneration === this.generation && !this.canceled) {
                for (const item of event.response.output) {
                  stageItem(item as ResponseItem);
                }
              }
              if (event.response && event.response.status === "completed") {
                // TODO: remove this once we can depend on streaming events
                const newTurnInput = await this.processEventsWithoutStreaming(
                  event.response.output,
                  stageItem,
                );
                turnInput = newTurnInput;
              }
              lastResponseId = event.response.id;
              this.onLastResponseId(event.response.id);
            }
          }
        } catch (err: unknown) {
          // Gracefully handle an abort triggered via `cancel()` so that the
          // consumer does not see an unhandled exception.
          if (err instanceof Error && err.name === "AbortError") {
            if (!this.canceled) {
              // It was aborted for some other reason; surface the error.
              throw err;
            }
            this.onLoading(false);
            return;
          }
          throw err;
        } finally {
          this.currentStream = null;
        }

        log(
          `Turn inputs (${turnInput.length}) - ${turnInput
            .map((i) => i.type)
            .join(", ")}`,
        );
      }

      // Flush staged items if the run concluded successfully (i.e. the user did
      // not invoke cancel() or terminate() during the turn).
      const flush = () => {
        if (
          !this.canceled &&
          !this.hardAbort.signal.aborted &&
          thisGeneration === this.generation
        ) {
          // Only emit items that weren't already delivered above
          for (const item of staged) {
            if (item) {
              this.onItem(item);
            }
          }
        }

        // At this point the turn finished without the user invoking
        // `cancel()`.  Any outstanding function‑calls must therefore have been
        // satisfied, so we can safely clear the set that tracks pending aborts
        // to avoid emitting duplicate synthetic outputs in subsequent runs.
        this.pendingAborts.clear();

        this.onLoading(false);
      };

      // Delay flush slightly to allow a near‑simultaneous cancel() to land.
      setTimeout(flush, 30);
      // End of main logic. The corresponding catch block for the wrapper at the
      // start of this method follows next.
    } catch (err) {
      // Handle known transient network/streaming issues so they do not crash the
      // CLI. We currently match Node/undici's `ERR_STREAM_PREMATURE_CLOSE`
      // error which manifests when the HTTP/2 stream terminates unexpectedly
      // (e.g. during brief network hiccups).

      const isPrematureClose =
        err instanceof Error &&
        // eslint-disable-next-line
        ((err as any).code === "ERR_STREAM_PREMATURE_CLOSE" ||
          err.message?.includes("Premature close"));

      if (isPrematureClose) {
        try {
          this.onItem({
            id: `error-${Date.now()}`,
            type: "message",
            role: "system",
            content: [
              {
                type: "input_text",
                text: "⚠️  La connexion s'est fermée prématurément en attendant le modèle. Veuillez réessayer.",
              },
            ],
          });
        } catch {
          /* no‑op – emitting the error message is best‑effort */
        }
        this.onLoading(false);
        return;
      }

      // -------------------------------------------------------------------
      // Catch‑all handling for other network or server‑side issues so that
      // transient failures do not crash the CLI. We intentionally keep the
      // detection logic conservative to avoid masking programming errors. A
      // failure is treated as retry‑worthy/user‑visible when any of the
      // following apply:
      //   • the error carries a recognised Node.js network errno ‑ style code
      //     (e.g. ECONNRESET, ETIMEDOUT …)
      //   • the OpenAI SDK attached an HTTP `status` >= 500 indicating a
      //     server‑side problem.
      // If matched we emit a single system message to inform the user and
      // resolve gracefully so callers can choose to retry.
      // -------------------------------------------------------------------

      const NETWORK_ERRNOS = new Set([
        "ECONNRESET",
        "ECONNREFUSED",
        "EPIPE",
        "ENOTFOUND",
        "ETIMEDOUT",
        "EAI_AGAIN",
      ]);

      const isNetworkOrServerError = (() => {
        if (!err || typeof err !== "object") {
          return false;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e: any = err;

        // Direct instance check for connection errors thrown by the OpenAI SDK.
        // Changé pour un test sur le nom plutôt qu'un test d'instance direct
        if (e.name === "APIConnectionError") {
          return true;
        }

        if (typeof e.code === "string" && NETWORK_ERRNOS.has(e.code)) {
          return true;
        }

        // When the OpenAI SDK nests the underlying network failure inside the
        // `cause` property we surface it as well so callers do not see an
        // unhandled exception for errors like ENOTFOUND, ECONNRESET …
        if (
          e.cause &&
          typeof e.cause === "object" &&
          NETWORK_ERRNOS.has((e.cause as { code?: string }).code ?? "")
        ) {
          return true;
        }

        if (typeof e.status === "number" && e.status >= 500) {
          return true;
        }

        // Fallback to a heuristic string match so we still catch future SDK
        // variations without enumerating every errno.
        if (
          typeof e.message === "string" &&
          /network|socket|stream/i.test(e.message)
        ) {
          return true;
        }

        return false;
      })();

      if (isNetworkOrServerError) {
        try {
          const msgText =
            "⚠️  Erreur réseau lors de la communication avec le fournisseur LLM. Veuillez vérifier votre connexion et réessayer.";
          this.onItem({
            id: `error-${Date.now()}`,
            type: "message",
            role: "system",
            content: [
              {
                type: "input_text",
                text: msgText,
              },
            ],
          });
        } catch {
          /* best‑effort */
        }
        this.onLoading(false);
        return;
      }

      // Re‑throw all other errors so upstream handlers can decide what to do.
      throw err;
    }
  }

  // we need until we can depend on streaming events
  private async processEventsWithoutStreaming(
    output: Array<ResponseInputItem>,
    emitItem: (item: ResponseItem) => void,
  ): Promise<Array<ResponseInputItem>> {
    // If the agent has been canceled we should short‑circuit immediately to
    // avoid any further processing (including potentially expensive tool
    // calls). Returning an empty array ensures the main run‑loop terminates
    // promptly.
    if (this.canceled) {
      return [];
    }
    const turnInput: Array<ResponseInputItem> = [];
    for (const item of output as unknown as ResponseItem[]) {
      if (item && item.type === "function_call") {
        if (item && item.id && alreadyProcessedResponses.has(item.id)) {
          continue;
        }
        if (item.id) {
          alreadyProcessedResponses.add(item.id);
        }
        // eslint-disable-next-line no-await-in-loop
        const result = await this.handleFunctionCall(item);
        turnInput.push(...result);
      }
      emitItem(item as ResponseItem);
    }
    return turnInput;
  }
}

const prefix = `Vous êtes un assistant codex, un outil d'aide à la programmation en ligne de commande qui utilise les modèles de langage pour interagir naturellement avec une base de code locale. Vous êtes précis, utile et sécurisé.

Vous pouvez :
- Recevoir des demandes de l'utilisateur, du contexte sur le projet, et des fichiers.
- Envoyer des réponses et exécuter des fonctions (commandes shell, éditions de code).
- Appliquer des correctifs, exécuter des commandes et gérer les approbations.
- Travailler dans un espace de travail sécurisé avec support Git.
- Plus de détails sur vos fonctionnalités sont disponibles avec \`codex --help\`

Vous êtes un agent - continuez jusqu'à ce que la demande de l'utilisateur soit complètement résolue. Ne terminez votre tour que lorsque vous êtes sûr que le problème est résolu. Si vous n'êtes pas sûr du contenu d'un fichier ou de la structure du code, utilisez vos outils pour lire les fichiers et rassembler les informations pertinentes: ne devinez PAS.

Résolvez la tâche de l'utilisateur en modifiant et en testant les fichiers de code dans votre session d'exécution actuelle. Vous êtes un agent de codage déployé. Votre session vous permet de modifier et d'exécuter du code. Les dépôts sont déjà clonés dans votre répertoire de travail.

Vous DEVEZ respecter les critères suivants lors de l'exécution de la tâche :
- Travailler sur les dépôts dans l'environnement actuel est autorisé, même s'ils sont propriétaires.
- L'analyse du code pour les vulnérabilités est autorisée.
- Montrer le code de l'utilisateur et les détails des appels d'outils est autorisé.
- Utilisez \`apply_patch\` pour éditer les fichiers: {"cmd":["apply_patch","*** Begin Patch\\n*** Update File: path/to/file.py\\n@@ def example():\\n-  pass\\n+  return 123\\n*** End Patch"]}
- Si la tâche nécessite d'écrire ou de modifier des fichiers :
    - Votre code doit suivre ces *DIRECTIVES DE CODAGE* :
        - Résoudre le problème à la source plutôt que d'appliquer des correctifs superficiels.
        - Éviter la complexité inutile dans votre solution.
        - Mettre à jour la documentation si nécessaire.
        - Maintenir la cohérence avec le style de la base de code existante.
        - NE JAMAIS ajouter d'en-têtes de copyright ou de licence sauf demande explicite.
        - Une fois terminé, vérifiez vos changements avec \`git status\`.
- Si la tâche de l'utilisateur NE nécessite PAS d'écrire ou de modifier des fichiers :
    - Répondez de manière amicale, comme un collègue distant, compétent et désireux d'aider.`;
