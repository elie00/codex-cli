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