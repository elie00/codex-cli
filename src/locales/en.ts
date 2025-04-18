/**
 * English translation file for codex-cli
 * This file centralizes all interface text strings
 */

// Types for translations
type TranslationGroups = {
  common: Record<string, string>;
  errors: Record<string, string>;
  cli: Record<string, string>;
  interface: Record<string, string>;
  providers: Record<string, string>;
  splashScreen: Record<string, string>;
  help: Record<string, string>;
  model_selection: Record<string, string>;
};

/**
 * English translations
 */
const en: TranslationGroups = {
  // Common terms used throughout the application
  common: {
    // Provider names
    'provider_openai': 'OpenAI',
    'provider_ollama': 'Ollama',
    'provider_huggingface': 'HuggingFace',
    
    // Approval modes
    'approval_suggest': 'suggest',
    'approval_auto_edit': 'auto-edit',
    'approval_full_auto': 'full-auto',
    
    // General terms
    'loading': 'Loading...',
    'cancel': 'Cancel',
    'confirm': 'Confirm',
    'yes': 'Yes',
    'no': 'No',
    'ok': 'OK',
    'error': 'Error',
    'warning': 'Warning',
    'info': 'Info',
    'success': 'Success',
    'default_prompt': 'Hello, can you help me?',
    
    // Various loading messages
    'thinking': 'Thinking...',
    'processing': 'Processing...',
    'analyzing': 'Analyzing...',
    'generating': 'Generating...',
    'writing': 'Writing...',
    'coding': 'Coding...',
    
    // Shortcut keys
    'press_enter': 'Press Enter',
    'press_esc': 'Press Esc',
    'press_tab': 'Press Tab',
  },
  
  // Messages for model selection screen
  model_selection: {
    'title': 'Ollama Model Selection',
    'instructions': 'Choose the model you want to use for this session.',
    'local_models': 'Local Models',
    'popular_models': 'Popular Models',
    'no_local_models': 'No local models found. Use the "ollama pull <model>" command to download some.',
    'no_popular_models': 'No popular models currently available.',
    'loading': 'Loading models...',
    'help': 'Press {toggle} to toggle between local/popular models, {select} to navigate, {confirm} to select, {cancel} to cancel',
    'params': 'Parameters for {model}: {params}',
    'model_selected': 'Model {model} selected!',
    'install_model': 'Install this model',
    'already_installed': 'Already installed',
    'current_model': 'Current model',
    'downloading': 'Downloading model {model}...',
    'download_success': 'Model {model} downloaded successfully!',
    'download_error': 'Error downloading model {model}',
  },
  
  // Error messages
  errors: {
    // General errors
    'generic_error': 'An error occurred. Please try again.',
    'network_error': '⚠️  Network error when communicating with the LLM provider. Please check your connection and try again.',
    'timeout_error': '⚠️  Request timed out. Please try again.',
    'provider_error': '⚠️  LLM provider error. Please try again.',
    'api_key_missing': '⚠️  API key missing. Please configure your API key.',
    
    // OpenAI specific errors
    'openai_api_key_missing': `
⚠️  OpenAI API key missing.

Set the OPENAI_API_KEY environment variable and restart this command.
You can create a key here: https://platform.openai.com/account/api-keys
`,
    'openai_rate_limit': '⚠️  OpenAI rate limit reached. Please try again later.',
    'openai_context_length': '⚠️  The current request exceeds the maximum context length supported by the chosen model. Please shorten the conversation, run /clear, or switch to a model with a larger context window and try again.',
    
    // Ollama specific errors
    'ollama_connection_error': '⚠️  Unable to connect to Ollama server. Check that the server is running.',
    'ollama_model_not_found': '⚠️  Ollama model not found. Please check the model name or download the model with "ollama pull MODEL_NAME".',
    'ollama_error': '⚠️  Ollama error. Please check that the server is running and the model is available.',
    
    // Model-related errors
    'model_not_supported': '⚠️  The model "{model}" does not appear in the list of available models for the {provider} provider.\nPlease check the model name and try again.',
    'model_load_error': '⚠️  Error loading model. Please try again.',
    
    // Execution errors
    'execution_interrupted': '⏹️  Execution interrupted by user.',
    'command_error': '⚠️  Error executing command. Exit code: {code}',
    'stream_closed': '⚠️  The connection closed prematurely while waiting for the model. Please try again.',
  },
  
  // Command line messages
  cli: {
    // Usage and help
    'usage': `
  Usage
    $ codex [options] <prompt>
    $ codex completion <bash|zsh|fish>

  Options
    -h, --help                 Show help and exit
    -m, --model <model>        Model to use (default: gemma3:4b)
    -i, --image <path>         Path(s) to image files to include
    -v, --view <rollout>       Inspect a previously saved rollout
    -q, --quiet                Non-interactive mode (only shows final output)
    -c, --config               Open the instructions file in your editor
    -a, --approval-mode <mode> Override the approval policy: 'suggest', 'auto-edit', or 'full-auto'

    --auto-edit                Automatically approve file edits; ask for commands
    --full-auto                Automatically approve edits and commands in the sandbox

    --no-project-doc           Don't automatically include the repository's 'codex.md'
    --project-doc <file>       Include an additional markdown file as context
    --full-stdout              Don't truncate command stdout/stderr

    --provider <provider>      LLM provider to use ('openai', 'ollama', or 'huggingface') (default: ollama)
    --provider-url <url>       Provider API URL (for Ollama and HuggingFace)

  Dangerous options
    --dangerously-auto-approve-everything
                               Skip all confirmation prompts and run commands without
                               a sandbox. Only intended for ephemeral local testing.

  Experimental options
    -f, --full-context         Run in "full context" mode that loads the entire repository
                               into context and applies a batch of changes at once.

  Examples
    $ codex "Write and run a Python program that displays ASCII art"
    $ codex -q "Fix the build issues"
    $ codex completion bash
    $ codex --provider ollama --model llama3 "write a function that calculates fibonacci"
`,
    
    // Examples and suggestions
    'example_1': 'Explain this code',
    'example_2': 'Fix compilation errors',
    'example_3': 'Are there any bugs in my code?',
    'example_4': 'Write a program that displays ASCII art',
    'example_5': 'Optimize this function',
    
    // Miscellaneous CLI messages
    'missing_prompt': 'Quiet mode requires a prompt string, e.g.: codex -q "Fix bug #123 in foobar project"',
    'initializing': 'Initializing agent...',
    'completion_unsupported_shell': 'Unsupported shell: {shell}',
  },
  
  // Interface messages
  interface: {
    // Header and session information
    'header_title': 'Codex',
    'header_subtitle': 'code assistant',
    'session_info': 'session: {id}',
    'workdir': 'workdir: {path}',
    'provider': 'provider: {provider}',
    'model': 'model: {model}',
    'approval': 'approval: {mode}',
    
    // Interface messages
    'input_placeholder': 'Send a message or Tab for a suggestion',
    'send_message': 'Send',
    'cancel_request': 'Cancel request',
    'git_warning_title': 'Warning!',
    'git_warning_message': 'It can be dangerous to run a coding agent outside of a git repository, as you won\'t be able to easily undo changes. Do you want to continue?',
    
    // Feature messages
    'command_review': 'Command Review',
    'execute_command': 'Execute this command?',
    'approve': 'Approve',
    'deny': 'Deny',
    'skip': 'Skip',
    'loading_status': '{seconds}s elapsed',
    'context_remaining': 'Context remaining: {percent}%',
    
    // Overlays
    'history_title': 'History',
    'model_selection_title': 'Model Selection',
    'model_switch': 'Switched model to {model}',
    'approval_mode_title': 'Approval Mode',
    'approval_switch': 'Switched approval mode to {mode}',
  },
  
  // LLM provider-related messages
  providers: {
    'ollama_connecting': 'Connecting to Ollama...',
    'ollama_connected': 'Connected to Ollama successfully: {url}',
    'ollama_streaming': 'Starting streaming response',
    'ollama_request': 'Ollama request - Model: {model}',
    'ollama_models_available': 'Ollama models available: {models}',
    'ollama_model_info': 'Model information: {info}',
    
    'openai_models_available': 'OpenAI models available: {models}',
    'openai_request': 'OpenAI request - Model: {model}',
    
    'huggingface_connecting': 'Connecting to HuggingFace...',
    'huggingface_models_available': 'HuggingFace models available: {models}',
  },
  
  // Splash screen messages
  splashScreen: {
    'welcome': '* Welcome to your code assistant',
    'loading': 'Initializing... {percent}%',
    'ready': 'Ready!',
    'login_success': '🚀 Login successful. Press ',
    'enter_to_continue': 'Enter',
    'to_continue': ' to continue',
    'version': 'Version {version}',
    'provider_info': 'Provider: {provider} | Model: {model}',
  },
  
  // Help messages
  help: {
    'title': 'Codex Help',
    'subtitle': 'Shortcuts and commands',
    'shortcuts_title': 'Keyboard shortcuts',
    'commands_title': 'Commands',
    
    'shortcut_esc': 'Esc',
    'shortcut_esc_desc': 'Cancel current request / Exit overlay',
    'shortcut_enter': 'Enter',
    'shortcut_enter_desc': 'Send message / Confirm',
    'shortcut_tab': 'Tab',
    'shortcut_tab_desc': 'Show suggestions',
    'shortcut_arrows': 'Up/Down Arrows',
    'shortcut_arrows_desc': 'Navigate message history',
    'shortcut_ctrl_c': 'Ctrl+C',
    'shortcut_ctrl_c_desc': 'Exit Codex',
    
    'command_help': '/help',
    'command_help_desc': 'Show this help',
    'command_clear': '/clear',
    'command_clear_desc': 'Clear conversation history',
    'command_model': '/model',
    'command_model_desc': 'Change model',
    'command_mode': '/mode',
    'command_mode_desc': 'Change approval mode',
    'command_ollama': '/ollama',
    'command_ollama_desc': 'Configure Ollama parameters',
    'command_models': '/models',
    'command_models_desc': 'Manage Ollama models',
  },
};

/**
 * Function to get a translation
 * @param key Translation key in the format 'group.key'
 * @param params Optional parameters for substitutions
 */
export function translate(key: string, params?: Record<string, string | number>): string {
  const [group, subKey] = key.split('.');
  
  if (!group || !subKey) {
    console.warn(`Invalid translation key: ${key}`);
    return key;
  }
  
  // Check if the group exists
  if (!(group in en)) {
    console.warn(`Unknown translation group: ${group}`);
    return key;
  }
  
  // Get the translated text
  const translationGroup = en[group as keyof TranslationGroups];
  const translated = translationGroup[subKey];
  
  if (!translated) {
    console.warn(`Unknown translation key: ${key}`);
    return key;
  }
  
  // Replace parameters if necessary
  if (params) {
    return Object.entries(params).reduce(
      (text, [paramKey, paramValue]) => 
        text.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue)),
      translated
    );
  }
  
  return translated;
}

// Alias to simplify usage
export const t = translate;

// Export the dictionary and the function
export default { en, translate, t };
