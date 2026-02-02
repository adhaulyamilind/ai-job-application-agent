export function getDecisionExplanation(
    decision: "APPLY" | "REVIEW" | "SKIP",
    context: {
      deterministic: number;
      semantic: number;
      missingSkills: string[];
    }
  ) {
    if (decision === "APPLY") {
        const hasGaps = context.missingSkills.length > 0;
      
        return {
          decisionReason:
            "Strong frontend alignment with sufficient explicit and inferred skills.",
          actionHint: hasGaps
            ? `You can apply confidently. Be ready to discuss: ${context.missingSkills.join(
                ", "
              )}.`
            : "You can apply confidently. Your profile aligns well with the role."
        };
      }
  
    if (decision === "REVIEW") {
      return {
        decisionReason:
          "Good role fit, but resume wording does not fully reflect all required skills.",
        actionHint:
          `Consider improving your resume by highlighting: ${context.missingSkills.join(
            ", "
          )}.`
      };
    }
  
    return {
      decisionReason:
        "Resume does not align with the core requirements of this role.",
      actionHint:
        "Consider applying to roles that better match your current experience."
    };
  }
  