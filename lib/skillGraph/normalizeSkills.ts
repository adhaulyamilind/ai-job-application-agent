import { frontendSkills } from "./frontend";

export function normalizeSkills(rawSkills: string[]): string[] {
  const normalized = new Set<string>();

  for (const skill of rawSkills) {
    const s = skill.toLowerCase().trim();

    for (const node of Object.values(frontendSkills)) {
      if (
        node.displayName.toLowerCase() === s ||
        node.aliases.some(a => a.toLowerCase() === s)
      ) {
        normalized.add(node.id);
      }
    }
  }

  return Array.from(normalized);
}
