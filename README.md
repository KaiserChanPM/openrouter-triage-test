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

Open http://127.0.0.1:3000. The server only listens on your own machine. Without a key, the app runs in fake mode with canned responses. You can force fake mode with a key present: `FAKE=1 npm start`. Restart the server after changing `.env`.

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

A model ID that isn't in OpenRouter's catalogue shows as "⚠ … (not in OpenRouter catalogue)" in the dropdowns.

The dropdowns always include two **Test** models that the local server answers itself, with no API call and no cost. One always returns invalid JSON and the other returns recoverable JSON, so you can check how the app handles bad output.

## Compare mode

Switch to **Compare models** at the top of the page. Pick a **Reference** model (required) and up to two more models, then click Run. Results show as a grid: one column per model, with a Layer 1 row and a Layer 2 row. Every cell shows the provider OpenRouter routed that call to, because the same model can be served by different providers on different runs.

- **Fair layer test** (default): who writes the best reply from the same facts? Every model writes its reply from the Reference model's classification, so any difference between replies comes from the model itself. The classification row still shows what each model would have chosen. If the Reference classification is invalid, no replies are drafted.
- **End-to-end**: who handles the ticket best from start to finish? Each model classifies the ticket itself, then writes its reply from its own classification, mistakes included.
- Layer 1 fields that differ from the Reference are highlighted. 💲 marks the cheapest and ⚡ the fastest successful result in each row.

## What each stat means

| Stat | Source |
|---|---|
| Model | The model ID you picked. "Served as" appears if OpenRouter reports a different model in the response's `model` field. |
| Provider | The provider OpenRouter routed the request to, from [router metadata](https://openrouter.ai/docs/guides/features/router-metadata) (`X-OpenRouter-Metadata: enabled`). If that's missing, it falls back to [generation stats](https://openrouter.ai/docs/api-reference/get-a-generation). |
| Tokens | `usage.prompt_tokens` / `usage.completion_tokens`, counted with the model's own tokenizer, plus `completion_tokens_details.reasoning_tokens` when a model reports them ([usage accounting](https://openrouter.ai/docs/use-cases/usage-accounting)) |
| Cost | `usage.cost`, in dollars. OpenRouter credits use US dollars as their base currency. |
| Time | Wall-clock time of the API call, measured by the local server |
| Temp | The temperature sent. It's flagged when the model's catalogue entry doesn't list `temperature` as supported. |
| Format | Shown when `useStructuredOutputs` is on ([structured outputs](https://openrouter.ai/docs/features/structured-outputs)) |

Layer 1 output must be exactly a JSON object with the allowed values. Anything else is labelled **Invalid format**. If it would pass after removing code fences or lowercasing values, the label adds "(recoverable: …)". Either way, Layer 2 is skipped.

## Where to change the prompts

Both prompts are in `prompts.js`.

## How this was built

Built with Claude Code. I defined the scope, milestones and decisions.

## Findings

<!-- To fill in after testing models. -->
