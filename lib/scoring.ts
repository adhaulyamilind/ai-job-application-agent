
type SkillMatchType = "EXACT" | "PARTIAL" | "TOKEN" | "NONE";

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function tokenize(s: string): string[] {
  return normalize(s).split(/\s+/);
}

function matchSkill(
  resumeSkill: string,
  jdSkill: string
): { type: SkillMatchType; weight: number } {
  const r = normalize(resumeSkill);
  const j = normalize(jdSkill);

  // 1️⃣ Exact
  if (r === j) {
    return { type: "EXACT", weight: 1.0 };
  }

  // 2️⃣ Substring
  if (r.includes(j) || j.includes(r)) {
    return { type: "PARTIAL", weight: 0.7 };
  }

  // 3️⃣ Token overlap
  const rTokens = tokenize(r);
  const jTokens = tokenize(j);

  const overlap = rTokens.filter(t => jTokens.includes(t));
  if (overlap.length > 0) {
    return { type: "TOKEN", weight: 0.4 };
  }

  return { type: "NONE", weight: 0 };
}

export function scoreDeterministic(
  resumeSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[]
) {
  let score = 0;
  const skillMatches: {
    required: string;
    matchedWith: string;
    type: SkillMatchType;
    weight: number;
  }[] = [];

  requiredSkills.forEach(req => {
    let bestMatch = { weight: 0, type: "NONE" as SkillMatchType, skill: "" };

    resumeSkills.forEach(rs => {
      const result = matchSkill(rs, req);
      if (result.weight > bestMatch.weight) {
        bestMatch = { ...result, skill: rs };
      }
    });

    if (bestMatch.weight > 0) {
      score += bestMatch.weight;
      skillMatches.push({
        required: req,
        matchedWith: bestMatch.skill,
        type: bestMatch.type,
        weight: bestMatch.weight
      });
    }
  });

  // Normalize to 100
  const normalizedScore = Math.round(
    (score / requiredSkills.length) * 100
  );

  return {
    score: Math.min(100, normalizedScore),
    skillMatches,
    missingSkills: requiredSkills.filter(
      r => !skillMatches.some(m => m.required === r)
    )
  };
}

function skillsMatch(resumeSkill: string, jdSkill: string): boolean {
  const r = normalize(resumeSkill);
  const j = normalize(jdSkill);

  // 1️⃣ Exact normalized match
  if (r === j) return true;

  // 2️⃣ Substring match (bounded)
  if (r.includes(j) || j.includes(r)) return true;

  // 3️⃣ Token overlap (at least one shared keyword)
  const rTokens = tokenize(r);
  const jTokens = tokenize(j);

  return rTokens.some(token => jTokens.includes(token));
}

