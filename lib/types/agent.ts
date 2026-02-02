export interface AgentRequest {
    model: string;
    resume: {
      skills: string[];
      experience: string[];
    };
    jd: {
      requiredSkills: string[];
      preferredSkills?: string[];
    };
  }
  
  export interface ModelInfo {
    provider: string;
    model: string;
    location: "local" | "cloud";
    fallbackUsed: boolean;
  }
  
  export interface AgentResponse {
    modelInfo: ModelInfo;
    decision: "APPLY" | "REVIEW" | "SKIP";
    decisionReason: string;
    actionHint: string;
    scores: {
      deterministic: number;
      semanticSkills: number;
      final: number;
      improvedDeterministic: number | null;
    };
    skillMatches: any[];
    missingSkills: string[];
    improvedResume: string[] | null;
    coverLetter: string | null;
  }
  