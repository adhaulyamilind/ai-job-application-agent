const OLLAMA_URL = "http://localhost:11434";

export async function runOllama({
  model,
  prompt
}: {
  model: string;
  prompt: string;
}) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.2,
        top_p: 0.9
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Ollama generation failed for model: ${model}`);
  }

  const data = await res.json();

  if (!data.response) {
    throw new Error(`Empty response from model: ${model}`);
  }

  return {
    output: data.response
  };
}
