# 🗺️ Roadmap Task Batches (B2 → B5)

Batches are ordered by priority. Each batch is a coherent set of tasks you can implement in one sprint.

---

## 🔥 Phase 1 — Make it generic

### **Batch 1.1 — B2.1 Resume & JD parsing (core)**

| # | Task | Notes |
|---|------|------|
| 1 | **PDF text extraction** | Use `pdf-parse` or `pdfjs-dist`; layout-aware where possible. |
| 2 | **DOCX extraction** | Use `mammoth` (text) or `docx` for structured content. |
| 3 | **Plain text ingestion** | Accept raw string; optional section detection via headers/bullets. |
| 4 | **Section parser** | From raw text → `{ skills?, experience?, responsibilities?, education? }`. Heuristics: "Skills", "Experience", "Responsibilities" headers; bullet lists; regex for dates. |
| 5 | **Output schema** | `{ rawText: string, sections: { skills?: string[], experience?: string[], responsibilities?: string[] } }`. |
| 6 | **Upload API** | New route e.g. `POST /api/ingest/resume` and `POST /api/ingest/jd`; accept `multipart/form-data` (file) or JSON `{ content: string, type: 'pdf' \| 'docx' \| 'text' }`. |
| 7 | **(Optional) OCR for scanned PDFs** | Tesseract.js or external OCR API; trigger when text extraction yields too few characters. |

**Deliverable:** Any resume/JD (PDF, DOCX, text) → normalized `rawText` + `sections` for the rest of the pipeline.

---

### **Batch 1.2 — B2.2 Domain detection**

| # | Task | Notes |
|---|------|------|
| 1 | **Domain enum** | `tech \| finance \| government \| operations \| sales \| blueCollar \| creative \| other`. |
| 2 | **Keyword clusters per domain** | Curate keyword lists (e.g. tech: "react", "api"; finance: "compliance", "trading"; gov: "policy", "federal"). |
| 3 | **Rule-based classifier** | Score JD + resume text against each cluster; pick domain with highest score; optional confidence threshold. |
| 4 | **Embedding classifier (optional)** | Embed job title + JD snippet; compare to precomputed domain centroid embeddings; blend with keyword score. |
| 5 | **Hybrid decision** | `domain = argmax(α * keywordScore + (1-α) * embeddingScore)`; fallback to `other` if low confidence. |
| 6 | **Wire into agent** | Pass `domain` from ingestion into agent; use it to select skill graph and (later) scoring rules. |

**Deliverable:** Every request gets a `domain` (and optional confidence). Agent branches on domain for graph and rules.

---

### **Batch 1.3 — B2.3 Universal skill extraction**

| # | Task | Notes |
|---|------|------|
| 1 | **Skill extraction from text** | Use sections (skills, experience, responsibilities). For skills section: split by comma/semicolon/line. For experience/responsibilities: NER-style keywords or domain dictionary match. |
| 2 | **Domain-specific vocabularies** | Map phrases to canonical skill IDs per domain (e.g. tech: existing frontend graph; finance: "branch operations" → banking-ops; logistics: "route handling" → route-handling). |
| 3 | **Normalize to internal IDs** | Reuse/extend `normalizeSkills` to accept domain and use the right graph or vocabulary. |
| 4 | **Output** | List of `{ skillId, source: 'explicit' \| 'inferred', snippet? }` so B1 pipeline (infer, evidence, recency, merge) stays unchanged. |
| 5 | **Remove dependency on user-typed skills** | Agent input becomes parsed resume + parsed JD; skills come from extraction, not from a single "skills" text field. |

**Deliverable:** Any resume/JD (after B2.1) and domain (after B2.2) → extracted skills normalized to internal IDs; pipeline works for any domain.

---

## 🔥 Phase 2 — Make it premium

### **Batch 2.1 — B3.1 Multi-axis scoring**

| # | Task | Notes |
|---|------|------|
| 1 | **Define axes** | `skillFit`, `seniority`, `responsibilityOverlap`, `tools`, `domain`, `recency`, `depth`. Each axis 0–100. |
| 2 | **Skill fit** | Current deterministic + semantic combo → keep as `skillFit` (or split deterministic/semantic into sub-scores). |
| 3 | **Seniority** | Infer level from years of experience + titles (e.g. "Senior", "Lead"); compare to JD level; score overlap. |
| 4 | **Responsibility overlap** | Compare JD responsibilities vs resume experience bullets (keyword or embedding overlap). |
| 5 | **Tools** | Explicit tool/tech match (from skill graph + JD required tools). |
| 6 | **Domain** | Sector match (from B2.2 domain vs JD domain). |
| 7 | **Recency** | Already have recency decay; expose as a 0–100 axis (e.g. based on latest experience year). |
| 8 | **Depth** | Ownership vs support from evidence (e.g. "led" vs "assisted"); score 0–100. |
| 9 | **API** | Extend `scores` to e.g. `scores: { skillFit, seniority, responsibilityOverlap, tools, domain, recency, depth, final? }`. Optional: single `final` = weighted sum. |

**Deliverable:** Response includes multi-axis scores; UI can show radar or bar chart.

---

### **Batch 2.2 — B3.2 Evidence-weighted scoring**

| # | Task | Notes |
|---|------|------|
| 1 | **Weight tiers** | Explicit experience > inferred > keyword-only. Assign weights (e.g. 1.0, 0.7, 0.4) per skill contribution. |
| 2 | **Recency weights** | Already in B1; ensure they feed into axis scores (e.g. recency axis, skill fit). |
| 3 | **Ownership vs support** | From evidence (e.g. "led", "owned" vs "assisted", "supported"); boost/penalize contribution to skill fit or depth axis. |
| 4 | **Apply across domains** | Same weighting rules; domain-specific only for skill vocab and graph. |

**Deliverable:** All axes (where applicable) use evidence-weighted contributions; no regression in current behavior.

---

### **Batch 2.3 — B3.3 Gap severity analysis**

| # | Task | Notes |
|---|------|------|
| 1 | **Severity levels** | `critical` (deal-breaker), `trainable`, `cosmetic`. |
| 2 | **Rules** | Required skill missing → critical; preferred missing → trainable or cosmetic. Optional: JD frequency, domain importance. |
| 3 | **Output** | Replace flat `missingSkills: string[]` with `missingSkills: { skill: string, severity: 'critical' \| 'trainable' \| 'cosmetic' }[]`. |
| 4 | **Decision logic** | e.g. Any critical gap → SKIP or REVIEW; only trainable/cosmetic → REVIEW or APPLY depending on other axes. |

**Deliverable:** Missing skills classified; decisions and explanations can reference severity.

---

### **Batch 2.4 — B4.1 Decision transparency layer**

| # | Task | Notes |
|---|------|------|
| 1 | **Structured explanation** | Replace/extend `getDecisionExplanation` to return `{ decisionReason, strengths: string[], risks: string[], actionItems: string[] }`. |
| 2 | **Strengths** | Top matching skills, strong axes, recent experience. |
| 3 | **Risks** | Missing skills (with severity), weak axes, recency gaps. |
| 4 | **Action items** | Concrete next steps (e.g. "Add React to skills", "Rewrite bullet to mention ownership"). |
| 5 | **API** | Add `explanation: { strengths, risks, actionItems }` to response; keep `decisionReason` / `actionHint` for backward compatibility. |
| 6 | **UI** | Show strengths, risks, actions in separate blocks. |

**Deliverable:** Every decision comes with structured strengths, risks, and actions.

---

### **Batch 2.5 — B4.2 Domain-aware coaching**

| # | Task | Notes |
|---|------|------|
| 1 | **Templates per domain** | Tech: "Add performance metrics", "Highlight system design"; Finance: "Highlight regulatory exposure"; Gov: "Show tenure & compliance"; etc. |
| 2 | **Same structure** | Reuse B4.1 structure; only copy and examples change by domain. |
| 3 | **Wire domain** | Pass `domain` from B2.2 into explanation builder; select template set. |

**Deliverable:** Explanations and action items use domain-appropriate language and examples.

---

### **Batch 2.6 — B4.3 Confidence simulator**

| # | Task | Notes |
|---|------|------|
| 1 | **"What if I add skill X?"** | New endpoint or mode: input = current resume + `addedSkills: string[]`. Re-run normalization + merge + deterministic (and optionally semantic) without LLM; return score deltas. |
| 2 | **"What if I rewrite bullet?"** | Optional: accept modified experience bullets; re-run skill extraction + scoring; return delta. |
| 3 | **Lightweight** | No full agent run; no cover letter or rewrite; just score simulation. |

**Deliverable:** User can simulate impact of adding skills or changing bullets without full run.

---

## 🔥 Phase 3 — Make it scalable

### **Batch 3.1 — B5.1 Profile types**

| # | Task | Notes |
|---|------|------|
| 1 | **Profile enum** | e.g. Software Engineer, Banker, Analyst, Government, Operations, Skilled labor, Creative. |
| 2 | **Weighting model per profile** | e.g. Tech: skillFit 0.3, seniority 0.2, tools 0.25; Banker: domain 0.3, responsibility 0.3. Same axes, different weights. |
| 3 | **Profile selection** | From UI or auto from domain; pass profile into scoring so `final` = weighted sum of axes. |

**Deliverable:** Same pipeline, multiple profiles with different axis weights.

---

### **Batch 3.2 — B5.2 Skill graph expansion (modular)**

| # | Task | Notes |
|---|------|------|
| 1 | **Graph schema** | JSON: nodes `{ id, displayName, aliases, domain }`, edges `{ from, to, weight, type? }`. |
| 2 | **Per-domain graphs** | `tech-graph.json`, `finance-graph.json`, `gov-graph.json` (and others as needed). |
| 3 | **Loader** | `getGraphForDomain(domain)` loads the right JSON; expose nodes + edges to normalizeSkills and inferSkillsFromGraph. |
| 4 | **Migrate current frontend** | Move `frontend.ts` data into `tech-graph.json` (or keep in code for tech); other domains use JSON. |
| 5 | **Normalize + infer** | `normalizeSkills(rawSkills, domain)`, `inferSkillsFromGraph(explicitIds, domain)`; both use loaded graph. |

**Deliverable:** Domain-driven skill graphs; easy to add new domains by adding a JSON file.

---

### **Batch 3.3 — B5.3 Batch & comparison mode**

| # | Task | Notes |
|---|------|------|
| 1 | **Compare Resume A vs B (same JD)** | Run agent twice (A vs JD, B vs JD); return side-by-side `{ resumeA: { decision, scores }, resumeB: { decision, scores } }`. |
| 2 | **Compare one resume vs N JDs** | Input: one resume + array of JDs. Run agent per JD; return `{ results: { jdId, decision, scores }[] }`; sort by final or skillFit. |
| 3 | **API** | New routes e.g. `POST /api/analyze/compare-resumes` and `POST /api/analyze/compare-jds`. |
| 4 | **Recruiter shortlist** | Optional UI: table of candidates × JDs with decision and score; filter/sort. |

**Deliverable:** Batch and comparison endpoints; foundation for recruiter-style workflows.

---

## Summary table

| Phase | Batch | Focus | Unlocks |
|-------|--------|--------|--------|
| 1 | 1.1 | B2.1 Resume/JD parsing | PDF/DOCX/text in |
| 1 | 1.2 | B2.2 Domain detection | Right graph & rules per domain |
| 1 | 1.3 | B2.3 Universal skill extraction | Any domain, no manual skills |
| 2 | 2.1 | B3.1 Multi-axis scoring | Rich scores |
| 2 | 2.2 | B3.2 Evidence weighting | Premium scoring quality |
| 2 | 2.3 | B3.3 Gap severity | Better decisions |
| 2 | 2.4 | B4.1 Decision transparency | Strengths, risks, actions |
| 2 | 2.5 | B4.2 Domain coaching | Domain-specific copy |
| 2 | 2.6 | B4.3 Simulator | "What if" score simulation |
| 3 | 3.1 | B5.1 Profile types | Multiple user types |
| 3 | 3.2 | B5.2 Modular graphs | Pluggable domains |
| 3 | 3.3 | B5.3 Batch & compare | Scale & recruiter tools |

---

## Suggested sprint grouping

- **Sprint 1:** Batch 1.1 (parsing)  
- **Sprint 2:** Batch 1.2 (domain) + start 1.3 (extraction interface)  
- **Sprint 3:** Batch 1.3 (universal skill extraction + wire to agent)  
- **Sprint 4:** Batch 2.1 (multi-axis) + 2.2 (evidence weighting)  
- **Sprint 5:** Batch 2.3 (gap severity) + 2.4 (transparency)  
- **Sprint 6:** Batch 2.5 (domain coaching) + 2.6 (simulator)  
- **Sprint 7:** Batch 3.1 (profiles) + 3.2 (modular graphs)  
- **Sprint 8:** Batch 3.3 (batch & compare)

You can merge or split sprints depending on capacity (e.g. 1.2 + 1.3 in one sprint if scope is reduced).
