import { NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { cosineSimilarity } from "@/lib/similarity";
import { scoreDeterministic } from "@/lib/scoring";
import { rewriteResumeBullets } from "@/lib/resumeRewrite";
import { isTechDomain } from "@/lib/domainGate";
import { inferSkillsFromResume } from "@/lib/inferSkills";
import { getDecisionExplanation } from "@/lib/decisionExplain";
import { runLLMWithFallback } from "@/lib/llm";

import { normalizeSkills } from "@/lib/skillGraph/normalizeSkills";
import { inferSkillsFromGraph } from "@/lib/skillGraph/inferSkillsFromGraph";
import { mergeExplicitAndInferredSkills, skillsToConfidenceMap } from "@/lib/skillGraph/mergeSkills";
import { applyEvidenceToInferredSkills } from "@/lib/skillGraph/applyEvidence";
import { applyRecencyDecay } from "@/lib/skillGraph/applyRecencyDecay";

/* ---------------- CORS ---------------- */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key"
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/* ---------------- TYPES ---------------- */

type Decision = "APPLY" | "REVIEW" | "SKIP";

/* ---------------- ROUTE ---------------- */

export async function POST(req: Request) {
  try {
    const { model, resume, jd } = await req.json();

    /* -------- AUTH -------- */
    const API_KEY = process.env.AGENT_API_KEY;
    const key = req.headers.get("x-api-key");

    if (!API_KEY || key !== API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!resume?.skills || !jd?.requiredSkills) {
      return NextResponse.json(
        { error: "Invalid input payload" },
        { status: 400, headers: corsHeaders }
      );
    }

    /* -------- MODEL RESOLUTION -------- */
    const selectedModel =
      typeof model === "string"
        ? model
        : "ollama:qwen2.5:7b-instruct";

    const [, modelName] = selectedModel.split(/:(.+)/);

    const resolved = await runLLMWithFallback({
      preferredModel: modelName,
      dryRun: true
    });

    let modelInfo = resolved.modelInfo;

    /* =====================================================
       B1 — SKILL GRAPH PIPELINE
    ===================================================== */

    // 1️⃣ Normalize explicit skills (STRINGS → IDs)
    const explicitSkillIds = normalizeSkills(resume.skills);

    // 2️⃣ Infer related skills from graph
    const inferredSkillsMap = inferSkillsFromGraph(explicitSkillIds);

    // 3️⃣ Boost confidence if resume text supports it
    const evidenceAdjusted = applyEvidenceToInferredSkills(
      inferredSkillsMap,
      resume.experience || []
    );

    // 4️⃣ Apply recency decay
    const recencyAdjusted = applyRecencyDecay(
      evidenceAdjusted,
      resume.experience || []
    );

    // 5️⃣ Merge explicit (confidence = 1) + inferred
    const enrichedSkills = mergeExplicitAndInferredSkills(
      explicitSkillIds,
      recencyAdjusted
    );
    // enrichedSkills: { skill: string; confidence: number }[]

    /* =====================================================
       DETERMINISTIC SCORING (CONFIDENCE-AWARE)
    ===================================================== */

    const normalizedJDRequiredSkills = normalizeSkills(jd.requiredSkills);
    const normalizedJDPreferredSkills = normalizeSkills(jd.preferredSkills || []);

    const deterministic = scoreDeterministic(
      enrichedSkills,
      normalizedJDRequiredSkills,
      normalizedJDPreferredSkills
    );

    /* =====================================================
       DOMAIN GATE
    ===================================================== */

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
      }, { headers: corsHeaders });
    }

    /* =====================================================
       SEMANTIC SCORING (UNCHANGED)
    ===================================================== */

    const resumeSkillsText = `
Frontend skills and experience:
${resume.skills.join(", ")}
    `;

    const jdSkillsText = `
Required frontend skills for this role:
${jd.requiredSkills.join(", ")}
    `;

    const resumeEmbedding = await embedText(resumeSkillsText);
    const jdEmbedding = await embedText(jdSkillsText);

    const semanticSkillsScore = Math.round(
      cosineSimilarity(resumeEmbedding, jdEmbedding) * 100
    );

    /* =====================================================
       FINAL SCORE + DECISION
    ===================================================== */

    let finalScore = Math.round(
      deterministic.score * 0.6 +
      semanticSkillsScore * 0.4
    );

    let decision: Decision;

    if (finalScore >= 70) {
      decision = "APPLY";
    } else if (semanticSkillsScore >= 70 && deterministic.score >= 20) {
      decision = "REVIEW";
    } else {
      decision = "SKIP";
    }

    /* =====================================================
       AGENT ACTIONS
    ===================================================== */

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
        // ⚠️ inferSkillsFromResume expects RAW STRINGS
        const inferredFromRewrite = inferSkillsFromResume(
          improvedResume,
          jd.requiredSkills
        );

        const rewrittenSkillIds = normalizeSkills(inferredFromRewrite);

        const rewrittenSkillMap = skillsToConfidenceMap(
          rewrittenSkillIds,
          0.9 // rewritten evidence is strong but not explicit
        );
        
        const rewrittenMerged = mergeExplicitAndInferredSkills(
          explicitSkillIds,
          rewrittenSkillMap
        );
        
        const improvedScore = scoreDeterministic(
          rewrittenMerged,
          normalizedJDRequiredSkills,
          normalizedJDPreferredSkills
        );

        improvedDeterministicScore = improvedScore.score;

        const improvedFinal = Math.round(
          improvedScore.score * 0.6 +
          semanticSkillsScore * 0.4
        );

        if (improvedFinal >= 70) {
          decision = "APPLY";
          finalScore = improvedFinal;
        }
      }
    }

    /* -------- APPLY FLOW -------- */
    if (decision === "APPLY") {
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

    /* =====================================================
       RESPONSE
    ===================================================== */

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
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error("AGENT ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
