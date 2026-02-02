import { NextResponse } from "next/server";
import { runLLMWithFallback } from "@/lib/llm";

export async function POST(req: Request) {
  const { resumeText } = await req.json();

  const prompt = `
Extract this resume into JSON.
Return ONLY JSON:
{
  "summary": "",
  "skills": [],
  "experience": []
}

Resume:
${resumeText}
`;

  const output = await runLLMWithFallback(prompt);

  return NextResponse.json(JSON.parse(output));
}
