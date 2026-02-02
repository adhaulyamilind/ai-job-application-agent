const TECH_KEYWORDS = [
    "react", "javascript", "typescript", "frontend",
    "backend", "java", "spring", "node",
    "api", "microservice", "system"
  ];
  
  export function isTechDomain(skills: string[]): boolean {
    return skills.some(skill =>
      TECH_KEYWORDS.some(k =>
        skill.toLowerCase().includes(k)
      )
    );
  }
  