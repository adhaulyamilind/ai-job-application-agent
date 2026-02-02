import { runLLMWithFallback } from "@/lib/llm";

export async function rewriteResumeBullets({
  experience,
  missingSkills
}: {
  experience: string[];
  missingSkills: string[];
}): Promise<string[]> {

  if (!Array.isArray(experience) || experience.length === 0) {
    return [];
  }

  const prompt = `
You are a professional resume editor.

Your task is to IMPROVE wording, not invent experience.

You ARE allowed to:
- Rephrase existing bullets
- Highlight structure, maintainability, scalability, or performance IF IMPLIED
- Use careful language such as:
  "contributed to", "supported", "helped improve", "worked on"

You are NOT allowed to:
- Claim ownership of architecture decisions
- Invent technologies, frameworks, or tools
- Invent job titles, companies, or timelines
- Add skills that are not reasonably implied

Original resume bullets:
${experience.map(b => `- ${b}`).join("\n")}

Target skills to gently reflect (only if safe):
${missingSkills.join(", ")}

Rules:
- Keep bullets ATS-friendly
- Each bullet max 1–2 lines
- If no safe rewrite is possible, return []

Return ONLY a JSON array of STRINGS.
`;

  let parsed: unknown;

  try {
    const response = await runLLMWithFallback({
      preferredModel: "qwen2.5:7b-instruct",
      prompt
    });
    
    if (!response.output) {
      throw new Error("LLM returned empty output");
    }
    
    parsed = JSON.parse(response.output);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  // 🔒 HARD SAFETY FILTER (keep this!)
  const forbiddenWords = [
    "java",
    "spring",
    "microservice",
    "backend",
    "node",
    "api",
    "database",
    "company",
    "corporation"
  ];

  return parsed
    .filter(item => typeof item === "string")
    .filter(bullet =>
      !forbiddenWords.some(word =>
        bullet.toLowerCase().includes(word)
      )
    );
}
