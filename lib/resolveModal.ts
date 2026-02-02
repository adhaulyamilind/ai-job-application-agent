import { MODEL_FALLBACKS } from "./modelRegistry";
import { isModelAvailable } from "./isModelAvailable";

export async function resolveOllamaModel(preferredModel: string) {
  const candidates = [
    preferredModel,
    ...MODEL_FALLBACKS.ollama.filter(m => m !== preferredModel)
  ];

  for (const model of candidates) {
    const available = await isModelAvailable(model);

    if (available) {
      return {
        model,
        fallbackUsed: model !== preferredModel
      };
    }
  }

  throw new Error("No available Ollama models");
}
