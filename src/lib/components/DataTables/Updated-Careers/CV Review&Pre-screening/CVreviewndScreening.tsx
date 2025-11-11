// CVReviewAndScreening.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useAppContext } from "@/lib/context/AppContext";
import { useLocalStorage } from "../../../../hooks/useLocalStorage";
import { errorToast, candidateActionToast } from "@/lib/Utils";
import "@/lib/styles/CareersTableV2-Style.scss";
import JobDescription from "@/lib/components/DataTables/Updated-Careers/CareerDetails&TeamAccess/JobDescription";
import "@/lib/styles/cvreviewandscreening.scss";
import PreScreening from '@/lib/components/DataTables/Updated-Careers/CV Review&Pre-screening/Pre-Screening'
import CVScreening from '@/lib/components/DataTables/Updated-Careers/CV Review&Pre-screening/CVScreening'
import { GET } from '@/app/api/get-careers/route'
import { POST } from '@/app/api/update-career/route'
/* ---------- Types ---------- */
type Status = "Published" | "Unpublished";
type Errors = Partial<
  Record<
    | "jobTitle"
    | "employmentType"
    | "arrangement"
    | "state"
    | "city"
    | "minSalary"
    | "maxSalary"
    | "jobDescription",
    string
  >
>;

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

const TA_DIRECTORY = [
  { id: "darlene", name: "Darlene Santo Tomas", email: "darlene@whitecloak.com", avatarUrl: "", avatarText: "D" },
  { id: "demi", name: "Demi Wilkinson", email: "demi@whitecloak.com", avatarUrl: "", avatarText: "D" },
  { id: "drew", name: "Drew Cano", email: "drew@whitecloak.com", avatarUrl: "", avatarText: "D" },
  { id: "candice", name: "Candice Wu", email: "candice@whitecloak.com", avatarUrl: "", avatarText: "C" },
  { id: "lana", name: "Lana Steiner", email: "lana@whitecloak.com", avatarUrl: "", avatarText: "L" },
  { id: "natali", name: "Natali Craig", email: "natali@whitecloak.com", avatarUrl: "", avatarText: "N" },
];

const TA_ROLES = [
  { key: "owner", title: "Job Owner", desc: "Leads the hiring process for assigned jobs. Has access with all career settings." },
  { key: "contributor", title: "Contributor", desc: "Helps evaluate candidates and assist with hiring tasks. Can move candidates through the pipeline, but cannot change any career settings." },
  { key: "reviewer", title: "Reviewer", desc: "Reviews candidates and provides feedback. Can only view candidate profiles and comment." },
];

const TAContext = React.createContext<TAState | null>(null);

/* ---------- Team Access hooks + components (copied/adapted) ---------- */

function useTeamAccessState(user: any, initialMembers?: Member[]): TAState {
  const [members, setMembers] = useState<Member[]>(() => initialMembers ?? []);

  useEffect(() => {
    // If initialMembers came from parent, prefer them and do not overwrite
    if (initialMembers && initialMembers.length) {
      setMembers(initialMembers);
      return;
    }

    if (user) {
      const owner: Member = {
        id: user.id || user.email || "owner",
        name: user.name || "You",
        email: user.email || "",
        avatarUrl: (user as any).image || "",
        avatarText: user.name ? user.name.charAt(0).toUpperCase() : "Y",
        role: "owner",
        you: true,
      };

      setMembers([
        owner,
        {
          id: "darlene",
          name: "Darlene Santo Tomas",
          email: "darlene@whitecloak.com",
          avatarText: "D",
          role: "contributor",
        },
      ]);
    }
  }, [user, initialMembers]);

  const addMember = (p: Omit<Member, "role">) => {
    if (members.some((m) => m.id === p.id)) return;
    setMembers((prev) => [...prev, { ...p, role: "reviewer" }]);
  };
  const removeMember = (id: string) => setMembers((prev) => prev.filter((m) => m.id !== id));
  const updateRole = (id: string, role: Member["role"]) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));

  return { members, addMember, removeMember, updateRole };
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
      (p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
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
        onClick={() => setOpen((v) => !v)}
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
            {results.map((p) => (
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
      {ctx.members.map((m) => {
        const role = TA_ROLES.find((r) => r.key === m.role)!;
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
                    {TA_ROLES.map((r) => {
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

function TeamAccessWarningIfNoOwner() {
  const ctx = React.useContext(TAContext);
  const hasOwner = !!ctx && ctx.members.some((m) => m.role === "owner");

  if (hasOwner) return null;

  return (
    <div
      className="ta-error-alert"
      role="alert"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: "#fff5f5",
        color: "#c53030",
        borderRadius: "8px",
        fontSize: "13px",
        marginBottom: "12px",
        gap: "8px",
      }}
    >
      <span className="ta-alert-icon" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9v4" stroke="#c53030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 17h.01" stroke="#c53030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#c53030" strokeWidth="1.0" strokeLinejoin="round" fill="none" />
        </svg>
      </span>
      <span className="ta-alert-text">Career must have a job owner. Please assign a job owner.</span>
    </div>
  );
}


type Props = {
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
  careerId?: string;
  onBack?: () => void;
  onNext?: () => void;
};

export default function CVReviewAndScreening({
  initialFormData,
  initialMembers,
  careerId,
  onBack,
  onNext,
}: Props) {
  const { orgID, user } = useAppContext();
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

  // hydrate formData from initialFormData on mount / when it changes
  useEffect(() => {
    if (!initialFormData) return;
    setFormData((prev) => ({
      ...prev,
      jobTitle: initialFormData.jobTitle ?? prev.jobTitle,
      employmentType: initialFormData.employmentType ?? prev.employmentType,
      arrangement: initialFormData.arrangement ?? prev.arrangement,
      country: initialFormData.country ?? prev.country,
      state: initialFormData.state ?? prev.state,
      city: initialFormData.city ?? prev.city,
      minSalary: initialFormData.minSalary ?? prev.minSalary,
      maxSalary: initialFormData.maxSalary ?? prev.maxSalary,
      negotiable: initialFormData.negotiable ?? prev.negotiable,
      jobDescription: initialFormData.jobDescription ?? prev.jobDescription, // <-- added
    }));
  }, [initialFormData]);


  // CV Review / Pre-screening state
  const CV_SCREENING_OPTIONS = [
    "Good Fit and above",
    "Only Strong Fit",
    "No Automatic Promotion",
  ];
  const [cvScreening, setCvScreening] = useState<string>(CV_SCREENING_OPTIONS[0]);
  const [cvSecretPrompt, setCvSecretPrompt] = useState<string>("");
  const [preScreenQuestions, setPreScreenQuestions] = useState<any[]>([]); // structured array from child
  const suggestedPreScreenQuestions = [
    { title: "Notice Period", desc: "How long is your notice period?" },
    { title: "Work Setup", desc: "How often are you willing to report to the office each week?" },
    { title: "Asking Salary", desc: "How much is your expected monthly salary?" },
  ];

  const [activeStep, setActiveStep] = useState(2); // show CV Review step active in screenshot
  const steps = [
    { number: 1, title: "Career Details & Team Access" },
    { number: 2, title: "CV Review & Pre-screening" },
    { number: 3, title: "AI Interview Setup" },
    { number: 4, title: "Pipeline Stages" },
    { number: 5, title: "Review Career" },
  ];

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
            userEmail: (user as any)?.email,
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
  }, [orgID, (user as any)?.email]);

  /* ---------- Validation (same as before) ---------- */
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


    return errors;
  }, [formData]);

  const hasErrors = Object.keys(validate).length > 0;

  // % completion (keeps previous logic)
  const step1Percent = useMemo(() => {
    const checks = [
      !!formData.jobTitle.trim(),
      !!formData.employmentType,
      !!formData.arrangement,
      !!formData.state,
      !!formData.city,
      formData.negotiable ? true : formData.minSalary !== "" && formData.maxSalary !== "",
    ];
    const score = checks.filter(Boolean).length;
    return Math.round((score / checks.length) * 100);
  }, [formData]);

  // === NEW logic per your request ===
  // - CV secret prompt present => +25%
  // - Any pre-screening questions present => +25%
  // - they stack (so both => 50%), capped at 50%
  const step2Percent = useMemo(() => {
    const secretPct = cvSecretPrompt.trim().length > 0 ? 25 : 0;
    const questionsPct = (preScreenQuestions && preScreenQuestions.length > 0) ? 25 : 0;
    return Math.min(50, secretPct + questionsPct);
  }, [cvSecretPrompt, preScreenQuestions]);

  /* ---------- track per-step percent and sync live edits ---------- */
  const [stepPercents, setStepPercents] = useState<Record<number, number>>(() =>
    steps.reduce((acc, s) => ({ ...acc, [s.number]: 0 }), {})
  );

  const setStepPercent = (stepNumber: number, percent: number) => {
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    setStepPercents((prev) => ({ ...prev, [stepNumber]: p }));
  };

  // keep step 1 & step 2 in sync with computed percents while editing
  useEffect(() => {
    setStepPercent(1, step1Percent);
  }, [step1Percent]);

  useEffect(() => {
    // we store the raw percent (0..50) for step 2 so other logic can read it
    setStepPercent(2, step2Percent);
  }, [step2Percent]);


  const taState = useTeamAccessState(user, initialMembers);

  const [localCareerId, setLocalCareerId] = useState<string | undefined>(careerId);

  useEffect(() => {
    if (careerId) setLocalCareerId(careerId);
  }, [careerId]);

  const createCareer = async (status: Status) => {
    
    const safeQuestions = (preScreenQuestions && preScreenQuestions.length > 0)
      ? preScreenQuestions.map((q, i) => ({ id: `q${i + 1}`, text: typeof q === "string" ? q : q.title ?? "" }))
      : [{ id: "placeholder_q1", text: "No screening questions provided yet." }];

    const payload: any = {
      cvScreening,
      cvSecretPrompt,
      preScreenQuestions, 
    };

    try {
      if (localCareerId) {
        
        const res = await axios.post("/api/update-career", { _id: localCareerId, ...payload });
        console.log("update-career result:", res?.data);
        return res.data;
      } else {
        
        const res = await axios.post("/api/add-career", payload);
        console.log("add-career result:", res?.data);

        const result = res.data ?? {};
        
        const insertedId =
          (result.insertedId && String(result.insertedId)) ||
          (result.career && (result.career._id || result.career.id)) ||
          (result._id && String(result._id)) ||
          undefined;

        if (insertedId) {
          setLocalCareerId(String(insertedId));
          console.log("Created career inside CVReviewAndScreening; stored localCareerId =", insertedId);
        } else {
          console.warn("add-career did not return insertedId — check backend response:", result);
        }

        return result;
      }
    } catch (err: any) {
      if (err?.response) {
        console.error("createCareer server response status:", err.response.status);
        console.error("createCareer server response data:", err.response.data);
        errorToast(err.response.data?.error || "Server rejected the request", 2000);
      } else {
        console.error("createCareer network/error:", err);
        errorToast("Network or unexpected error", 2000);
      }
      throw err;
    }
  };


  const handleSaveAndContinue = async () => {
    if (!orgID || !(user as any)?.email) {
      errorToast("Missing organization or user context", 1500);
      return;
    }

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

      const result = await createCareer(statusToUse);

      // mark current step complete (100%) after successful save
      setStepPercent(activeStep, 100);

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

      // call parent handler to move to next step/route
      onNext?.();
    } catch (error) {
      console.error("Error saving career:", error);
      errorToast("Error saving career", 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsUnpublished = async () => {
    if (!orgID || !(user as any)?.email) {
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

  /* ---------- Pre-screen helpers ---------- */
  const addCustomPreScreen = (q?: string) => {
    const newQ = (q ?? "").trim();
    if (!newQ) return;
    setPreScreenQuestions((s) => [...s, newQ]);
  };
  const removePreScreen = (index: number) =>
    setPreScreenQuestions((s) => s.filter((_, i) => i !== index));
  const addSuggested = (title: string, desc: string) => {
    const composed = `${title}\n${desc}`;
    if (preScreenQuestions.includes(composed)) return;
    setPreScreenQuestions((s) => [...s, composed]);
  };

  /* ---------- Render (UI unchanged) ---------- */
  return (
    <>
      {/* Header */}
      <div className="add-career-header">
        <div className="header-left">
          <div>
            <h1 className="header-title">{formData.jobTitle ? `[Draft] ${formData.jobTitle}` : "[Draft] Software Engineer - Java"}</h1>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
              Careers &nbsp;›&nbsp; Add new career
            </div>
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

      {/* Steps */}
      <div className="steps-modern">
        {steps.map((step, index) => {
          const isActive = step.number === activeStep;
          const isDone = step.number < activeStep;
          const isLast = index === steps.length - 1;

          const fillPercent = stepPercents[step.number] ?? (isDone ? 100 : 0);

          // For step 2 we intentionally cap the active display at 50% (per requirement).
          // Other steps use up to 100% as before.
          const displayFill = isActive
            ? step.number === 2
              ? `${Math.max(0, Math.min(fillPercent, 50))}%`
              : `${Math.max(0, Math.min(fillPercent, 100))}%`
            : isDone
            ? "100%"
            : "0%";

          return (
            <div className="mstep" key={step.number}>
              <div className="mhead">
                <div
                  className={[
                    "mcircle",
                    isActive ? "is-active" : isDone ? "is-done" : "is-upcoming",
                  ].join(" ")}
                  aria-hidden
                >
                  {/* show check when done, otherwise the dot (or active style) */}
                  {isDone ? (
                    // check icon (white check on filled circle)
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    // keep existing dot indicator for active/upcoming
                    <span className={["mcircle-dot", isActive ? "dot-active" : isDone ? "dot-done" : "dot-upcoming"].join(" ")} />
                  )}
                </div>

                {!isLast && <div className="mconnector" style={{ ["--fill" as any]: displayFill } as React.CSSProperties} />}
              </div>

              <div className={["mlabel", isActive ? "mlabel-active" : "mlabel-upcoming"].join(" ")}>{step.title}</div>
            </div>
          );
        })}

      </div>

      {/* Main content area */}
      <div className="add-career-main" style={{ alignItems: "flex-start" }}>
        <div className="form-section" style={{ flex: 1 }}>
          {/* CV Review Settings */}
          <div className="blue-wrap">
            <h2 className="section-title">1. CV Review Settings</h2>
            <div className="white-inner">
              <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label">CV Screening</label>
                  <div style={{ marginBottom: 8, color: "#6b7280" }}>
                    Jia automatically endorses candidates who meet the chosen criteria.
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>

                    <CVScreening value={cvScreening} onChange={(val: string) => setCvScreening(val)} />



                  </div>

                  <div style={{ height: 1, background: "#eef0f2", margin: "18px 0" }} />
                </div>
              </div>

              <div style={{ marginTop: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  {/* Sparkle icon (gradient pastel stars) */}
                  <span className="sparkle-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      focusable="false"
                      role="img"
                      aria-label="sparkle"
                    >
                      <path
                        d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"
                        fill="url(#gradient1)"
                      />
                      <path
                        d="M18 12L18.8 14.2L21 15L18.8 15.8L18 18L17.2 15.8L15 15L17.2 14.2L18 12Z"
                        fill="url(#gradient2)"
                      />
                      <path
                        d="M7 13L7.5 14.5L9 15L7.5 15.5L7 17L6.5 15.5L5 15L6.5 14.5L7 13Z"
                        fill="url(#gradient3)"
                      />
                      <defs>
                        <linearGradient id="gradient1" x1="5" y1="3" x2="19" y2="17" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#F9A8D4" />   {/* pink */}
                          <stop offset="1" stopColor="#93C5FD" /> {/* blue */}
                        </linearGradient>
                        <linearGradient id="gradient2" x1="15" y1="12" x2="21" y2="18" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#C4B5FD" /> {/* violet */}
                          <stop offset="1" stopColor="#A5B4FC" />
                        </linearGradient>
                        <linearGradient id="gradient3" x1="5" y1="13" x2="9" y2="17" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FBCFE8" /> {/* light pink */}
                          <stop offset="1" stopColor="#BFDBFE" /> {/* sky blue */}
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>CV Secret Prompt</span>
                    <span style={{ color: "#9ca3af" }}>(optional)</span>
                  </div>

                  <div className="cv-tooltip">
                    <button
                      className="cv-tooltip-trigger"
                      aria-label="Info"
                    >
                      ?
                    </button>
                    <div className="cv-tooltip-box">
                      These prompts remain hidden from candidates and the public job portal.
                      Additionally, only Admins and the Job Owner can view the secret prompt.
                      <div className="cv-tooltip-arrow" />
                    </div>
                  </div>

                </div>

                <div style={{ color: "#6b7280", marginBottom: 8, maxWidth: 730 }}>
                  Secret Prompts give you extra control over Jia's evaluation style, complementing her accurate assessment of requirements from the job description.
                </div>

                <textarea
                  placeholder="Enter a secret prompt (e.g. Give higher fit scores to candidates who participate in hackathons or competitions.)"
                  value={cvSecretPrompt}
                  onChange={(e) => setCvSecretPrompt(e.target.value)}
                  className="textarea-input"
                  rows={5}
                  style={{ minHeight: 110 }}
                />
              </div>
            </div>
          </div>

          {/* Pre-Screening Questions */}
          <PreScreening
            initialQuestions={preScreenQuestions}
            onChange={(questions: any[]) => setPreScreenQuestions(questions)}
          />




        </div>

        {/* Right tips column */}
        <div className="tips-sidebar">
          <div className="blue-tips tips-sticky">
            <h2 className="section-title-tips">
              <span className="tips-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* bulb shape */}
                  <path
                    d="M9 19h6v1a3 3 0 0 1-6 0v-1z"
                    fill="url(#bulbGradient)"
                  />
                  <path
                    d="M12 3a7 7 0 0 0-4.95 11.95c.56.57.95 1.21 1.18 1.94H15.8c.23-.73.62-1.37 1.18-1.94A7 7 0 0 0 12 3z"
                    fill="url(#bulbGradient)"
                  />
                  {/* sparkles */}
                  <g transform="scale(1.3) translate(0, -2)">
                    <path
                      d="M18 4l.6 1.4L20 6l-1.4.6L18 8l-.6-1.4L16 6l1.4-.6L18 4zM20 9l.4.8.9.2-.7.7.2.9-.8-.4-.8.4.2-.9-.7-.7.9-.2L20 9z"
                      fill="url(#sparkleGradient)"
                    />
                  </g>
                  <defs>
                    <linearGradient id="bulbGradient" x1="6" y1="3" x2="18" y2="21" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#F9A8D4" /> {/* pink */}
                      <stop offset="1" stopColor="#A5B4FC" /> {/* purple-blue */}
                    </linearGradient>
                    <linearGradient id="sparkleGradient" x1="16" y1="4" x2="21" y2="10" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#C7D2FE" /> {/* soft blue */}
                      <stop offset="1" stopColor="#FBCFE8" /> {/* soft pink */}
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              Tips
            </h2>

            <div className="white-inner">
              <p className="tip-paragraph">
                <strong>Add a Secret Prompt</strong> to fine-tune how Jia scores and evaluates submitted CVs.
              </p>
              <p className="tip-paragraph">
                <strong>Add Pre-Screening questions</strong> to collect key details such as notice period, work setup, or salary expectations to guide review and candidate discussions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
