// CVreviewndScreening.tsx
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

/* ---------- Props (now accepts controlled props for CV screening data) ---------- */
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

  // controlled CV screen props (optional)
  cvScreening?: string;
  setCvScreening?: (s: string) => void;
  cvSecretPrompt?: string;
  setCvSecretPrompt?: (s: string) => void;
  preScreenQuestions?: string[]; // parent keeps as string[] for simplicity
  setPreScreenQuestions?: (qs: string[]) => void;
};

const CV_SCREENING_OPTIONS = [
  "Good Fit and above",
  "Only Strong Fit",
  "No Automatic Promotion",
];

export default function CVReviewAndScreening({
  initialFormData,
  initialMembers,
  careerId,
  onBack,
  onNext,
  cvScreening: propCvScreening,
  setCvScreening: propSetCvScreening,
  cvSecretPrompt: propCvSecretPrompt,
  setCvSecretPrompt: propSetCvSecretPrompt,
  preScreenQuestions: propPreScreenQuestions,
  setPreScreenQuestions: propSetPreScreenQuestions,
}: Props) {
  const { orgID, user } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // formData (same as parent shape) - used to display current job title etc
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
      jobDescription: initialFormData.jobDescription ?? prev.jobDescription,
    }));
  }, [initialFormData]);

  // ---------- LOCAL copies (fallback to props) ----------
  const [localCvScreening, setLocalCvScreening] = useState<string>(propCvScreening ?? CV_SCREENING_OPTIONS[0]);
  const [localCvSecretPrompt, setLocalCvSecretPrompt] = useState<string>(propCvSecretPrompt ?? "");
  const [localPreScreenQuestions, setLocalPreScreenQuestions] = useState<string[]>(propPreScreenQuestions ?? []);

  // sync when parent updates controlled props
  useEffect(() => {
    if (propCvScreening !== undefined) setLocalCvScreening(propCvScreening);
  }, [propCvScreening]);

  useEffect(() => {
    if (propCvSecretPrompt !== undefined) setLocalCvSecretPrompt(propCvSecretPrompt);
  }, [propCvSecretPrompt]);

  useEffect(() => {
    if (propPreScreenQuestions !== undefined) setLocalPreScreenQuestions(propPreScreenQuestions);
  }, [propPreScreenQuestions]);

  // helpers to update both local + parent (if setter provided)
  const updateCvScreening = (val: string) => {
    setLocalCvScreening(val);
    propSetCvScreening?.(val);
  };
  const updateCvSecretPrompt = (val: string) => {
    setLocalCvSecretPrompt(val);
    propSetCvSecretPrompt?.(val);
  };
  const updatePreScreenQuestions = (qs: string[]) => {
    setLocalPreScreenQuestions(qs);
    propSetPreScreenQuestions?.(qs);
  };

  // progress step (this component represents step 2)
  const [activeStep] = useState(2);
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
        const orgDetails = await axios.post("/api/feth-org-details", { orgID: activeOrg?._id });
        setAvailableJobSlots((orgDetails.data?.plan?.jobLimit || 3) + (orgDetails.data?.extraJobSlots || 0));
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

  const step2Percent = useMemo(() => {
    const secretPct = localCvSecretPrompt.trim().length > 0 ? 25 : 0;
    const questionsPct = (localPreScreenQuestions && localPreScreenQuestions.length > 0) ? 25 : 0;
    return Math.min(50, secretPct + questionsPct);
  }, [localCvSecretPrompt, localPreScreenQuestions]);

  /* ---------- track per-step percent and sync live edits ---------- */
  const [stepPercents, setStepPercents] = useState<Record<number, number>>(() =>
    steps.reduce((acc, s) => ({ ...acc, [s.number]: 0 }), {})
  );

  const setStepPercent = (stepNumber: number, percent: number) => {
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    setStepPercents((prev) => ({ ...prev, [stepNumber]: p }));
  };

  useEffect(() => {
    setStepPercent(1, step1Percent);
  }, [step1Percent]);

  useEffect(() => {
    setStepPercent(2, step2Percent);
  }, [step2Percent]);

  const [localCareerId, setLocalCareerId] = useState<string | undefined>(careerId);
  useEffect(() => {
    if (careerId) setLocalCareerId(careerId);
  }, [careerId]);

  const createCareer = async (status: Status) => {
    const safeQuestions = (localPreScreenQuestions && localPreScreenQuestions.length > 0)
      ? localPreScreenQuestions.map((q, i) => ({ id: `q${i + 1}`, text: typeof q === "string" ? q : String(q) }))
      : [{ id: "placeholder_q1", text: "No screening questions provided yet." }];

    const payload: any = {
      cvScreening: localCvScreening,
      cvSecretPrompt: localCvSecretPrompt,
      preScreenQuestions: localPreScreenQuestions,
      // note: include other fields that backend expects — you can extend this payload
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
      setStepPercent(activeStep, 100);
      candidateActionToast("Career saved successfully!", 1200, <i className="la la-check mr-1 text-success"></i>);
      onNext?.();
    } catch (error) {
      console.error("Error saving career:", error);
      errorToast("Error saving career", 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsUnpublished = async () => {
    try {
      setLoading(true);
      await createCareer("Unpublished");
      candidateActionToast("Saved as Unpublished", 1200, <i className="la la-save mr-1 text-info"></i>);
    } catch (err) {
      console.error(err);
      errorToast("Error saving career", 1500);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Pre-screen helpers (use local + notify parent) ---------- */
  const addCustomPreScreen = (q?: string) => {
    const newQ = (q ?? "").trim();
    if (!newQ) return;
    const updated = [...localPreScreenQuestions, newQ];
    updatePreScreenQuestions(updated);
  };
  const removePreScreen = (index: number) => {
    const updated = localPreScreenQuestions.filter((_, i) => i !== index);
    updatePreScreenQuestions(updated);
  };
  const addSuggested = (title: string, desc: string) => {
    const composed = `${title}\n${desc}`;
    if (localPreScreenQuestions.includes(composed)) return;
    updatePreScreenQuestions([...localPreScreenQuestions, composed]);
  };

  /* ---------- Render ---------- */
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
                <div className={["mcircle", isActive ? "is-active" : isDone ? "is-done" : "is-upcoming"].join(" ")} aria-hidden>
                  {isDone ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
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
                    {/* use the controlled local state and writer helper */}
                    <CVScreening value={localCvScreening} onChange={(val: string) => updateCvScreening(val)} />
                  </div>

                  <div style={{ height: 1, background: "#eef0f2", margin: "18px 0" }} />
                </div>
              </div>

              <div style={{ marginTop: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span className="sparkle-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      focusable="false"
                      role="img"
                      aria-label="sparkle"
                    >
                      <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z" fill="url(#gradient1)"/>
                      <defs>
                        <linearGradient id="gradient1" x1="5" y1="3" x2="19" y2="17" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#F9A8D4" />
                          <stop offset="1" stopColor="#93C5FD" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>CV Secret Prompt</span>
                    <span style={{ color: "#9ca3af" }}>(optional)</span>
                  </div>

                  <div className="cv-tooltip">
                    <button className="cv-tooltip-trigger" aria-label="Info">?</button>
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
                  value={localCvSecretPrompt}
                  onChange={(e) => updateCvSecretPrompt(e.target.value)}
                  className="textarea-input"
                  rows={5}
                  style={{ minHeight: 110 }}
                />
              </div>
            </div>
          </div>

          {/* Pre-Screening Questions */}
          <PreScreening
            initialQuestions={localPreScreenQuestions}
            onChange={(questions: any[]) => updatePreScreenQuestions(questions as string[])}
          />
        </div>

        {/* Right tips column */}
        <div className="tips-sidebar">
          <div className="blue-tips tips-sticky">
            <h2 className="section-title-tips">
              <span className="tips-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 19h6v1a3 3 0 0 1-6 0v-1z" fill="url(#bulbGradient)"/>
                  <path d="M12 3a7 7 0 0 0-4.95 11.95c.56.57.95 1.21 1.18 1.94H15.8c.23-.73.62-1.37 1.18-1.94A7 7 0 0 0 12 3z" fill="url(#bulbGradient)"/>
                  <defs>
                    <linearGradient id="bulbGradient" x1="6" y1="3" x2="18" y2="21" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#F9A8D4" />
                      <stop offset="1" stopColor="#A5B4FC" />
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
