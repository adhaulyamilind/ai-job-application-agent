"use client";

import { useState } from "react";

export default function Page() {
  const [model, setModel] = useState(
    "ollama:qwen2.5:7b-instruct"
  );
  const [skills, setSkills] = useState("Next.js, frontend architecture");
  const [experience, setExperience] = useState(
    "Built React applications for a real estate platform\nWorked on frontend features and UI components"
  );
  const [jdSkills, setJdSkills] = useState(
    "React, Frontend architecture, UI optimization"
  );

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runAgent() {
    setLoading(true);

    const res = await fetch("/api/analyze/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        resume: {
          skills: skills.split(",").map(s => s.trim()),
          experience: experience.split("\n").map(e => e.trim())
        },
        jd: {
          requiredSkills: jdSkills.split(",").map(s => s.trim())
        }
      })
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-orange-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">AI Job Application Agent</h1>
          <p className="text-slate-900">
            See how the agent evaluates, improves, and applies — like a human recruiter.
          </p>
        </header>

        {/* AI Model Selector */}
        <div>
          <label className="text-sl font-large text-slate-900">AI Model</label>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="mt-1 w-full border rounded-lg p-2 text-slate-600"
          >
           <option value="ollama:qwen2.5:7b-instruct">
            Ollama · Qwen 2.5 (7B Instruct)
          </option>

          <option value="ollama:mistral:latest">
            Ollama · Mistral (latest)
          </option>

            <option value="openai:gpt-4o-mini">
              OpenAI · GPT-4o mini
            </option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* INPUTS */}
          <section className="bg-white p-6 rounded-xl shadow-sm space-y-4">
            <h2 className="font-semibold text-lg text-slate-900">Inputs</h2>

            <Input
              label="Your Skills (comma separated)"
              value={skills}
              onChange={setSkills}
            />

            <Textarea
              label="Experience (one bullet per line)"
              value={experience}
              onChange={setExperience}
            />

            <Input
              label="JD Required Skills"
              value={jdSkills}
              onChange={setJdSkills}
            />

            <button
              onClick={runAgent}
              disabled={loading}
              className="w-full py-2 bg-black text-white rounded-lg hover:bg-slate-800"
            >
              {loading ? "Analyzing…" : "Run Agent"}
            </button>
          </section>

          {/* OUTPUT */}
          <section className="space-y-6">
                    {result?.modelInfo && (
            <div className="text-xs text-slate-600">
              Model:
              <span className="font-medium text-slate-800">
                {result?.modelInfo.provider} · {result?.modelInfo.model}
              </span>

              {result?.modelInfo.fallbackUsed && (
                <span className="ml-2 text-orange-600">
                  (fallback)
                </span>
              )}
            </div>
          )}

            {result ? (
              <>
                <DecisionCard result={result} />
                <Scores scores={result.scores} />
                <SkillMatches matches={result.skillMatches} />
                <ResumeSuggestions bullets={result.improvedResume} />
                <CoverLetter letter={result.coverLetter} />
              </>
            ) : (
              <EmptyState />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

/* ---------------- UI COMPONENTS ---------------- */

function Input({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-900">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full border rounded-lg p-2 text-slate-900"
      />
    </div>
  );
}

function Textarea({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-900">{label}</label>
      <textarea
        rows={4}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full border rounded-lg p-2 text-slate-900"
      />
    </div>
  );
}

function DecisionCard({ result }: any) {
  const colors: any = {
    APPLY: "bg-green-50 border-green-400",
    REVIEW: "bg-yellow-50 border-yellow-400",
    SKIP: "bg-red-50 border-red-400"
  };

  return (
    <div className={`p-4 border-l-4 rounded-lg ${colors[result.decision]}`}>
      <h3 className="font-semibold text-lg text-slate-900">
        Decision: {result.decision}
      </h3>
      <p className="text-sm mt-1 text-slate-900">{result.decisionReason}</p>
      <p className="text-sm font-medium mt-1 text-slate-900">{result.actionHint}</p>
    </div>
  );
}

function Scores({ scores }: any) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm space-y-3 text-slate-900">
      <Score label="Deterministic (ATS)" value={scores?.deterministic} />
      <Score label="Semantic Match" value={scores?.semanticSkills} />
      <Score label="Final Score" value={scores?.final} />
    </div>
  );
}

function Score({ label, value }: any) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-900">{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 bg-slate-200 rounded">
        <div
          className="h-2 bg-black rounded"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SkillMatches({ matches }: any) {
  if (!matches?.length) return null;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <h3 className="font-semibold mb-2 text-slate-900">Skill Matches</h3>
      <div className="flex flex-wrap gap-2">
        {matches.map((m: any, i: number) => (
          <span key={i} className="px-2 py-1 bg-slate-100 rounded text-sm text-slate-900">
            {m.required} ← {m.matchedWith}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResumeSuggestions({ bullets }: any) {
  if (!bullets?.length) return null;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <h3 className="font-semibold mb-2 text-slate-900">Resume Improvements</h3>
      <ul className="list-disc pl-5 space-y-1 text-sm">
        {bullets.map((b: string, i: number) => (
          <li key={i} className="text-slate-900">{b}</li>
        ))}
      </ul>
    </div>
  );
}

function CoverLetter({ letter }: any) {
  if (!letter) return null;

  return (
    <details className="bg-white p-4 rounded-xl shadow-sm">
      <summary className="font-semibold cursor-pointer text-slate-900">
        Generated Cover Letter
      </summary>
      <pre className="mt-3 text-sm whitespace-pre-wrap text-slate-700">
        {letter}
      </pre>
    </details>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-slate-400">
      Run the agent to see results →
    </div>
  );
}
