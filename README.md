# Codex CLI

A lightweight command-line interface for interacting with AI models directly from your terminal, featuring a distinctive Matrix-inspired green interface.

## Features

- 🟢 Matrix-inspired green interface for commands, user messages, and loading indicators
- 🚀 Terminal-based UI for quick access and efficient workflow
- 💬 Natural conversation with AI models
- 🛠️ Slash command support for various features
- 🔌 Integration with Ollama for local models (Llama, Gemma, Mistral, etc.)
- 📁 Directory context for code-related assistance
- ⚡ Command execution with approval system
- 📄 File operations through natural conversation

## Installation

```bash
npm install -g eybo-codex-cli
```

## Usage

Launch the application with:

```bash
codex-cli
```

Once started, you can interact naturally with the AI assistant:

- "What files are in this directory?"
- "Explain the code in main.js"
- "Help me fix the compilation error in this project"

### Supported Commands

- `/clear` - Clear the current context
- `/help` - Display help information
- `/models` or `/m` - Manage Ollama models
- `/ollama` or `/o` - Configure Ollama integration
- `/history` - View command history

## Ollama Configuration

### Prerequisites

1. **Install Ollama**:
   - For macOS/Linux: `curl -fsSL https://ollama.com/install.sh | sh`
   - For Windows: Download from [Ollama's website](https://ollama.com/download)

2. **Start Ollama Service**:
   ```bash
   ollama serve
   ```
   Ollama runs by default on `http://localhost:11434`

### Setting Up Models

1. **Pull a model** (first time only):
   ```bash
   ollama pull llama3
   # Other popular models: cogito:8b, gemma3:4b, gemma3:12b, mistral-small3.1
   ```

2. **List available models**:
   ```bash
   ollama list
   ```

### Configuring Codex CLI for Ollama

Codex CLI can be configured through `~/.config/codex-cli/config.json`:

```json
{
  "providerType": "ollama",                    // Use Ollama as the provider
  "providerUrl": "http://localhost:11434",     // Ollama API endpoint
  "defaultModel": "cogito:8b",                 // Default model to use
  "approvalPolicy": "suggest",                 // Command approval policy
  "theme": "matrix"                            // Use Matrix theme
}
```

You can also specify these settings when launching:

```bash
codex-cli --provider ollama --model llama3
```

### Model Parameters

You can customize model parameters using the `/ollama` command within Codex CLI or by creating a `~/.ollama/config.json` file:

```json
{
  "models": {
    "cogito:8b": {
      "temperature": 0.7,
      "top_p": 0.9,
      "context_window": 8192
    }
  }
}
```

### Troubleshooting Ollama

- **Connection issues**: Ensure Ollama is running with `ps aux | grep ollama`
- **Model not found**: Verify the model is downloaded with `ollama list`
- **Slow responses**: Check system resources or try a smaller model
- **Permission errors**: Ensure proper permissions for the Ollama directories

## Configuration

Codex CLI can be configured through environment variables or a config file located at `~/.config/codex-cli/config.json`:

```json
{
  "providerType": "ollama",
  "providerUrl": "http://localhost:11434",
  "defaultModel": "cogito:8b",
  "approvalPolicy": "suggest",
  "theme": "matrix"
}
```

## What's New in Version 1.0.2

- 🟢 Matrix-style green interface for commands and system elements
- 🔄 Fixed Delete key behavior
- 🐳 Optimized Dockerfile for simpler deployment
- 📦 Improved stability and performance

## Contributing

We welcome contributions to Codex CLI! Whether it's adding new features, fixing bugs, or improving documentation, your help is appreciated.

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

Apache-2.0

---

<p align="center">
  <i>Take the green pill and see how deep the command line goes.</i>
</p>
