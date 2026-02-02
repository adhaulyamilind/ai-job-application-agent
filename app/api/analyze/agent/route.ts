import { NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { cosineSimilarity } from "@/lib/similarity";
import { scoreDeterministic } from "@/lib/scoring";
import { rewriteResumeBullets } from "@/lib/resumeRewrite";
import { isTechDomain } from "@/lib/domainGate";
import { inferSkillsFromResume } from "@/lib/inferSkills";
import { getDecisionExplanation } from "@/lib/decisionExplain";
import { runLLMWithFallback } from "@/lib/llm";



type Decision = "APPLY" | "REVIEW" | "SKIP";

export async function POST(req: Request) {
  try {
    const { model, resume, jd } = await req.json();
    const selectedModel =
      typeof model === "string"
        ? model
        : "ollama:qwen2.5:7b-instruct"; // default fallback

    const [provider, modelName] = selectedModel.split(/:(.+)/);

    const resolved = await runLLMWithFallback({
      // provider: provider as "ollama",
      preferredModel: modelName,
      dryRun: true
    });
    
    let modelInfo = resolved.modelInfo;
    
    

    if (!resume?.skills || !jd?.requiredSkills) {
      return NextResponse.json(
        { error: "Invalid input payload" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       1️⃣ Deterministic (ATS-style keyword scoring)
    -------------------------------------------------- */
    const deterministic = scoreDeterministic(
      resume.skills,
      jd.requiredSkills,
      jd.preferredSkills || []
    );

    /* --------------------------------------------------
       2️⃣ Semantic Scoring (SKILLS ONLY)
    -------------------------------------------------- */
    const resumeSkillsText = `
      Frontend skills and experience:
      ${resume.skills.join(", ")}
      `;

    const jdSkillsText = `
      Required frontend skills for this role:
      ${jd.requiredSkills.join(", ")}
    `;

    const isResumeTech = isTechDomain(resume.skills);

    if (!isResumeTech) {
      const { decisionReason, actionHint } =
        getDecisionExplanation("SKIP", {
          deterministic: deterministic.score,
          semantic: 0,
          missingSkills: jd.requiredSkills
        });
    
      return NextResponse.json({
        modelInfo,
        decision: "SKIP",
        decisionReason,
        actionHint,
        scores: {
          deterministic: deterministic.score,
          semanticSkills: 0,
          final: 0,
          improvedDeterministic: null
        },
        skillMatches: [],
        missingSkills: jd.requiredSkills,
        improvedResume: null,
        coverLetter: null
      });
    }
    

    const resumeEmbedding = await embedText(resumeSkillsText);
    const jdEmbedding = await embedText(jdSkillsText);

    const semanticSkillsScore = Math.round(
      cosineSimilarity(resumeEmbedding, jdEmbedding) * 100
    );

    /* --------------------------------------------------
       3️⃣ Final Combined Score
       (Explainable + Semantic)
    -------------------------------------------------- */
    let finalScore = Math.round(
      deterministic.score * 0.6 +
      semanticSkillsScore * 0.4
    );

    /* --------------------------------------------------
       4️⃣ Decision Logic (Growth-Oriented)
    -------------------------------------------------- */
    let decision: Decision;

    
    if (!isResumeTech) {
      decision = "SKIP";
    } else if (finalScore >= 70) {
      decision = "APPLY";
    } else if (
      semanticSkillsScore >= 70 &&
      deterministic.score >= 20
    ) {
      decision = "REVIEW";
    } else {
      decision = "SKIP";
    }
    
    /* --------------------------------------------------
       5️⃣ Agent Actions
    -------------------------------------------------- */
    let coverLetter: string | null = null;
    let improvedResume: string[] | null = null;
    let improvedDeterministicScore: number | null = null;


    
    /* -------- REVIEW FLOW -------- */
    if (decision === "REVIEW") {
      improvedResume = await rewriteResumeBullets({
        experience: resume.experience || [],
        missingSkills: deterministic.missingSkills
      });
    
      if (improvedResume.length > 0) {
    
        // 1️⃣ Infer skills from rewritten bullets
        const inferredSkills = inferSkillsFromResume(
          improvedResume,
          jd.requiredSkills
        );
    
        // 2️⃣ Merge skills (no duplicates)
        const combinedSkills = Array.from(
          new Set([...resume.skills, ...inferredSkills])
        );
    
        // 3️⃣ Re-score deterministically
        const improvedScore = scoreDeterministic(
          combinedSkills,
          jd.requiredSkills,
          jd.preferredSkills || []
        );
    
        improvedDeterministicScore = improvedScore.score;
    
        // 4️⃣ Recompute final score
        const improvedFinalScore = Math.round(
          improvedScore.score * 0.6 +
          semanticSkillsScore * 0.4
        );
    
        // 5️⃣ AUTO-FLIP TO APPLY
        if (improvedFinalScore >= 70) {
          decision = "APPLY";
          finalScore = improvedFinalScore;
        }
      }
    }

    /* -------- APPLY FLOW -------- */    
    if (decision === "APPLY" && !coverLetter) {
      const prompt = `
    Write a concise professional cover letter.
    
    Candidate:
    Senior frontend engineer with over 5 years of experience.
    
    Skills:
    ${resume.skills.join(", ")}
    
    Job requirements:
    ${jd.requiredSkills.join(", ")}
    
    Rules:
    - No placeholders
    - Factual
    - Senior, confident tone
    - 3 short paragraphs
    `;
    

    const llm = await runLLMWithFallback({
      // provider: provider as "ollama",
      preferredModel: modelInfo.model,
      prompt
    });
        
    coverLetter = llm.output;
    modelInfo = llm.modelInfo;
    }
    
    const { decisionReason, actionHint } = getDecisionExplanation(decision, {
      deterministic: deterministic.score,
      semantic: semanticSkillsScore,
      missingSkills: deterministic.missingSkills
    });


    /* --------------------------------------------------
       6️⃣ Final Response
    -------------------------------------------------- */
    return NextResponse.json({
      modelInfo,
      decision,
      decisionReason,
      actionHint,
      scores: {
        deterministic: deterministic.score,
        semanticSkills: semanticSkillsScore,
        final: finalScore,
        improvedDeterministic: improvedDeterministicScore
      },
      skillMatches: deterministic.skillMatches,
      missingSkills: deterministic.missingSkills,
      improvedResume,
      coverLetter
    });

  } catch (err: any) {
    console.error("AGENT ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
