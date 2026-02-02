function extractMostRecentYear(text: string): number | null {
    const years = text.match(/\b(19|20)\d{2}\b/g);
    if (!years) return null;
    return Math.max(...years.map(y => parseInt(y, 10)));
  }
  
  function computeRecencyMultiplier(year: number): number {
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
  
    if (age <= 2) return 1.0;
    if (age <= 5) return 0.85;
    if (age <= 8) return 0.7;
    return 0.5;
  }
  
  export function applyRecencyDecay(
    inferred: Record<string, number>,
    experience: string[]
  ): Record<string, number> {
    let mostRecentYear: number | null = null;
  
    for (const bullet of experience) {
      const year = extractMostRecentYear(bullet);
      if (year) {
        mostRecentYear = Math.max(mostRecentYear ?? year, year);
      }
    }
  
    // No dates found → no decay
    if (!mostRecentYear) return inferred;
  
    const multiplier = computeRecencyMultiplier(mostRecentYear);
  
    const adjusted: Record<string, number> = {};
    for (const [skill, confidence] of Object.entries(inferred)) {
      adjusted[skill] = Math.round(confidence * multiplier * 100) / 100;
    }
  
    return adjusted;
  }
  