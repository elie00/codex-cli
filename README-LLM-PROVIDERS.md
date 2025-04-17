# Utilisation de Codex CLI avec différents fournisseurs de modèles LLM

Codex CLI prend désormais en charge plusieurs fournisseurs de modèles de langage, ce qui vous permet d'utiliser des modèles locaux ou hébergés selon vos besoins :

- **OpenAI** (défaut) : Utilise les modèles d'OpenAI via leur API cloud
- **Ollama** : Permet d'utiliser des modèles locaux via [Ollama](https://ollama.com/)
- **Hugging Face** : Permet d'utiliser des modèles via [Text Generation Inference](https://github.com/huggingface/text-generation-inference)

## Installation des fournisseurs alternatifs

### Ollama

1. Installez Ollama depuis [https://ollama.com/download](https://ollama.com/download)
2. Téléchargez un modèle :
   ```bash
   ollama pull llama3
   ```
3. Lancez le serveur :
   ```bash
   ollama serve
   ```

### Hugging Face Inference Server

1. Installez Text Generation Inference :
   ```bash
   pip install text-generation-inference
   ```
2. Lancez le serveur avec un modèle :
   ```bash
   python -m text_generation_inference.server --model-id mistralai/Mistral-7B-Instruct-v0.2
   ```

## Utilisation

### OpenAI (par défaut)

```bash
$ codex "écris une fonction qui calcule le nombre de fibonacci"
```

### Ollama

```bash
$ codex --provider ollama --model llama3 "écris une fonction qui calcule le nombre de fibonacci"
```

Vous pouvez aussi spécifier une URL personnalisée pour le serveur Ollama :

```bash
$ codex --provider ollama --provider-url http://localhost:11434/api --model llama3 "écris une fonction qui calcule le nombre de fibonacci"
```

### Hugging Face

```bash
$ codex --provider huggingface --provider-url http://localhost:8080 --model mistral-7b-instruct "écris une fonction qui calcule le nombre de fibonacci"
```

## Configuration persistante

Vous pouvez configurer le fournisseur par défaut en modifiant le fichier de configuration dans `~/.codex/config.json` (ou `.yaml`) :

```json
{
  "model": "llama3",
  "providerType": "ollama",
  "providerUrl": "http://localhost:11434/api"
}
```

Ou en utilisant la commande de configuration :

```bash
$ codex config
```

Cela ouvrira votre éditeur par défaut pour modifier les instructions et vous pourrez également éditer manuellement le fichier de configuration.

## Modèles recommandés

### OpenAI
- o4-mini
- o3

### Ollama
- llama3
- llama2
- mistral

### Hugging Face
- mistral-7b-instruct
- gemma-7b-it

## Résolution des problèmes

Si vous rencontrez des erreurs :

1. Vérifiez que les services Ollama ou Hugging Face sont bien démarrés
2. Vérifiez les URLs des fournisseurs
3. Assurez-vous que les modèles demandés sont bien installés
4. Activez le mode debug pour voir les logs : `DEBUG=1 codex --provider ollama ...`

## Limitations

- Les fonctionnalités disponibles peuvent varier selon le fournisseur et le modèle utilisé
- Les modèles locaux peuvent être plus lents que les modèles d'OpenAI, mais offrent une confidentialité accrue
- Certains modèles peuvent ne pas supporter toutes les fonctionnalités de Codex, comme l'analyse de code complexe ou certaines commandes
