function normalize(s: string) {
    return s.toLowerCase();
  }
  
  export function inferSkillsFromResume(
    rewrittenBullets: string[],
    jdRequiredSkills: string[]
  ): string[] {
  
    const inferred: string[] = [];
  
    rewrittenBullets.forEach(bullet => {
      jdRequiredSkills.forEach(skill => {
        if (
          normalize(bullet).includes(normalize(skill)) &&
          !inferred.includes(skill)
        ) {
          inferred.push(skill);
        }
      });
    });
  
    return inferred;
  }
  