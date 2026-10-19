# OpenRouter Triage Test

A small local web app for learning how to test and switch AI models through [OpenRouter](https://openrouter.ai). You paste a customer support ticket, and two layers process it:

1. **Classify:** returns the category, urgency and sentiment as JSON.
2. **Draft reply:** writes a short reply for a support agent to review, using the ticket and the classification.

Each layer has its own model dropdown, and every run shows the model, the provider OpenRouter routed to, the tokens, the cost and the response time.

This is a learning tool. It runs locally for one user and is not meant to be deployed.

## Run it

Requires Node.js 22 or later. There are no dependencies to install.

```sh
cp .env.example .env      # then paste your OpenRouter API key into .env
npm start
```

Open http://127.0.0.1:3000. The server only listens on your own machine. Without a key, the app runs in fake mode with canned responses.

Your API key stays in the server process. The browser never sees it, and `.env` is git-ignored.

## Change models

Edit `models.json`:

```json
{
  "models": ["provider/model-id", "another/model-id"],
  "defaults": { "layer1": "provider/model-id", "layer2": "provider/model-id" },
  "temperature": { "layer1": 0, "layer2": 0.7 },
  "useStructuredOutputs": false
}
```

- `models`: OpenRouter model IDs, copied from https://openrouter.ai/models. Every dropdown reads this list.
- `defaults`: the model each dropdown selects first.
- `temperature`: sent with every call for that layer.
- `useStructuredOutputs`: when true, Layer 1 asks OpenRouter to enforce the JSON schema.

Save the file and refresh the page. You don't need to restart the server.

## Where to change the prompts

Both prompts are in `prompts.js`.

## How this was built

Built with Claude Code. I defined the scope, milestones and decisions.

## Findings

<!-- To fill in after testing models. -->
