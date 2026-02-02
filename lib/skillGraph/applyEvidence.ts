export function applyEvidenceToInferredSkills(
    inferred: Record<string, number>,
    experience: string[]
  ): Record<string, number> {
    const updated = { ...inferred };
  
    for (const bullet of experience) {
      const text = bullet.toLowerCase();
  
      for (const skill of Object.keys(updated)) {
        if (text.includes(skill)) {
          updated[skill] = Math.min(updated[skill] + 0.2, 1);
        }
  
        if (
          text.includes("built") ||
          text.includes("designed") ||
          text.includes("optimized")
        ) {
          updated[skill] = Math.min(updated[skill] + 0.1, 1);
        }
  
        if (
          text.includes("assisted") ||
          text.includes("exposed")
        ) {
          updated[skill] = Math.max(updated[skill] - 0.1, 0.3);
        }
      }
    }
  
    return updated;
  }
  