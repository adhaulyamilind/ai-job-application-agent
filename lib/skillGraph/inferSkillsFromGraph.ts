import { frontendSkills } from "./frontend";

export function inferSkillsFromGraph(
  explicitSkillIds: string[]
): Record<string, number> {
  const inferred: Record<string, number> = {};

  const edges = [
    { from: "nextjs", to: "react", weight: 0.9 },
    { from: "ui-optimization", to: "react", weight: 0.7 },
    { from: "frontend-architecture", to: "react", weight: 0.6 }
  ];

  for (const edge of edges) {
    if (explicitSkillIds.includes(edge.from)) {
      inferred[edge.to] = Math.max(
        inferred[edge.to] || 0,
        edge.weight
      );
    }
  }

  return inferred;
}

