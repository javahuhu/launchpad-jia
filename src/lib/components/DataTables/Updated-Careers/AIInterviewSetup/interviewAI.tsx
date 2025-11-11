// InterviewAI.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAppContext } from "@/lib/context/AppContext";
import { useLocalStorage } from "../../../../hooks/useLocalStorage";
import { errorToast, candidateActionToast } from "@/lib/Utils";
import "@/lib/styles/CareersTableV2-Style.scss";
import "@/lib/styles/cvreviewandscreening.scss";
import AISettings from '@/lib/components/DataTables/Updated-Careers/AIInterviewSetup/interviewAIsettings';
import AIQuestion from '@/lib/components/DataTables/Updated-Careers/AIInterviewSetup/interviewAIQuestion';

type Status = "Published" | "Unpublished";
type Member = {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    avatarText?: string;
    role: "owner" | "contributor" | "reviewer";
    you?: boolean;
};

const MIN_QUESTIONS = 5;

export default function InterviewAI({
    initialFormData,
    initialMembers,
    careerId,
    onBack,
    onNext,
}: {
    initialFormData?: any;
    initialMembers?: Member[];
    careerId?: string;
    onBack?: () => void;
    onNext?: () => void;
}) {
    const { orgID, user } = useAppContext();
    const [loading, setLoading] = useState(false);

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

    // --- NEW AI fields (separate from CV review) ---
    const CV_SCREENING_OPTIONS = [
        "Good Fit and above",
        "Only Strong Fit",
        "No Automatic Promotion",
    ];
    const [AIScreening, setAIScreening] = useState<string>(CV_SCREENING_OPTIONS[0]);
    const [AIinterviewsecretprompt, setAIinterviewsecretprompt] = useState<string>("");
    const [requriedvideo, setRequriedvideo] = useState<boolean>(false);

    // THIS is the canonical interview questions structure kept in parent
    // shape: [{ categoryId, categoryName, questions: string[] }, ...]
    const [AiinterviewQuestion, setAiinterviewQuestion] = useState<
        { categoryId: string; categoryName: string; questions: string[] }[]
    >([]);

    // show errors only after user attempted save
    const [attemptSave, setAttemptSave] = useState<boolean>(false);
    const [aiQuestionsError, setAiQuestionsError] = useState<string | null>(null);
    const [aiSecretError, setAiSecretError] = useState<string | null>(null);

    /* ----------------------- STEPS / PROGRESS LOGIC (APPLIED HERE) ----------------------- */
    const [activeStep] = useState(3);
    const steps = [
        { number: 1, title: "Career Details & Team Access" },
        { number: 2, title: "CV Review & Pre-screening" },
        { number: 3, title: "AI Interview Setup" },
        { number: 4, title: "Pipeline Stages" },
        { number: 5, title: "Review Career" },
    ];

    // step percent state + helper
    const [stepPercents, setStepPercents] = useState<Record<number, number>>({});
    const setStepPercent = (stepNumber: number, percent: number) => {
        const p = Math.max(0, Math.min(100, Math.round(percent)));
        setStepPercents((prev) => ({ ...prev, [stepNumber]: p }));
    };

    // compute total questions count from AiinterviewQuestion structure
    const totalQuestions = AiinterviewQuestion.reduce((sum, c) => sum + (c.questions?.length || 0), 0);

    // compute progress for step 3: secret prompt = +25%, each question = +10% up to +25% (so cap 50%)
    const step3Percent = useMemo(() => {
        const base = AIinterviewsecretprompt.trim() ? 25 : 0;
        const questionPoints = Math.min(totalQuestions * 10, 25); // questions contribute up to 25
        return Math.min(50, base + questionPoints);
    }, [AIinterviewsecretprompt, totalQuestions]);

    useEffect(() => {
        // update percent for step 3 whenever secret or questions change
        setStepPercent(3, step3Percent);
    }, [step3Percent]);
    /* ------------------------------------------------------------------------------ */

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

    const validate = useMemo(() => {
        const errors: Record<string, string> = {};

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

    const createCareer = async (status: Status) => {
        // Build AiinterviewQuestion payload: number each question within its category
        const AiinterviewQuestionForPayload = (AiinterviewQuestion || []).reduce((acc: Record<string, string[]>, cat: any) => {
            // support different possible key names for category title
            const categoryName = cat.categoryName || cat.name || cat.title || cat.categoryId || "Other";

            // ensure questions array exists
            const qs: string[] = Array.isArray(cat.questions) ? cat.questions : [];

            // map each question to its text
            acc[categoryName] = qs.map((q: string, i: number) => `${q}`);

            return acc;
        }, {});

        const payload: any = {
            requriedvideo,
            AIScreening,
            AIinterviewsecretprompt,
            AiinterviewQuestion: AiinterviewQuestionForPayload,
        };

        try {
            if (careerId) {
                const res = await axios.post("/api/update-career", { _id: careerId, ...payload });
                return res.data;
            } else {
                const res = await axios.post("/api/add-career", payload);
                return res.data;
            }
        } catch (err) {
            throw err;
        }
    };

    const totalInterviewQuestions = totalQuestions;

    const handleSaveAndContinue = async () => {
        if (!orgID || !(user as any)?.email) {
            errorToast("Missing organization or user context", 1500);
            return;
        }

        setAttemptSave(true);
        setAiQuestionsError(null);
        setAiSecretError(null);

        if (hasErrors) {
            candidateActionToast(
                "Please complete required fields.",
                1600,
                <i className="la la-exclamation-triangle mr-1 text-danger"></i>
            );
            return;
        }

        // require AI secret prompt
        if (!AIinterviewsecretprompt.trim()) {
            setAiSecretError("This field is required.");
            candidateActionToast(
                "Please enter AI interview secret prompt.",
                1600,
                <i className="la la-exclamation-triangle mr-1 text-danger"></i>
            );
            return;
        }

        // validate minimum questions using the structured data
        if (totalInterviewQuestions < MIN_QUESTIONS) {
            setAiQuestionsError(`Please add at least ${MIN_QUESTIONS} interview questions.`);
            candidateActionToast(
                `Please add at least ${MIN_QUESTIONS} interview questions.`,
                1800,
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
        } catch (error) {
            console.error(error);
            errorToast("Error saving career", 1500);
        } finally {
            setLoading(false);
        }
    };

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
                    const fill = isActive ? `${Math.max(0, Math.min(fillPercent, 100))}%` : isDone ? "100%" : "0%";

                    return (
                        <div className="mstep" key={step.number}>
                            <div className="mhead">
                                <div className={["mcircle", isActive ? "is-active" : isDone ? "is-done" : "is-upcoming"].join(" ")} aria-hidden>
                                    {isDone ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    ) : (
                                        <span className={["mcircle-dot", isActive ? "dot-active" : isDone ? "dot-done" : "dot-upcoming"].join(" ")} />
                                    )}
                                </div>

                                {!isLast && <div className="mconnector" style={{ ["--fill" as any]: fill } as React.CSSProperties} />}
                            </div>

                            <div className={["mlabel", isActive ? "mlabel-active" : "mlabel-upcoming"].join(" ")}>{step.title}</div>
                        </div>
                    );
                })}
            </div>

            {/* Main content */}
            <div className="add-career-main" style={{ alignItems: "flex-start" }}>
                <div className="form-section" style={{ flex: 1 }}>
                    {/* AI Interview Settings */}
                    <div className="blue-wrap">
                        <h2 className="section-title">1. AI Interview Settings</h2>
                        <div className="white-inner">
                            <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                                <div style={{ flex: 1 }}>
                                    <label className="input-label">AI Interview Screening</label>
                                    <div style={{ marginBottom: 8, color: "#6b7280" }}>
                                        Jia automatically endorses candidates who meet the chosen criteria.
                                    </div>

                                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                        <AISettings value={AIScreening} onChange={(val: string) => setAIScreening(val)} />
                                    </div>

                                    <div style={{ padding: "18px 0", borderTop: "1px solid #eef0f2", borderBottom: "1px solid #eef0f2", margin: "20px 0" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "6px" }}>Require Video on Interview</div>
                                                <div style={{ color: "#6b7280", fontSize: "14px" }}>
                                                    Require candidates to keep their camera on. Recordings will appear on their analysis page.
                                                </div>
                                            </div>

                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <svg width="18" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ opacity: 0.9 }}>
                                                        <rect x="0.5" y="2" width="13.5" height="10" rx="2" stroke="#374151" strokeWidth="1.2" fill="none" />
                                                        <path d="M15 4.5l4-2.5v10l-4-2.5V4.5z" fill="none" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    <span style={{ color: "#111827", fontSize: "15px" }}>Require Video Interview</span>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <label style={{ display: "inline-block", width: 46, height: 26, position: "relative", cursor: "pointer", userSelect: "none" }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={requriedvideo}
                                                            onChange={(e) => setRequriedvideo(e.target.checked)}
                                                            style={{
                                                                position: "absolute", width: 1, height: 1, padding: 0, margin: -1, border: 0,
                                                                clip: "rect(0 0 0 0)", overflow: "hidden", whiteSpace: "nowrap"
                                                            }}
                                                            aria-checked={requriedvideo}
                                                        />
                                                        <span aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 9999, background: requriedvideo ? "linear-gradient(90deg, #fbcfe8 0%, #a5b4fc 100%)" : "#e5e7eb", transition: "background 260ms ease" }} />
                                                        <span aria-hidden style={{ position: "absolute", top: 3, left: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: requriedvideo ? "0 6px 14px rgba(10,15,30,0.18)" : "0 1px 3px rgba(2,6,23,0.12)", transform: requriedvideo ? "translateX(20px)" : "translateX(0)", transition: "transform 260ms cubic-bezier(.2,.8,.2,1), box-shadow 260ms ease" }} />
                                                    </label>

                                                    <span style={{ color: "#111827", fontSize: 15 }}>{requriedvideo ? "Yes" : "No"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 6 }}>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                                            <span className="sparkle-icon" aria-hidden="true"><span className="sparkle-icon" aria-hidden="true">
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
                                            </span></span>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

                                                <span style={{ fontWeight: 700 }}>AI Interview Secret Prompt</span>
                                                <span style={{ color: "#9ca3af" }}>(required)</span>


                                            </div>
                                            
                                        </div>

                                        <div style={{ color: "#6b7280", marginBottom: 8, maxWidth: 730 }}>
                                            Secret Prompts give you extra control over the AI interviewer.
                                        </div>

                                        <textarea
                                            placeholder="Enter AI interview secret prompt..."
                                            value={AIinterviewsecretprompt}
                                            onChange={(e) => {
                                                setAIinterviewsecretprompt(e.target.value);
                                                if (e.target.value.trim()) setAiSecretError(null);
                                            }}
                                            className="textarea-input"
                                            rows={5}
                                            style={{ minHeight: 110 }}
                                        />
                                        {aiSecretError && <div style={{ color: "#dc2626", marginTop: 8, fontSize: 13 }}>{aiSecretError}</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Interview Questions - child provides structured data into AiinterviewQuestion */}
                    <AIQuestion
                        minQuestionsRequired={MIN_QUESTIONS}
                        showWarning={attemptSave}
                        onStructuredChange={(structured) => {
                            // structured shape: [{categoryId, categoryName, questions: string[]}, ...]
                            setAiinterviewQuestion(structured);
                            if (structured.reduce((s, c) => s + (c.questions?.length || 0), 0) >= MIN_QUESTIONS) {
                                setAiQuestionsError(null);
                            }
                        }}
                    />

                    {aiQuestionsError && <div style={{ color: "#dc2626", marginTop: 8, fontSize: 13 }}>{aiQuestionsError}</div>}
                </div>

                {/* Right tips column unchanged */}
                <div className="tips-sidebar">
                    <div className="blue-tips tips-sticky">
                        <h2 className="section-title-tips">
                            <span className="tips-icon" aria-hidden="true"><svg
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
                            </svg></span>
                            Tips
                        </h2>

                        <div className="white-inner">
                            <p className="tip-paragraph">
                                <strong>Add a Secret Prompt</strong> to fine-tune how the AI evaluates interview responses
                            </p>
                            <p className="tip-paragraph">
                                <strong>Use “Generate Questions”</strong> to quickly create tailored interview questions, then refine them.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
