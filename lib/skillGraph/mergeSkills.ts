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

export function skillsToConfidenceMap(
  skills: string[],
  confidence = 0.9
): Record<string, number> {
  return skills.reduce((acc, skill) => {
    acc[skill] = confidence;
    return acc;
  }, {} as Record<string, number>);
}


  