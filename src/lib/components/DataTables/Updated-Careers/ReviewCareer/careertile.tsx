// CareerTile.tsx
"use client";

import React, { useEffect, useState } from "react";
import "@/lib/styles/careertile.scss";

export type Member = {
  id: string;
  name: string;
  email: string;
  role?: "owner" | "contributor" | "reviewer";
  you?: boolean;
};

type CareerFormShape = {
  jobTitle?: string;
  employmentType?: string;
  arrangement?: string;
  country?: string;
  state?: string;
  city?: string;
  minSalary?: string | number;
  maxSalary?: string | number;
  negotiable?: boolean;
  jobDescription?: string;
  responsibilities?: string[];
  qualifications?: string[];
  niceToHave?: string[];
};

type Props = {
  careerId?: string; // unused now, kept for compatibility
  data?: CareerFormShape;
  members?: Member[];
};

export default function CareerTile({ careerId, data: incomingData, members: incomingMembers }: Props) {
  const [open, setOpen] = useState(true);
  const [data, setData] = useState<CareerFormShape>(incomingData ?? {});
  const [members, setMembers] = useState<Member[]>(incomingMembers ?? []);
  const [loading, setLoading] = useState(false);

  // keep local copy in case parent updates props later
  useEffect(() => {
    setData(incomingData ?? {});
  }, [incomingData]);

  useEffect(() => {
    setMembers(incomingMembers ?? []);
  }, [incomingMembers]);

  const initials = (name = "") =>
    name
      .split(" ")
      .map((n) => n[0] || "")
      .slice(0, 2)
      .join("")
      .toUpperCase();

  // helpers for display
  const displaySalary = (val: string | number | undefined, negotiable?: boolean) => {
    if (negotiable) return "Negotiable";
    if (val === undefined || val === null || String(val).trim() === "") return "—";
    return String(val);
  };

  return (
    <div className="career-tile-blue-wrap">
      <div className={`career-tile-inner ${open ? "open" : "closed"}`}>
        <div className="header-row">
          <button
            className="small-chevron"
            onClick={() => setOpen((s) => !s)}
            aria-expanded={open}
            title={open ? "Collapse" : "Expand"}
          >
            <svg className={`chev ${open ? "chev-up" : "chev-down"}`} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 9l6 6 6-6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="header-title">Career Details &amp; Team Access</div>

          <div className="header-right">
            <button className="icon-edit" aria-label="Edit">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M3 21v-3.75l11.06-11.06 3.75 3.75L6.75 21H3z" stroke="#0f1724" strokeWidth="1.2" fill="none" />
                <path d="M14.06 6.94l3 3" stroke="#0f1724" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="white-card">
            <div className="field-row solo">
              <div className="field-label">Job Title</div>
              <div className="field-value">{loading ? "Loading…" : data.jobTitle ?? "Untitled"}</div>
            </div>

            <div className="grid-three field-row">
              <div className="field-col">
                <div className="field-label">Employment Type</div>
                <div className="field-value">{data.employmentType ?? "—"}</div>
              </div>

              <div className="field-col">
                <div className="field-label">Work Arrangement</div>
                <div className="field-value">{data.arrangement ?? "—"}</div>
              </div>

              <div className="field-col empty" aria-hidden />
            </div>

            <div className="grid-three field-row">
              <div className="field-col">
                <div className="field-label">Country</div>
                <div className="field-value">{data.country ?? "Philippines"}</div>
              </div>

              <div className="field-col">
                <div className="field-label">State / Province</div>
                <div className="field-value">{data.state ?? "—"}</div>
              </div>

              <div className="field-col">
                <div className="field-label">City</div>
                <div className="field-value">{data.city ?? "—"}</div>
              </div>
            </div>

            <div className="grid-three field-row">
              <div className="field-col">
                <div className="field-label">Minimum Salary</div>
                <div className="field-value">
                  {displaySalary(data.minSalary, !!data.negotiable)}
                </div>
              </div>

              <div className="field-col">
                <div className="field-label">Maximum Salary</div>
                <div className="field-value">
                  {displaySalary(data.maxSalary, !!data.negotiable)}
                </div>
              </div>

              <div className="field-col empty" aria-hidden />
            </div>

            <div className="expanded-area">
              <div>
                <h4 className="section-title">Job Description</h4>
                <p>{data.jobDescription ?? "No job description provided."}</p>
              </div>

              

              {data.niceToHave && data.niceToHave.length > 0 && (
                <div>
                  <h4 className="section-title" style={{ marginTop: 14 }}>Nice to have:</h4>
                  <ul>{data.niceToHave.map((n: string, i: number) => (<li key={i}>{n}</li>))}</ul>
                </div>
              )}

              <div className="team-access-section">
                <div className="team-title">Team Access</div>

                <div className="team-list">
                  {members.length > 0 ? members.map((m) => (
                    <div key={m.id} className="team-row">
                      <div className="team-left">
                        <div
                          className="team-avatar"
                          style={{
                            background: m.id === "1"
                              ? "linear-gradient(135deg,#a78bfa,#7c3aed)"
                              : "linear-gradient(135deg,#fb7185,#ec4899)"
                          }}
                          aria-hidden
                        >
                          {initials(m.name)}
                        </div>

                        <div className="team-meta">
                          <div className="team-name">
                            {m.name} {m.you ? <span className="you-note">(You)</span> : null}
                          </div>
                          <div className="team-email">{m.email}</div>
                        </div>
                      </div>

                      <div className="team-role">
                        {m.role === "owner" ? "Job Owner" : m.role === "contributor" ? "Contributor" : ""}
                      </div>
                    </div>
                  )) : (
                    <div className="team-row team-empty">No team members added yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
