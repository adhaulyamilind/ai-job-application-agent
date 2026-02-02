import { MODEL_FALLBACKS } from "./modelRegistry";
import { runOllama } from "./runOllama";

/* --------------------------------------------------
   Types
-------------------------------------------------- */

type DryRunArgs = {
  preferredModel: string;
  dryRun: true;
};

type RunArgs = {
  preferredModel: string;
  prompt: string;
  dryRun?: false;
};

type RunLLMArgs = DryRunArgs | RunArgs;

/* --------------------------------------------------
   Helper: attempt model execution safely
-------------------------------------------------- */

async function tryRunModel(
  model: string,
  prompt: string
): Promise<{ output: string } | null> {
  try {
    return await runOllama({ model, prompt });
  } catch (err) {
    console.warn(`[LLM] Model failed: ${model}`);
    return null;
  }
}

/* --------------------------------------------------
   Public API
-------------------------------------------------- */

export async function runLLMWithFallback(
  params: RunLLMArgs
) {
  /* ---------- DRY RUN ---------- */
  // Dry run only reflects user choice (no resolution)
  if ("dryRun" in params && params.dryRun) {
    return {
      output: null,
      modelInfo: {
        provider: "ollama",
        model: params.preferredModel,
        location: "local",
        fallbackUsed: false
      }
    };
  }

  /* ---------- REAL GENERATION ---------- */
  const modelsToTry = [
    params.preferredModel,
    ...MODEL_FALLBACKS.ollama.filter(m => m !== params.preferredModel)
  ];

  for (const model of modelsToTry) {
    const result = await tryRunModel(model, params.prompt);

    if (result) {
      return {
        output: result.output,
        modelInfo: {
          provider: "ollama",
          model,
          location: "local",
          fallbackUsed: model !== params.preferredModel
        }
      };
    }
  }

  throw new Error("All models failed to generate output");
}
