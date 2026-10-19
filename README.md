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

## Test set (batch evaluation)

`testset.csv` holds 15 tickets with the expected classification for each, in the columns `id, ticket, expected_category, expected_urgency, expected_sentiment`. Edit it freely; it's re-read on every run. Rows with values outside the allowed lists are skipped, with a warning.

In **Compare models**, click **Run test set**. Every ticket goes through the selected slots in the current mode (fair or end-to-end), with the same skip and invalid-format rules as a single run. Tickets run one at a time, so free-model rate limits are less likely to break the run, and a progress bar tracks the run. Within a ticket, the slots run in parallel.

- **Summary per model:** Layer 1 accuracy per field and for all three fields together, compared with the expected values. Invalid format and API errors count as wrong. It also shows the invalid-format rate (recoverable counted separately), the API error rate, total and average cost, average time per layer, and the average reply score.
- **Layer 1 per ticket:** the expected values next to each model's classification, with mismatches highlighted.
- **Layer 2 replies:** all replies for each ticket side by side, each with a 1–3 score using the rubric shown (accurate, tone, brief, no promises). Averages update as you score.
- **Export CSV:** one file with the run details, the summary and a per-ticket section (both layers, stats, replies and your scores).

Results live only in the open page: export before refreshing.

## Backup models and zero data retention

- **Backup model** (Single run only): pick an optional backup for each layer. The app sends OpenRouter a `models: [main, backup]` array ([model fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks)). If the main model fails, the backup answers and is billed, and the cell shows "Fallback used". A mistyped model ID is rejected outright, and the backup isn't tried.
- **Zero data retention (ZDR) only** (both views): sends `provider: { zdr: true }` ([provider routing](https://openrouter.ai/docs/features/provider-routing), [ZDR](https://openrouter.ai/docs/guides/features/zdr)), so only providers that don't retain your data are used. A model with no ZDR provider returns "No endpoints found matching your data policy". The per-request flag can only add the restriction; it can't override your account's privacy settings.
- **Demo:** turn on ZDR, set Layer 1 to the free Nemotron model and its backup to DeepSeek V4.1 Flash. Nemotron has no ZDR provider, so OpenRouter falls back to DeepSeek.

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

<!-- Filled in after running the test set. The exported CSV can live next to this README. -->

### Models tested

<!-- Which models were in which slot, the compare mode (fair or end-to-end), ZDR on or off, and the date of the run. -->

### Results

<!-- Key numbers from the summary table: accuracy per field and all-3, invalid-format rate (recoverable separately),
     cost per ticket, response time, and average reply score. Which tickets tripped models up? -->

### Decision per layer

#### Layer 1: classify

**Model:** <!-- chosen model -->

**Why:** <!-- accuracy vs cost vs speed vs format reliability -->

#### Layer 2: draft reply

**Model:** <!-- chosen model -->

**Why:** <!-- reply scores vs cost vs speed -->

### Why (overall)

<!-- What the trade-offs were, what surprised me, and what I would test next. -->
