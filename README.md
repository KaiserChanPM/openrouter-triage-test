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

- **Fair layer test** (default): who writes the best reply from the same facts? Every model writes its reply from the same classification, so any difference between replies comes from the model itself. The classification row still shows what each model would have chosen.
  - Test-set runs use the expected classification from `testset.csv`. An invalid Reference classification never blocks these replies.
  - Single runs (a pasted or sample ticket) have no expected values, so they use the Reference model's classification. If it is invalid, no replies are drafted.
- **End-to-end**: who handles the ticket best from start to finish? Each model classifies the ticket itself, then writes its reply from its own classification, mistakes included.
- Layer 1 fields that differ from the Reference are highlighted. 💲 marks the cheapest and ⚡ the fastest successful result in each row.
- Every reply names its source: "Expected (test set)", "Reference model" or "Own classification".

## Test set (batch evaluation)

`testset.csv` holds 15 tickets with the expected classification for each, in the columns `id, ticket, expected_category, expected_urgency, expected_sentiment`. Edit it freely; it's re-read on every run. Rows with values outside the allowed lists are skipped, with a warning.

In **Compare models**, click **Run test set**. Every ticket goes through the selected slots in the current mode (fair or end-to-end). In Fair mode, replies use the expected classification and are never blocked by an invalid Reference. End-to-end keeps the single-run skip rules: a model's reply is skipped when its own Layer 1 is invalid or fails. Tickets run one at a time, so free-model rate limits are less likely to break the run, and a progress bar tracks the run. Within a ticket, the slots run in parallel, and each model's reply starts after its own Layer 1 finishes.

- **Summary per model:** Layer 1 accuracy per field and for all three fields together, compared with the expected values. Invalid format and API errors count as wrong. It also shows the invalid-format rate (recoverable counted separately), the API error rate, total and average cost, average time per layer, and the average reply score.
- **Layer 1 per ticket:** the expected values next to each model's classification, with mismatches highlighted.
- **Layer 2 replies:** all replies for each ticket side by side, each with a 1–3 score using the rubric shown (accurate, tone, brief, no promises). Averages update as you score.
  - The reply rubric is the general open-ended rubric adapted for support replies.
- **Export CSV:** one file with the run details, the summary and a per-ticket section (both layers, the reply source and the classification it used, stats, replies and your scores).

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

Layer 1 output must be exactly a JSON object with the allowed values. Anything else is labelled **Invalid format**. If it would pass after removing code fences or lowercasing values, the label adds "(recoverable: …)". Either way, any reply that depends on that classification is skipped.

## Where to change the prompts

Both prompts are in `prompts.js`.

## How this was built

Built with Claude Code. I defined the scope, milestones and decisions.

## How this follows the workflow

This repo applies an 11-step workflow for choosing a model for each AI step in a feature. The numbers below are example targets for a learning project.

| Step | What it means here | Where to find it |
|---|---|---|
| 1. Map the journey | Two AI steps: classify, then draft a reply. Classify needs AI because tickets are free text and urgency depends on business impact, not on how the customer sounds. Keyword rules miss a polite message about a team-wide outage, and a category dropdown would not cover urgency or sentiment. Draft needs AI because replying to every issue raised is writing work that fixed templates can't cover. A person reviews every draft. | This README |
| 2. Set the bar | Classify: all three fields correct on at least 85% of tickets and urgency correct on at least 90%. No high-urgency ticket classified as low. No invalid outputs (recoverable allowed). Under $0.005 and 3 seconds per ticket. Draft reply: average reply score at least 2.5 of 3, and no reply scoring 1 on "no promises". Under $0.02 and 10 seconds per reply. The classify bar is stricter because it runs on every ticket with no one checking it, while every draft is reviewed by a person. | This README |
| 3. Set the constraints | Privacy: the test tickets are made up, so zero data retention is not required for this test. A real product with customer tickets would require it, which would rule out the free model in `models.json` (it has no ZDR provider; see the ZDR demo). Budget: an assumed 2,000 tickets a month and a $50 monthly budget. That allows $0.025 per ticket across both layers and sets the cost bars in step 2. | This README; the ZDR option in the app |
| 4. Write the prompt | Both prompts, including the urgency definitions based on business impact. | `prompts.js` |
| 5. Build the test set | 15 tickets with expected values, including hard cases such as an angry customer with a minor issue, a polite message hiding an outage and two issues in one ticket. | `testset.csv` |
| 6. Shortlist | Four models across price tiers, from free to premium. | `models.json` |
| 7. Run the full test | Compare mode test-set runs: one ticket at a time, a fixed temperature per layer (0 for classify), Fair layer test or End-to-end. | The app |
| 8. Score | The summary: accuracy per field and for all three, invalid and recoverable format rate, cost and time. Plus 1 to 3 reply scores. | The app and the CSV export |
| 9. Decide and record | DeepSeek V4.1 Flash for both layers, with Claude Sonnet 5.5 as the reply backup. The classify choice is provisional until a rerun. | Findings, below |
| 10. Design for when AI is wrong, and 11. Ship, measure and retest | Not applicable. This is a local learning tool, not a shipped feature. | |

## Findings

This section covers steps 7 to 9 of the workflow above, judged against the bars in step 2.

### Test runs

Two test-set runs on 21 October 2026 (UTC), in Fair layer test mode with zero data retention off. Compare mode takes three models at a time, so the four shortlisted models needed two runs, with Nemotron and Claude in both.

- **Run 1:** Nemotron 3 Ultra (free, Reference), DeepSeek V4.1 Flash, Claude Sonnet 5.5. Results: [`test-set-2026-10-21-01-40.csv`](test-set-2026-10-21-01-40.csv)
- **Run 2:** Nemotron 3 Ultra (free, Reference), Gemini 3.8 Flash, Claude Sonnet 5.5. Results: [`test-set-2026-10-21-01-57.csv`](test-set-2026-10-21-01-57.csv)

In Fair mode every reply was written from the test set's expected classification, so the reply results compare writing only. Claude Sonnet 5.5 ignores the temperature setting. Nemotron and Claude gave the same Layer 1 answers in both runs.

Reply scores use the rubric described under "Test set" above, scored by one reviewer. Costs are OpenRouter's reported cost per request and leave out the platform fee on credit purchases.

### Results

**Layer 1: classify**

| Model | Category | Urgency | Sentiment | All 3 | High marked low | Invalid format | Cost per ticket | Avg time |
|---|---|---|---|---|---|---|---|---|
| Nemotron 3 Ultra (free) | 100% | 87% | 87% | 73% | 0 | 0% | $0 | 2.7–2.9 s |
| DeepSeek V4.1 Flash | 100% | 93% | 87% | 80% | 0 | 0% | $0.00012 | 1.3 s |
| Gemini 3.8 Flash | 100% | 93% | 87% | 80% | 0 | 0% | $0.00134 | 4.0 s |
| Claude Sonnet 5.5 | 100% | 93% | 80% | 73% | 0 | 0% | $0.00112 | 1.2–1.6 s |

**Layer 2: draft reply**

| Model | Avg reply score | Replies scored 1 | Cost per reply | Avg time (slowest) |
|---|---|---|---|---|
| Nemotron 3 Ultra (free) | 2.27 (run 1), 2.20 (run 2) | 4, then 5 | $0 | 7.2–8.9 s (59.8 s) |
| DeepSeek V4.1 Flash | 2.87 | 0 | $0.00042 | 4.0 s (10.2 s) |
| Gemini 3.8 Flash | 2.87 | 0 | $0.00317 | 7.5 s (16.9 s) |
| Claude Sonnet 5.5 | 3.00 | 0 | $0.00277 | 2.4–2.5 s (4.4 s) |

**Against the bars in step 2**

- **Layer 1:** no model reached 85% on all three fields; the best was 80%. DeepSeek, Gemini and Claude cleared the urgency bar (90%); Nemotron didn't. No model marked a high-urgency ticket low, and none returned invalid output. Every model was under $0.005 per ticket. Gemini missed the 3-second bar.
- **Layer 2:** DeepSeek, Gemini and Claude cleared the reply bar (average 2.5 or higher, no reply scoring 1 on "no promises"). Nemotron didn't. All were under $0.02 per reply. On average all were under 10 seconds, but Nemotron and Gemini each had replies well over it.

### Decision per layer

#### Layer 1: classify

**Model:** DeepSeek V4.1 Flash, provisional.

**Why:** No model cleared every Layer 1 bar, so strictly none qualifies yet. DeepSeek tied for best on all three fields (80%) and on urgency (93%), made no costly mistake and returned no invalid output. It is about 11 times cheaper than Gemini, the other model tied for best, and three times faster. Gemini also missed the time bar. Before making this final, I'll fix the two problems the test exposed: ticket 1's expected urgency contradicts the prompt's own rule, and the prompt doesn't define sentiment. Then I'll rerun all models on the same test set.

#### Layer 2: draft reply

**Model:** DeepSeek V4.1 Flash. **Backup:** Claude Sonnet 5.5.

**Why:** Nemotron is ruled out: it averaged 2.2 and invented facts in 4 to 5 replies per run. DeepSeek, Gemini and Claude all cleared every Layer 2 bar, so I chose the cheapest. DeepSeek costs $0.00042 per reply, against $0.00277 for Claude and $0.00317 for Gemini. Claude scored higher (3.00 against 2.87), but that small gain isn't worth more than six times the cost on a step where a person reviews every draft. Claude is the backup because it cleared the same bars and comes from a different model maker. Both layers on DeepSeek cost about $0.00055 per ticket, or about $1.10 a month at 2,000 tickets, well inside the $50 budget. DeepSeek's calls in this test went to nine different providers, so in production I'd pin it to one and retest on that provider.

### What the test taught me

- **The biggest misses were in my setup, not the models.** All four models rated ticket 1 medium urgency; my test set says low, but my own prompt defines that case as medium. Most other misses were sentiment, which the prompt never defines. *(Workflow steps 4 and 5: write the prompt and answer key carefully, and read the misses before blaming a model.)*
- **A cheap model matched premium ones on the narrow task.** DeepSeek tied the best classification results at about a tenth of the cost. *(Rule of thumb: test before assuming premium wins.)*
- **Free wasn't free for writing.** Nemotron classified reasonably but invented facts in its replies, such as "We've corrected this". *(This is why step 1 has a person review every draft.)*
- **Next:** correct ticket 1, define sentiment, and rerun; pin DeepSeek to one provider; add tickets near the medium/high urgency line.
