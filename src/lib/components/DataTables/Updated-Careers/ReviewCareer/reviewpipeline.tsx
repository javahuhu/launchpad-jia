import React, { useState } from "react";
import "@/lib/styles/reviewpipestyle.scss"; // keep your path

type Substage = { id: string; title: string };
type Stage = { id: string; title: string; icon?: React.ReactNode; subtages: Substage[] };

const SAMPLE_STAGES: Stage[] = [
  { id: "s1", title: "CV Screening", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, subtages: [{ id: "a", title: "Waiting Submission" }, { id: "b", title: "For Review" }] },
  { id: "s2", title: "AI Interview", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, subtages: [{ id: "a", title: "Waiting Interview" }, { id: "b", title: "For Review" }] },
  { id: "s3", title: "Personality Test", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, subtages: [{ id: "a", title: "Waiting Submission" }, { id: "b", title: "For Review" }] },
  { id: "s4", title: "Coding Test", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, subtages: [{ id: "a", title: "Waiting Submission" }, { id: "b", title: "For Review" }] },
  { id: "s5", title: "Final Interview", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, subtages: [{ id: "a", title: "Schedule" }] },
  { id: "s6", title: "Offer", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, subtages: [{ id: "a", title: "Extended" }] },
];

export default function PipelineScreen({ stages = SAMPLE_STAGES }: { stages?: Stage[] }) {
  const [open, setOpen] = useState(true);

  

  return (
    <div className="pipeline-outer-wrap">
      <div className="pipeline-inner">
        {/* Header row */}
        <div className="pipeline-header">
          <button
            className={`pipeline-chevron ${open ? "open" : "closed"}`}
            aria-label={open ? "Collapse pipeline" : "Expand pipeline"}
            onClick={() => setOpen((s) => !s)}
            title={open ? "Collapse" : "Expand"}
          >
            {/* chevron rotates via CSS */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 15l6-6 6 6" stroke="#0f1724" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="pipeline-title-count">
            <div className="pipeline-title">Pipeline Stages</div>
            <div className="pipeline-count-inline">{stages.length}</div>
          </div>

          <div style={{ flex: 1 }} />

          
        </div>

        {/* White card container (collapsible) */}
        {open && (
          <div className="pipeline-white-card">
            {/* Horizontal scroll area containing blue stage cards */}
            <div className="pipeline-scroll-wrap" role="region" aria-label="Pipeline stages">
              <div className="pipeline-row">
                {stages.map((s) => (
                  <div key={s.id} className="pipeline-stage-card">
                    <div className="stage-head">
                      <div className="stage-icon">{s.icon}</div>
                      <div className="stage-title">{s.title}</div>
                    </div>

                    <div className="stage-subtitle">Substages</div>

                    <div className="stage-substage-list">
                      {s.subtages.map((sub) => (
                        <div key={sub.id} className="substage-pill">{sub.title}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
