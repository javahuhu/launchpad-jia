// AddNewCareerForm.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useAppContext } from "@/lib/context/AppContext";
import { useLocalStorage } from "../../../../hooks/useLocalStorage";
import { errorToast, candidateActionToast } from "@/lib/Utils";
import "@/lib/styles/CareersTableV2-Style.scss";
import JobDescription from "@/lib/components/DataTables/Updated-Careers/CareerDetails&TeamAccess/JobDescription";
// import the CV Review component to render inline for step 2
import CVReviewAndScreening from "../CV Review&Pre-screening/CVreviewndScreening";
import PipelineScreen from "../Pipeline/PipelineStage";
import ReviewCareer from "../ReviewCareer/Review-Career";
import AIinterview from "../AIInterviewSetup/interviewAI";
import philippineCitiesAndProvinces from "../../../../../../public/philippines-locations.json";
import CVScreeningTile from '@/lib/components/DataTables/Updated-Careers/CV Review&Pre-screening/CVScreening'
/* ---------- Types ---------- */
type Status = "Published" | "Unpublished" | "active" | "inactive";
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

function useTeamAccessState(user: any): TAState {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (user) {
      const owner: Member = {
        id: user.id || user.email || "owner",
        name: user.name || "You",
        email: user.email || "",
        avatarUrl: user.image || "",
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
  }, [user]);

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

  const results = React.useMemo(() => {
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
    <div style={{ width: '100%' }}>
      <div className="ta-error-alert" role="alert" aria-live="polite" style={{
        display: "flex",
        alignItems: "start",
        backgroundColor: "#fff5f5",
        color: "#c53030",
        borderRadius: "8px",
        fontSize: "13px",
        marginBottom: "12px",
        gap: "8px",
        width: "100%",
        marginLeft: 0,
        marginRight: 0,
      }}>
        <span className="ta-alert-icon" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9v4" stroke="#c53030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 17h.01" stroke="#c53030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#c53030" strokeWidth="1.0" strokeLinejoin="round" fill="none" />
          </svg>
        </span>
        <span className="ta-alert-text">Career must have a job owner. Please assign a job owner.</span>
      </div>
    </div>
  );
}

/* ---------- Main Form ---------- */
export default function AddNewCareerForm() {
  const { orgID, user } = useAppContext(); // ✅ fetch user data here
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

  // --------- NEW lifted CV/Screening state (shared between Step2 and preview) ----------
  const [cvScreening, setCvScreening] = useState<string>("Good Fit and above");
  const [cvSecretPrompt, setCvSecretPrompt] = useState<string>("");
  const [preScreenQuestions, setPreScreenQuestions] = useState<string[]>([]);

  const [activeStep, setActiveStep] = useState(1);
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
  const [localCareerId, setLocalCareerId] = useState<string | undefined>(undefined);


  // ----- NEW: province/city lists and logic borrowed from CareerForm -----
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);

  useEffect(() => {
    const parseProvinces = () => {
      const provinces = (philippineCitiesAndProvinces as any).provinces || [];
      const cities = (philippineCitiesAndProvinces as any).cities || [];

      setProvinceList(provinces);

      const defaultProvince = provinces && provinces.length > 0 ? provinces[0] : null;
      if (!formData.state && defaultProvince) {
        setFormData((prev) => ({ ...prev, state: defaultProvince.name }));
        const filteredCities = cities.filter((c: any) => c.province === defaultProvince.key);
        setCityList(filteredCities);
        if (!formData.city && filteredCities.length > 0) {
          setFormData((prev) => ({ ...prev, city: filteredCities[0].name }));
        }
      } else if (formData.state) {
        const provinceObj = provinces.find((p: any) => p.name === formData.state);
        const provinceKey = provinceObj?.key;
        if (provinceKey) {
          const filteredCities = cities.filter((c: any) => c.province === provinceKey);
          setCityList(filteredCities);
          if (!formData.city && filteredCities.length > 0) {
            setFormData((prev) => ({ ...prev, city: filteredCities[0].name }));
          }
        }
      }
    };

    parseProvinces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStateChange = (stateName: string) => {
    setFormData((prev) => ({ ...prev, state: stateName, city: "" }));

    const provinces = (philippineCitiesAndProvinces as any).provinces || [];
    const cities = (philippineCitiesAndProvinces as any).cities || [];

    const provinceObj = provinces.find((p: any) => p.name === stateName);
    const provinceKey = provinceObj?.key;
    const filteredCities = provinceKey ? cities.filter((c: any) => c.province === provinceKey) : [];
    setCityList(filteredCities);

    if (filteredCities.length > 0) {
      setFormData((prev) => ({ ...prev, city: filteredCities[0].name }));
    } else {
      setFormData((prev) => ({ ...prev, city: "" }));
    }
  };

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

  const teamState = useTeamAccessState(user);

  const createCareer = async (payload: any) => {
    try {
      const res = await axios.post("/api/add-career", payload, { timeout: 30000 });
      return res.data;
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Unknown error from server";

      console.error("createCareer error:", err);
      errorToast(`Failed to create career: ${serverMsg}`, 4000);
      throw err;
    }
  };

  // Save handlers read teamState.members directly (no hooks inside handlers)
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
      // choose status based on available slots
      const statusToUse: Status = slotsFull ? "Unpublished" : "Published";

      const payload = {
        jobTitle: formData.jobTitle,
        description: formData.jobDescription,
        questions: [],
        lastEditedBy: { name: user?.name, email: user?.email, image: user?.image },
        createdBy: { name: user?.name, email: user?.email, image: user?.image },
        screeningSetting: null,
        orgID,
        requireVideo: false,
        location: formData.city,
        workSetup: formData.arrangement,
        workSetupRemarks: "",
        status: statusToUse,
        salaryNegotiable: formData.negotiable,
        minimumSalary: Number(formData.minSalary || 0),
        maximumSalary: Number(formData.maxSalary || 0),
        country: formData.country,
        province: formData.state,
        employmentType: formData.employmentType,
        teamAccess: teamState.members,
      };

      const created = await createCareer(payload);

      const maybeInsertedId =
        (created && (created.insertedId || (created.insertedId && created.insertedId.toString()))) ||
        (created && created.insertedId && String(created.insertedId)) ||
        (created && created.insertedId && created.insertedId._id && String(created.insertedId._id)) ||
        (created && created.career && (created.career._id || created.career.id)) ||
        (created && created._id) ||
        undefined;

      if (maybeInsertedId) {
        setLocalCareerId(String(maybeInsertedId));
        console.log("handleSaveAndContinue: stored localCareerId =", String(maybeInsertedId));
      } else {
        console.warn("handleSaveAndContinue: could not find insertedId in create response:", created);
      }

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

      // Move to Step 2 (CV Review). CVReviewAndScreening will receive careerId and controlled props
      setActiveStep(2);
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

      const payload = {
        jobTitle: formData.jobTitle,
        description: formData.jobDescription,
        questions: [],
        lastEditedBy: { name: user?.name, email: user?.email, image: user?.image },
        createdBy: { name: user?.name, email: user?.email, image: user?.image },
        screeningSetting: null,
        orgID,
        requireVideo: false,
        location: formData.city,
        workSetup: formData.arrangement,
        workSetupRemarks: "",
        status: "Unpublished",
        salaryNegotiable: formData.negotiable,
        minimumSalary: Number(formData.minSalary || 0),
        maximumSalary: Number(formData.maxSalary || 0),
        country: formData.country,
        province: formData.state,
        employmentType: formData.employmentType,
        teamAccess: teamState.members,
      };

      await createCareer(payload);
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

  const renderStep1 = () => (
    <>
      {/* Header */}
      <div className="add-career-header">
        <div className="header-left">
          <div>
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

          const fill = isActive ? `${Math.max(0, Math.min(step1Percent, 100))}%` : isDone ? "100%" : "0%";

          const showErrorIcon = submitted && isActive && hasErrors;

          return (
            <div className="mstep" key={step.number}>
              <div className="mhead">
                <div
                  className={[
                    "mcircle",
                    isActive ? "is-active" : "",
                    isDone ? "is-done" : "is-upcoming",
                    showErrorIcon ? "has-error" : "",
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
                      onChange={(e) => handleStateChange(e.target.value)}
                      className={`select-input ${submitted && validate.state ? "has-error" : ""}`}
                    >
                      <option value="">Choose state / province</option>
                      {provinceList.map((p) => (
                        <option key={p.key ?? p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
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
                      {cityList.map((c) => (
                        <option key={c.key ?? c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
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
                      onChange={(e) =>
                        setFormData({ ...formData, negotiable: e.target.checked })
                      }
                      className="toggle-switch"
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-text">Negotiable</span>
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
              <JobDescription
                value={formData.jobDescription}
                onChange={(html) => setFormData({ ...formData, jobDescription: html })}
                placeholder="We are seeking a talented and driven Software Engineer..."
                hasError={submitted && validate.jobDescription ? true : false}
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
              <TAContext.Provider value={teamState}>
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
                  <TeamAccessWarningIfNoOwner />
                  <TeamAccessList />
                  <div className="ta-footnote">
                    *Admins can view all careers regardless of specific access settings.
                  </div>
                </div>
              </TAContext.Provider>
            </div>
          </div>
        </div>

        {/* Tips */}
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

  const renderStep2 = () => (
    <CVReviewAndScreening
      careerId={localCareerId}
      initialFormData={formData}
      initialMembers={teamState.members}
      cvScreening={cvScreening}
      setCvScreening={setCvScreening}
      cvSecretPrompt={cvSecretPrompt}
      setCvSecretPrompt={setCvSecretPrompt}
      preScreenQuestions={preScreenQuestions}
      setPreScreenQuestions={setPreScreenQuestions}
      onBack={() => setActiveStep(1)}
      onNext={() => setActiveStep(3)}
    />
  );

  const renderStep3 = () => (
    <AIinterview
      careerId={localCareerId}
      initialFormData={formData}
      initialMembers={teamState.members}
      onBack={() => setActiveStep(2)}
      onNext={() => setActiveStep(4)}
    />
  );

  const renderStep4 = () => (
    <PipelineScreen
      careerId={localCareerId}
      initialFormData={formData}
      initialMembers={teamState.members}
      onBack={() => setActiveStep(3)}
      onNext={() => setActiveStep(5)}
    />
  );

  const renderStep5 = () => (
    <>
      
      <ReviewCareer
        careerId={localCareerId}
        initialFormData={formData}
        initialMembers={teamState.members}
        onBack={() => setActiveStep(4)}
        onNext={() => setActiveStep(6)}
      />
      
    </>
  );

  return (
    <>
      {activeStep === 1 && renderStep1()}
      {activeStep === 2 && renderStep2()}
      {activeStep === 3 && renderStep3()}
      {activeStep === 4 && renderStep4()}
      {activeStep === 5 && renderStep5()}
    </>
  );
}
