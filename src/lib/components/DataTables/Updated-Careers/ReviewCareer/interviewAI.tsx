// InterviewAIscreen.tsx
"use client";

import React, { useEffect, useState } from "react";
import "@/lib/styles/interviewAIscreenstyle.scss";

export type PreScreenQuestion = { id: string; text: string; };
export type QuestionCategory = { id: string; title: string; questions: PreScreenQuestion[]; };

export type Member = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  avatarText?: string;
  role: "owner" | "contributor" | "reviewer";
  you?: boolean;
};

export type InterviewAIscreenProps = {
  careerId?: string;
  onEdit?: () => void;
  // New props so reviewcareer can pass live data & navigation
  initialFormData?: {
    jobTitle?: string;
    employmentType?: string;
    arrangement?: string;
    country?: string;
    state?: string;
    city?: string;
    minSalary?: string;
    maxSalary?: string;
    negotiable?: boolean;
    jobDescription?: string;
  };
  initialMembers?: Member[];
  onBack?: () => void;
  onNext?: () => void;
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

export default function InterviewAIscreentile({
  careerId,
  onEdit,
  initialFormData,
  initialMembers,
  onBack,
  onNext,
}: InterviewAIscreenProps) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const [screeningLabel, setScreeningLabel] = useState("Good Fit");
  const [requireVideo, setRequireVideo] = useState<boolean>(false);
  const [secretBullets, setSecretBullets] = useState<string[]>([]);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);

  // Optional: keep a small local copy of incoming formData for display
  const [displayTitle, setDisplayTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialFormData?.jobTitle) {
      setDisplayTitle(initialFormData.jobTitle);
    }
  }, [initialFormData]);

  useEffect(() => {
    let mounted = true;
    if (!careerId) return;
    setLoading(true);

    fetchCareer(careerId)
      .then((doc) => {
        if (!mounted) return;

        if (doc.AIScreening) setScreeningLabel(doc.AIScreening);
        if (doc.AIScreeningLabel) setScreeningLabel(doc.AIScreeningLabel);
        if (doc.screeningLabel) setScreeningLabel(doc.screeningLabel);

        setRequireVideo(Boolean(doc.requireVideo ?? doc.requriedvideo ?? doc.requireVideoOnInterview));

        if (Array.isArray(doc.AIsecretBullets)) setSecretBullets(doc.AIsecretBullets);
        if (Array.isArray(doc.secretBullets)) setSecretBullets(doc.secretBullets);
        if (Array.isArray(doc.aiSecretBullets)) setSecretBullets(doc.aiSecretBullets);

        // Ai interview questions might be stored as object or array
        if (Array.isArray(doc.AiinterviewQuestion)) {
          setCategories(doc.AiinterviewQuestion);
        } else if (doc.AiinterviewQuestion && typeof doc.AiinterviewQuestion === "object") {
          const arr = Object.entries(doc.AiinterviewQuestion).map(([k, v], idx) => ({
            id: k + idx,
            title: k,
            questions: Array.isArray(v) ? v.map((t: string, i: number) => ({ id: `${k}_${i}`, text: String(t) })) : [],
          }));
          setCategories(arr);
        } else if (Array.isArray(doc.interviewCategories)) {
          setCategories(doc.interviewCategories);
        }
      })
      .catch((err) => {
        console.error("InterviewAIscreen fetch error", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [careerId]);

  const totalCount = categories.reduce((s, c) => s + (c.questions?.length || 0), 0);

  return (
    <div className="ai-outer-wrap">
      <div className={`ai-card-wrap ${open ? "open" : "closed"}`}>
        <div className="ai-blue-header">
          <button className="ai-chevron-btn" onClick={() => setOpen((s) => !s)} aria-expanded={open}>
            <svg className={`ai-chevron ${open ? "up" : "down"}`} width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 15l6-6 6 6" stroke="#1f2937" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="ai-header-title">AI Interview Screening</div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
         
           

            <button className="ai-edit-circle" aria-label="Edit" onClick={onEdit}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M3 21v-3.75l11.06-11.06 3.75 3.75L6.75 21H3z" stroke="#0f1724" strokeWidth="1.2" fill="none" />
                <path d="M14.06 6.94l3 3" stroke="#0f1724" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="ai-white-card">
            <div className="ai-top-block">
              <div className="ai-top-left">
                <div className="ai-top-label">AI Interview Screening</div>
                <div className="ai-top-text">
                  {loading ? "Loading…" : `Automatically endorse candidates who are `}
                  <span className="ai-pill-inline">{screeningLabel}</span> and above
                </div>
                {displayTitle && <div style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>{displayTitle}</div>}
              </div>
            </div>

            <div className="ai-divider" />

            <div className="ai-require-row">
              <div className="ai-require-label">Require Video on Interview</div>
              <div className="ai-require-value">
                {requireVideo ? (
                  <span className="ai-yes">
                    Yes
                    <svg className="ai-check" viewBox="0 0 24 24" width="14" height="14" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#ecfdf5" />
                      <path d="M7.5 12.5l2.5 2.5L16.5 9" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                ) : (
                  <span className="ai-no">No</span>
                )}
              </div>
            </div>

            <div className="ai-divider" />

            <div className="ai-secret">
              <div className="ai-secret-heading">
                <span className="ai-star" aria-hidden>✦</span>
                <strong>AI Interview Secret Prompt</strong>
              </div>
              <ul className="ai-secret-list">
                {secretBullets.map((b, i) => (<li key={i}>{b}</li>))}
              </ul>
            </div>

            <div className="ai-divider" />

            <div className="ai-questions-header">
              <div className="ai-questions-title">Interview Questions</div>
              <div className="ai-questions-count">{totalCount}</div>
            </div>

            <div className="ai-categories">
              {categories.map((cat) => (
                <div key={cat.id} className="ai-category">
                  <div className="ai-category-title">{cat.title}</div>
                  <ol className="ai-category-list">
                    {cat.questions.map((q) => <li key={q.id} className="ai-question-item">{q.text}</li>)}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
