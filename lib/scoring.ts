type SkillConfidence = {
  skill: string;
  confidence: number; // 0–1
};

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function tokenize(s: string): string[] {
  return normalize(s).split(/\s+/);
}

function matchSkill(
  resumeSkill: SkillConfidence,
  jdSkill: string
): number {
  const resumeTokens = tokenize(resumeSkill.skill);
  const jdTokens = tokenize(jdSkill);

  const overlap = resumeTokens.filter(t =>
    jdTokens.includes(t)
  ).length;

  if (overlap === 0) return 0;

  // confidence-weighted match
  return (overlap / jdTokens.length) * resumeSkill.confidence;
}

export function scoreDeterministic(
  resumeSkills: SkillConfidence[],
  required: string[],
  preferred: string[] = []
) {
  let score = 0;
  const skillMatches: any[] = [];
  const missingSkills: string[] = [];

  required.forEach(req => {
    let bestMatch = 0;
    let matchedWith: string | null = null;

    resumeSkills.forEach(resumeSkill => {
      const m = matchSkill(resumeSkill, req);
      if (m > bestMatch) {
        bestMatch = m;
        matchedWith = resumeSkill.skill;
      }
    });

    if (bestMatch > 0 && matchedWith) {
      score += (100 / required.length) * bestMatch;
      skillMatches.push({
        required: normalize(req),
        matchedWith: normalize(matchedWith),
        type: bestMatch === 1 ? "EXACT" : "INFERRED",
        weight: bestMatch
      });
    } else {
      missingSkills.push(req);
    }
  });

  return {
    score: Math.round(score),
    skillMatches,
    missingSkills
  };
}
