import { NextResponse } from "next/server";
import { openai } from "@/lib/llm";

export async function POST(req: Request) {
  const { jdText } = await req.json();

  const prompt = `
Extract structured data from this job description.

Return ONLY valid JSON:
{
  "requiredSkills": string[],
  "preferredSkills": string[],
  "seniority": string,
  "keywords": string[]
}

Job Description:
"""
${jdText}
"""
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  return NextResponse.json(
    JSON.parse(response.choices[0].message.content!)
  );
}
