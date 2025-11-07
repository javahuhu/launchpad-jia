"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useAppContext } from "@/lib/context/AppContext";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { errorToast, candidateActionToast } from "@/lib/Utils";
import "@/lib/styles/CareersTableV2-Style.scss";

/* ---------- Types ---------- */
type Status = "Published" | "Unpublished";
type Errors = Partial<Record<
  | "jobTitle"
  | "employmentType"
  | "arrangement"
  | "state"
  | "city"
  | "minSalary"
  | "maxSalary"
  | "jobDescription",
  string
>>;

/* ---------- Team Access internals (unchanged UI/behaviour) ---------- */
const TA_DIRECTORY = [
  { id: "darlene", name: "Darlene Santo Tomas", email: "darlene@whitecloak.com", avatarUrl: "", avatarText: "D" },
  { id: "demi", name: "Demi Wilkinson", email: "demi@whitecloak.com", avatarUrl: "", avatarText: "D" },
  { id: "drew", name: "Drew Cano", email: "drew@whitecloak.com", avatarUrl: "", avatarText: "D" },
  { id: "candice", name: "Candice Wu", email: "candice@whitecloak.com", avatarUrl: "", avatarText: "C" },
  { id: "lana", name: "Lana Steiner", email: "lana@whitecloak.com", avatarUrl: "", avatarText: "L" },
  { id: "natali", name: "Natali Craig", email: "natali@whitecloak.com", avatarUrl: "", avatarText: "N" },
];

const TA_ROLES = [
  {
    key: "owner", title: "Job Owner",
    desc: "Leads the hiring process for assigned jobs. Has access with all career settings."
  },
  {
    key: "contributor", title: "Contributor",
    desc: "Helps evaluate candidates and assist with hiring tasks. Can move candidates through the pipeline, but cannot change any career settings."
  },
  {
    key: "reviewer", title: "Reviewer",
    desc: "Reviews candidates and provides feedback. Can only view candidate profiles and comment."
  },
];

type Member = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  avatarText?: string;
  role: "owner" | "contributor" | "reviewer";
  you?: boolean;
};
type TAState = {
  members: Member[];
  addMember: (p: Omit<Member, "role">) => void;
  removeMember: (id: string) => void;
  updateRole: (id: string, role: Member["role"]) => void;
};

const TAContext = React.createContext<TAState | null>(null);

function useTeamAccessState(): TAState {
  const [members, setMembers] = useState<Member[]>([
    { id: "sabine", name: "Sabine Beatrix Dy", email: "sabine@whitecloak.com", avatarText: "S", role: "owner", you: true },
    { id: "darlene", name: "Darlene Santo Tomas", email: "darlene@whitecloak.com", avatarText: "D", role: "contributor" },
  ]);

  const addMember = (p: Omit<Member, "role">) => {
    if (members.some(m => m.id === p.id)) return;
    setMembers(prev => [...prev, { ...p, role: "reviewer" }]);
  };
  const removeMember = (id: string) => setMembers(prev => prev.filter(m => m.id !== id));
  const updateRole = (id: string, role: Member["role"]) =>
    setMembers(prev => prev.map(m => (m.id === id ? { ...m, role } : m)));

  return { members, addMember, removeMember, updateRole };
}

function TeamAccessProvider({ children }: { children: React.ReactNode }) {
  const state = useTeamAccessState();
  return <TAContext.Provider value={state}>{children}</TAContext.Provider>;
}

function Avatar({ url, text }: { url?: string; text?: string }) {
  if (url) return <img className="ta-avatar" src={url} alt="" />;
  return <div className="ta-avatar">{text ?? "•"}</div>;
}

function TeamAccessAdd() {
  const ctx = React.useContext(TAContext)!;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TA_DIRECTORY.slice(0, 12);
    return TA_DIRECTORY.filter(
      p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="ta-add ta-add-top" ref={ref}>
      <button
        type="button"
        className={`ta-add-button ${open ? "is-open" : ""}`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <i className="la la-user-plus ta-add-leading" />
        <span>Add member</span>
      </button>

      {open && (
        <div className="ta-popover">
          <div className="ta-search-pill">
            <i className="la la-search ta-search-icon" />
            <input
              autoFocus
              className="ta-search-input"
              placeholder="Search member"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="ta-results">
            {results.map(p => (
              <button
                key={p.id}
                type="button"
                className="ta-result-item"
                onClick={() => {
                  ctx.addMember({ ...p });
                  setQuery("");
                  setOpen(false);
                }}
              >
                <Avatar url={p.avatarUrl} text={p.avatarText} />
                <div className="ta-person">
                  <div className="ta-person-name">{p.name}</div>
                  <div className="ta-person-email">{p.email}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamAccessList() {
  const ctx = React.useContext(TAContext)!;
  const [openFor, setOpenFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpenFor(null);
    }
    document.addEventListener("mousedown", onDocClick, true);
    return () => document.removeEventListener("mousedown", onDocClick, true);
  }, []);

  return (
    <div className="ta-list">
      {ctx.members.map(m => {
        const role = TA_ROLES.find(r => r.key === m.role)!;
        const isOpen = openFor === m.id;

        return (
          <div className="ta-row" key={m.id}>
            <div className="ta-left">
              <Avatar url={m.avatarUrl} text={m.avatarText} />
              <div className="ta-person">
                <div className="ta-person-name">
                  {m.name} {m.you && <span className="ta-you">(You)</span>}
                </div>
                <div className="ta-person-email">{m.email}</div>
              </div>
            </div>

            <div className="ta-right">
              <div className="ta-role">
                <button
                  type="button"
                  className="ta-role-select"
                  onClick={() => setOpenFor(isOpen ? null : m.id)}
                  aria-expanded={isOpen}
                >
                  {role.title}
                </button>

                {isOpen && (
                  <div
                    ref={menuRef}
                    className="ta-role-menu"
                    onMouseDown={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {TA_ROLES.map(r => {
                      const selected = r.key === m.role;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          className={`ta-role-item ${selected ? "is-selected" : ""}`}
                          onClick={() => {
                            ctx.updateRole(m.id, r.key as Member["role"]);
                            setOpenFor(null);
                          }}
                        >
                          <div className="ta-role-top">
                            <span className="ta-role-title">{r.title}</span>
                          </div>
                          <div className="ta-role-desc">{r.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="ta-trash"
                title="Remove"
                onClick={() => ctx.removeMember(m.id)}
                disabled={m.you}
              >
                <i className="la la-trash" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Main Form ---------- */
export default function AddNewCareerForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    jobTitle: "",
    employmentType: "",
    arrangement: "",
    country: "Philippines",
    state: "",
    city: "",
    minSalary: "0",
    maxSalary: "0",
    negotiable: false,
    jobDescription: "",
  });

  const [activeStep, setActiveStep] = useState(1);
  const steps = [
    { number: 1, title: "Career Details & Team Access" },
    { number: 2, title: "CV Review & Pre-screening" },
    { number: 3, title: "AI Interview Setup" },
    { number: 4, title: "Pipeline Stages" },
    { number: 5, title: "Review Career" },
  ];

  // ----- capacity logic (unchanged) -----
  const { orgID, user } = useAppContext();
  const [activeOrg] = useLocalStorage("activeOrg", null);
  const [availableJobSlots, setAvailableJobSlots] = useState(0);
  const [totalActiveCareers, setTotalActiveCareers] = useState(0);

  useEffect(() => {
    const fetchOrgDetails = async () => {
      try {
        const orgDetails = await axios.post("/api/feth-org-details", {
          orgID: activeOrg?._id,
        });
        setAvailableJobSlots(
          (orgDetails.data?.plan?.jobLimit || 3) +
          (orgDetails.data?.extraJobSlots || 0)
        );
      } catch (error) {
        console.error("Error fetching org details:", error);
        errorToast("Error fetching organization details", 1500);
      }
    };
    if (activeOrg?._id) fetchOrgDetails();
  }, [activeOrg]);

  useEffect(() => {
    const fetchTotals = async () => {
      try {
        if (!orgID) return;
        const response = await axios.get("/api/get-careers", {
          params: {
            userEmail: user?.email,
            orgID,
            page: 1,
            limit: 1,
            search: "",
            sortConfig: null,
            status: "All Statuses",
          },
        });
        setTotalActiveCareers(response.data.totalActiveCareers || 0);
      } catch (error) {
        console.error("Error fetching careers totals:", error);
      }
    };
    fetchTotals();
  }, [orgID, user?.email]);

  /* ---------- Validation ---------- */
  const validate = useMemo(() => {
    const errors: Errors = {};

    if (!formData.jobTitle.trim()) errors.jobTitle = "This is a required field.";
    if (!formData.employmentType) errors.employmentType = "This is a required field.";
    if (!formData.arrangement) errors.arrangement = "This is a required field.";
    if (!formData.state) errors.state = "This is a required field.";
    if (!formData.city) errors.city = "This is a required field.";

    const min = Number(formData.minSalary);
    const max = Number(formData.maxSalary);
    if (!formData.negotiable) {
      if (!min && min !== 0) errors.minSalary = "This is a required field.";
      if (!max && max !== 0) errors.maxSalary = "This is a required field.";
      if (!errors.minSalary && !errors.maxSalary && max < min) {
        errors.maxSalary = "Maximum must be greater than minimum.";
      }
    }
    if (!formData.jobDescription.trim()) errors.jobDescription = "This is a required field.";

    return errors;
  }, [formData]);

  const hasErrors = Object.keys(validate).length > 0;

  // % completion of Step 1 (to drive the gradient track)
  const step1Percent = useMemo(() => {
    const checks = [
      !!formData.jobTitle.trim(),
      !!formData.employmentType,
      !!formData.arrangement,
      !!formData.state,
      !!formData.city,
      formData.negotiable ? true : formData.minSalary !== "" && formData.maxSalary !== "",
      !!formData.jobDescription.trim(),
    ];
    const score = checks.filter(Boolean).length;
    return Math.round((score / checks.length) * 100);
  }, [formData]);

  const createCareer = async (status: Status) => {
    const payload = {
      ...formData,
      orgID,
      userEmail: user?.email,
      status,
      minSalary: Number(formData.minSalary || 0),
      maxSalary: Number(formData.maxSalary || 0),
    };
    const res = await axios.post("/api/create-career", payload);
    return res.data;
  };

  const handleSaveAndContinue = async () => {
    if (!orgID || !user?.email) {
      errorToast("Missing organization or user context", 1500);
      return;
    }

    // gate on validation for Step 1
    setSubmitted(true);
    if (hasErrors) {
      candidateActionToast(
        "Please complete required fields.",
        1600,
        <i className="la la-exclamation-triangle mr-1 text-danger"></i>
      );
      return;
    }

    try {
      setLoading(true);
      const slotsFull = totalActiveCareers >= availableJobSlots;
      const statusToUse: Status = slotsFull ? "Unpublished" : "Published";
      await createCareer(statusToUse);

      if (slotsFull) {
        candidateActionToast(
          "Job limit reached. Saved as Unpublished.",
          1600,
          <i className="la la-info-circle mr-1 text-warning"></i>
        );
      } else {
        candidateActionToast(
          "Career published successfully!",
          1200,
          <i className="la la-check mr-1 text-success"></i>
        );
      }

      setActiveStep((s) => Math.min(s + 1, steps.length));
    } catch (error) {
      console.error("Error saving career:", error);
      errorToast("Error saving career", 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsUnpublished = async () => {
    if (!orgID || !user?.email) {
      errorToast("Missing organization or user context", 1500);
      return;
    }
    try {
      setLoading(true);
      await createCareer("Unpublished");
      candidateActionToast(
        "Saved as Unpublished",
        1200,
        <i className="la la-save mr-1 text-info"></i>
      );
    } catch (error) {
      console.error("Error saving career:", error);
      errorToast("Error saving career", 1500);
    } finally {
      setLoading(false);
    }
  };
  

  /* ---------- Render ---------- */
  return (
    <>
      {/* Header */}
      <div className="add-career-header">
        <div className="header-left">
          <button onClick={() => window.history.back()} className="back-button">
            <i className="la la-arrow-left"></i>
          </button>
          <div>
            <div className="header-subtitle">Careers</div>
            <h1 className="header-title">Add new career</h1>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-unpublished" onClick={handleSaveAsUnpublished} disabled={loading}>
            Save as Unpublished
          </button>
          <button className="btn-continue" onClick={handleSaveAndContinue} disabled={loading}>
            Save and Continue
            <i className="la la-arrow-right"></i>
          </button>
        </div>
      </div>

      {/* Modern Steps with validation indicator */}
      <div className="steps-modern">
        {steps.map((step, index) => {
          const isActive = step.number === activeStep;
          const isDone = step.number < activeStep;
          const isLast = index === steps.length - 1;

         
          const fill = isActive ? `${Math.max(0, Math.min(step1Percent, 50))}%` : isDone ? "50%" : "0%";

       
          const showErrorIcon = submitted && isActive && hasErrors;

          return (
            <div className="mstep" key={step.number}>
              <div className="mhead">
                <div
                  className={[
                    "mcircle",
                    isActive ? "is-active" : "",
                    isDone ? "is-done" : "is-upcoming",
                    showErrorIcon ? "has-error" : "",   // <- add this
                  ].join(" ")}
                >
                  {showErrorIcon ? (
                    <span className="micon-error" aria-hidden />
                  ) : (
                    <span
                      className={[
                        "mcircle-dot",
                        isActive ? "dot-active" : isDone ? "dot-done" : "dot-upcoming",
                      ].join(" ")}
                    />
                  )}
                </div>

                {!isLast && (
                  <div
                    className="mconnector"
                    style={{ ["--fill" as any]: fill } as React.CSSProperties}
                  />
                )}
              </div>

              <div className={["mlabel", isActive ? "mlabel-active" : "mlabel-upcoming"].join(" ")}>
                {step.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="add-career-main">
        <div className="form-section">
          {/* 1. Career Information */}
          <div className="blue-wrap">
            <h2 className="section-title">1. Career Information</h2>

            <div className="white-inner">
              {/* Basic Information */}
              <div className="form-group">
                <h3 className="form-subtitle">Basic Information</h3>
                <div className="input-group">
                  <label className="input-label">Job Title</label>
                  <input
                    type="text"
                    placeholder="Enter job title"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className={`text-input ${submitted && validate.jobTitle ? "has-error" : ""}`}
                  />
                  {submitted && validate.jobTitle && (
                    <div className="field-error">{validate.jobTitle}</div>
                  )}
                </div>
              </div>

              {/* Work Setting */}
              <div className="form-group">
                <h3 className="form-subtitle">Work Setting</h3>
                <div className="grid-2">
                  <div>
                    <label className="input-label">Employment Type</label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      className={`select-input ${submitted && validate.employmentType ? "has-error" : ""}`}
                    >
                      <option value="">Choose employment type</option>
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                    {submitted && validate.employmentType && (
                      <div className="field-error">{validate.employmentType}</div>
                    )}
                  </div>
                  <div>
                    <label className="input-label">Arrangement</label>
                    <select
                      value={formData.arrangement}
                      onChange={(e) => setFormData({ ...formData, arrangement: e.target.value })}
                      className={`select-input ${submitted && validate.arrangement ? "has-error" : ""}`}
                    >
                      <option value="">Choose work arrangement</option>
                      <option value="onsite">On-site</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                    {submitted && validate.arrangement && (
                      <div className="field-error">{validate.arrangement}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="form-group">
                <label className="form-subtitle">Location</label>
                <div className="grid-3">
                  <div>
                    <label className="input-label">Country</label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="select-input"
                    >
                      <option value="Philippines">Philippines</option>
                      <option value="USA">USA</option>
                      <option value="UK">UK</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">State / Province</label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className={`select-input ${submitted && validate.state ? "has-error" : ""}`}
                    >
                      <option value="">Choose state / province</option>
                      <option value="metro-manila">Metro Manila</option>
                      <option value="cebu">Cebu</option>
                    </select>
                    {submitted && validate.state && (
                      <div className="field-error">{validate.state}</div>
                    )}
                  </div>
                  <div>
                    <label className="input-label">City</label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={`select-input ${submitted && validate.city ? "has-error" : ""}`}
                    >
                      <option value="">Choose city</option>
                      <option value="quezon-city">Quezon City</option>
                      <option value="manila">Manila</option>
                    </select>
                    {submitted && validate.city && (
                      <div className="field-error">{validate.city}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Salary */}
              <div className="form-group">
                <div className="salary-header">
                  <label className="form-subtitle">Salary</label>
                  <label className="negotiable-label">
                    <input
                      type="checkbox"
                      checked={formData.negotiable}
                      onChange={(e) => setFormData({ ...formData, negotiable: e.target.checked })}
                      className="checkbox-input"
                    />
                    Negotiable
                  </label>
                </div>
                <div className="grid-2">
                  <div>
                    <label className="input-label">Minimum Salary</label>
                    <div className="salary-input-wrapper">
                      <span className="currency-symbol">₱</span>
                      <input
                        type="number"
                        value={formData.minSalary}
                        onChange={(e) => setFormData({ ...formData, minSalary: e.target.value })}
                        className={`salary-input ${submitted && validate.minSalary ? "has-error" : ""}`}
                        disabled={formData.negotiable}
                      />
                      <span className="currency-code">PHP</span>
                    </div>
                    {submitted && validate.minSalary && !formData.negotiable && (
                      <div className="field-error">{validate.minSalary}</div>
                    )}
                  </div>
                  <div>
                    <label className="input-label">Maximum Salary</label>
                    <div className="salary-input-wrapper">
                      <span className="currency-symbol">₱</span>
                      <input
                        type="number"
                        value={formData.maxSalary}
                        onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value })}
                        className={`salary-input ${submitted && validate.maxSalary ? "has-error" : ""}`}
                        disabled={formData.negotiable}
                      />
                      <span className="currency-code">PHP</span>
                    </div>
                    {submitted && validate.maxSalary && !formData.negotiable && (
                      <div className="field-error">{validate.maxSalary}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Job Description */}
          <div className="blue-wrap">
            <h2 className="section-title">2. Job Description</h2>
            <div className="white-inner">
              <textarea
                placeholder="Enter job description..."
                value={formData.jobDescription}
                onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                rows={8}
                className={`textarea-input ${submitted && validate.jobDescription ? "has-error" : ""}`}
              />
              {submitted && validate.jobDescription && (
                <div className="field-error">{validate.jobDescription}</div>
              )}
            </div>
          </div>

          {/* 3. Team Access */}
          <div className="blue-wrap">
            <h2 className="section-title">3. Team Access</h2>
            <div className="white-inner">
              <TeamAccessProvider>
                <div className="team-access">
                  <div className="ta-header">
                    <div>
                      <div className="ta-title">Add more members</div>
                      <div className="ta-subtitle">
                        You can add other members to collaborate on this career.
                      </div>
                    </div>
                    <TeamAccessAdd />
                  </div>

                  <div className="ta-divider" />

                  <TeamAccessList />

                  <div className="ta-footnote">
                    *Admins can view all careers regardless of specific access settings.
                  </div>
                </div>
              </TeamAccessProvider>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="tips-sidebar">
          <div className="blue-tips tips-sticky">
            <h2 className="section-title-tips">Tips</h2>
            <div className="white-inner">
              <p className="tip-paragraph">
                <strong>Use clear, standard job titles</strong> for better searchability
                (e.g., “Software Engineer” instead of “Code Ninja” or “Tech Rockstar”).
              </p>
              <p className="tip-paragraph">
                <strong>Avoid abbreviations</strong> or internal role codes that applicants may not understand
                (e.g., use “QA Engineer” instead of “QE II” or “QA-TL”).
              </p>
              <p className="tip-paragraph">
                <strong>Keep it concise</strong> — job titles should be no more than a few words (2–4 max),
                avoiding fluff or marketing terms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
