export function mergeExplicitAndInferredSkills(
  explicit: string[],
  inferred: Record<string, number>
) {
  const result: {
    skill: string;
    confidence: number;
    source: "explicit" | "inferred";
  }[] = [];

  for (const skill of explicit) {
    result.push({
      skill,
      confidence: 1,
      source: "explicit"
    });
  }

  for (const [skill, confidence] of Object.entries(inferred)) {
    if (!explicit.includes(skill)) {
      result.push({
        skill,
        confidence,
        source: "inferred"
      });
    }
  }

  return result;
}

  