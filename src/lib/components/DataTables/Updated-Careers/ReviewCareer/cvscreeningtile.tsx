// cvscreening.tsx
"use client";

import React, { useEffect, useState } from "react";
import "@/lib/styles/cvscreeningtilestyle.scss";

export type PreScreenQuestion = {
  id: string;
  text: string;
  options?: string[];
};

export type cvscreeningProps = {
  careerId?: string;
  screeningLabel?: string;
  secretPrompt?: string;
  secretBullets?: string[];
  questions?: PreScreenQuestion[];
  onEdit?: () => void;
};

async function fetchCareer(careerID: string) {
  const res = await fetch("/api/fetch-career-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ careerID }),
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload?.error || "Failed to fetch career");
  return payload;
}

export default function cvscreening({
  careerId,
  screeningLabel = "Good Fit",
  secretPrompt = "Automatically endorse candidates who are",
  secretBullets = [
    "Prioritize candidates with strong hands-on experience in Java and object-oriented programming.",
    "Look for familiarity with frameworks like Spring Boot or Hibernate, and experience building scalable backend systems.",
    "Give extra weight to candidates who demonstrate knowledge of REST APIs, microservices, and SQL or NoSQL databases.",
    "Deprioritize resumes that only list Java as a secondary or outdated skill.",
  ],
  questions = [],
  onEdit,
}: cvscreeningProps) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const [localScreeningLabel, setLocalScreeningLabel] = useState(screeningLabel);
  const [localSecretPrompt, setLocalSecretPrompt] = useState(secretPrompt);
  const [localSecretBullets, setLocalSecretBullets] = useState<string[]>(secretBullets);
  const [localQuestions, setLocalQuestions] = useState<PreScreenQuestion[]>(questions);

  useEffect(() => {
    let mounted = true;
    if (!careerId) return;
    setLoading(true);

    fetchCareer(careerId)
      .then((doc) => {
        if (!mounted) return;

        if (doc.cvScreening) setLocalScreeningLabel(doc.cvScreening);
        if (doc.screeningSetting) setLocalScreeningLabel(doc.screeningSetting);
        if (doc.screeningLabel) setLocalScreeningLabel(doc.screeningLabel);

        const secret = doc.cvSecretPrompt ?? doc.cvSecret ?? doc.secretPrompt ?? "";
        if (secret) setLocalSecretPrompt(secret);

        if (Array.isArray(doc.cvSecretBullets)) setLocalSecretBullets(doc.cvSecretBullets);
        if (Array.isArray(doc.secretBullets)) setLocalSecretBullets(doc.secretBullets);

        if (Array.isArray(doc.preScreenQuestions)) {
          setLocalQuestions(doc.preScreenQuestions);
        } else if (typeof doc.preScreenQuestions === "string") {
          try {
            const parsed = JSON.parse(doc.preScreenQuestions);
            if (Array.isArray(parsed)) setLocalQuestions(parsed);
          } catch {}
        } else if (Array.isArray(doc.questions)) {
          setLocalQuestions(doc.questions);
        }
      })
      .catch((err) => {
        console.error("cvscreening fetch error", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [careerId]);

  return (
    <div className="ai-outer-wrap">
      <div className={`ai-card-wrap ${open ? "open" : "closed"}`}>
        <div className="ai-blue-header">
          <button
            className="ai-chevron-btn"
            onClick={() => setOpen((s) => !s)}
            aria-expanded={open}
            title={open ? "Collapse" : "Expand"}
          >
            <svg className={`ai-chevron ${open ? "up" : "down"}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 15l6-6 6 6" stroke="#1f2937" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="ai-header-title">CV Review &amp; Pre-Screening Questions</div>

          <button className="ai-edit-circle" aria-label="Edit CV Review" onClick={onEdit} title="Edit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 21v-3.75l11.06-11.06 3.75 3.75L6.75 21H3z" stroke="#0f1724" strokeWidth="1.2" fill="none" />
              <path d="M14.06 6.94l3 3" stroke="#0f1724" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {open && (
          <div className="ai-white-card">
            <div className="ai-top-block">
              <div className="ai-top-left">
                <div className="ai-top-label">CV Screening</div>
                <div className="ai-top-text">
                  Automatically endorse candidates who are  <span className="ai-pill">{localScreeningLabel}</span> <span className="ai-and"></span>
                </div>
              </div>
            </div>

            <div className="ai-divider" />

            <div className="ai-secret">
              <div className="ai-secret-heading">
                <span className="ai-star" aria-hidden>✦</span>
                <strong>CV Secret Prompt</strong>
              </div>

              <ul className="ai-secret-list">
                {loading ? "Loading…" : localSecretPrompt}
              </ul>
            </div>

            <div className="ai-divider" />

            <div className="ai-questions-header">
              <div className="ai-questions-title">Pre-Screening Questions</div>
              <div className="ai-questions-count">{localQuestions.length}</div>
            </div>

            <ol className="ai-questions-list">
              {localQuestions.map((q, idx) => (
                <li key={q.id ?? idx} className="ai-question-item">
                  <div className="ai-question-text">{q.text}</div>
                  {q.options && q.options.length > 0 && (
                    <ul className="ai-question-options">{q.options.map((opt, i) => <li key={i}>{opt}</li>)}</ul>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
