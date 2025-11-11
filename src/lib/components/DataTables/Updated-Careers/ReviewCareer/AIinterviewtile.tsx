import React, { useState } from "react";
import "@/lib/styles/interviewAItile.scss";

export type PreScreenQuestion = {
  id: string;
  text: string;
  options?: string[];
};

export type AIInterviewProps = {
  screeningLabel?: string; // e.g. "Good Fit"
  secretPrompt?: string; // the paragraph or intro for the secret prompt
  secretBullets?: string[]; // bullet points under the secret prompt
  questions?: PreScreenQuestion[];
  onEdit?: () => void;
};

export default function AIinterview({
  screeningLabel = "Good Fit",
  secretPrompt = "Automatically endorse candidates who are",
  secretBullets = [
    "Prioritize candidates with strong hands-on experience in Java and object-oriented programming.",
    "Look for familiarity with frameworks like Spring Boot or Hibernate, and experience building scalable backend systems.",
    "Give extra weight to candidates who demonstrate knowledge of REST APIs, microservices, and SQL or NoSQL databases.",
    "Deprioritize resumes that only list Java as a secondary or outdated skill.",
  ],
  questions = [
    {
      id: "q1",
      text: "How long is your notice period?",
      options: ["Immediately", "< 30 days", "> 30 days"],
    },
    {
      id: "q2",
      text: "How often are you willing to report to the office?",
      options: ["At most 1-2x a week", "At most 3-4x a week", "Open to fully onsite work", "Only open to fully remote work"],
    },
    {
      id: "q3",
      text: "How much is your expected monthly salary?",
      options: ["Preferred: PHP 40,000 - PHP 60,000"],
    },
  ],
  onEdit,
}: AIInterviewProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="ai-card-outer">
      <div className={`ai-card ${open ? "open" : ""}`}>
        <div className="ai-header-row">
          <button
            className="ai-header-btn"
            aria-expanded={open}
            onClick={() => setOpen((s) => !s)}
            title={open ? "Collapse" : "Expand"}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <svg className="ai-collapse-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6-6 6 6" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              <div style={{ minWidth: 0 }}>
                <h3 className="ai-title">CV Review & Pre-Screening Questions</h3>
                <div className="ai-subtitle">CV Screening</div>
              </div>
            </div>

            <div className="ai-right-controls" aria-hidden>
              <div className="ai-screen-pill">
                Automatically endorse candidates who are <span className="ai-pill-inner"> {screeningLabel} </span> and above
              </div>
            </div>
          </button>

          <button className="ai-edit-btn" aria-label="Edit CV Review" onClick={onEdit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 21v-3.75l11.06-11.06 3.75 3.75L6.75 21H3z" stroke="#334155" strokeWidth="0.6" fill="none" />
              <path d="M14.06 6.94l3 3" stroke="#334155" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {open && (
          <div className="ai-content">
            {/* Secret Prompt */}
            <div className="ai-secret">
              <div className="ai-secret-title">
                <span className="sparkle">✦</span> <strong>CV Secret Prompt</strong>
              </div>

              <p className="ai-secret-intro">{secretPrompt}</p>

              <ul className="ai-secret-bullets">
                {secretBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>

            <div className="ai-dashed" />

            {/* Pre-screening questions header */}
            <div className="ai-questions-header">
              <div className="ai-questions-title">Pre-Screening Questions</div>
              <div className="ai-questions-count">{questions.length}</div>
            </div>

            {/* Questions list */}
            <ol className="ai-questions-list">
              {questions.map((q, idx) => (
                <li key={q.id} className="ai-question-item">
                  <div className="ai-question-text">{idx + 1}. {q.text}</div>
                  {q.options && q.options.length > 0 && (
                    <ul className="ai-question-options">
                      {q.options.map((opt, i) => (
                        <li key={i}>{opt}</li>
                      ))}
                    </ul>
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
