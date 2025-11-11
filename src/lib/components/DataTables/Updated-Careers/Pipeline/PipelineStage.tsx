// pipelinescreen.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAppContext } from "@/lib/context/AppContext";
import { useLocalStorage } from "../../../../hooks/useLocalStorage";
import { errorToast, candidateActionToast } from "@/lib/Utils";
import "@/lib/styles/pipeline.scss";

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

export default function pipelinescreen({
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


    const CV_SCREENING_OPTIONS = ["Good Fit and above", "Only Strong Fit", "No Automatic Promotion"];
    const [AIScreening, setAIScreening] = useState<string>(CV_SCREENING_OPTIONS[0]);
    const [AIinterviewsecretprompt, setAIinterviewsecretprompt] = useState<string>("");
    const [requriedvideo, setRequriedvideo] = useState<boolean>(false);
    const [AiinterviewQuestion, setAiinterviewQuestion] = useState<
        { categoryId: string; categoryName: string; questions: string[] }[]
    >([]);
    const [attemptSave, setAttemptSave] = useState<boolean>(false);
    const [aiQuestionsError, setAiQuestionsError] = useState<string | null>(null);
    const [aiSecretError, setAiSecretError] = useState<string | null>(null);

    const [activeStep] = useState(4);
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

    /* ----------------------- PROGRESS LOGIC ----------------------- */
    const [stepPercents, setStepPercents] = useState<Record<number, number>>({});

    const setStepPercent = (stepNumber: number, percent: number) => {
        const p = Math.max(0, Math.min(100, Math.round(percent)));
        setStepPercents((prev) => ({ ...prev, [stepNumber]: p }));
    };

    useEffect(() => {
        steps.forEach((s) => setStepPercent(s.number, 50));
    }, []);

    const totalQuestions = AiinterviewQuestion.reduce((sum, cat) => sum + (cat.questions?.length || 0), 0);
    const step3Percent = useMemo(() => {
        const base = AIinterviewsecretprompt.trim() ? 25 : 0;
        const questionPoints = Math.min(totalQuestions * 10, 25); // max 25 from questions
        return Math.min(50, base + questionPoints);
    }, [AIinterviewsecretprompt, totalQuestions]);

    useEffect(() => {
        setStepPercent(3, step3Percent);
    }, [step3Percent]);

    /* ----------------------- VALIDATION + SAVE ----------------------- */
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
        const AiinterviewQuestionForPayload = (AiinterviewQuestion || []).reduce(
            (acc: Record<string, string[]>, cat: any) => {
                const categoryName = cat.categoryName || cat.name || cat.title || cat.categoryId || "Other";
                const qs: string[] = Array.isArray(cat.questions) ? cat.questions : [];
                acc[categoryName] = qs.map((q: string, i: number) => `Question ${i + 1}: ${q}`);
                return acc;
            },
            {}
        );

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

    const handleSaveAndContinue = async () => {
  setAttemptSave(true);
  setAiQuestionsError(null);
  setAiSecretError(null);

  try {
    setLoading(true);

    // Determine whether to publish or keep as unpublished depending on available slots
    const slotsFull = totalActiveCareers >= availableJobSlots;
    const statusToUse: Status = slotsFull ? "Unpublished" : "Published";

    // Call createCareer (will POST to add or update depending on careerId)
    await createCareer(statusToUse);

    // mark this step completed
    setStepPercent(activeStep, 100);

    // show success toast and advance
    candidateActionToast("Career saved successfully!", 1200, <i className="la la-check mr-1 text-success"></i>);

    // proceed to next step if callback provided
    onNext?.();
  } catch (error) {
    console.error("Error saving career:", error);
    errorToast("Error saving career", 1500);
  } finally {
    setLoading(false);
  }
};

    /* ----------------------- PIPELINE DATA & STATE ----------------------- */
    const initialPipelineColumns = [
        { id: "cv-screening", title: "CV Screening", locked: true, core: true, subtages: ["Waiting Submission", "For Review"] },
        { id: "ai-interview", title: "AI Interview", locked: true, core: true, subtages: ["Waiting Interview", "For Review"] },
        { id: "final-human", title: "Final Human Interview", locked: true, core: true, subtages: ["Waiting Schedule", "Waiting Interview", "For Review"] },
        { id: "job-offer", title: "Job Offer", locked: true, core: true, subtages: ["For Final Review", "Waiting Offer Acceptance", "For Contract Signing", "Hired"] },
    ];
    const [columns, setColumns] = useState(() => [...initialPipelineColumns]);

    const makeId = (prefix = "stage") => `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const addCustomStage = (title?: string) => {
        const newCol = {
            id: makeId(),
            title: title ?? "Custom Stage Example",
            locked: false,
            core: false,
            subtages: ["Waiting Interview", "For Review"],
        };

        setColumns((prev) => [...prev, newCol]);

        setUnlockedForReorder((prev) => ({ ...prev, [newCol.id]: false }));
    };

    const removeCustomStage = (id: string) => setColumns((prev) => prev.filter((c) => c.id !== id));
    const coreCount = useMemo(() => columns.filter((c) => c.locked).length, [columns]);

    /* ----------------------- Drag & reorder state ----------------------- */
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    // tracks which column ids are "unlocked for reorder" (user clicked lock)
    const [unlockedForReorder, setUnlockedForReorder] = useState<Record<string, boolean>>({});

    const toggleUnlockForReorder = (colId: string) => {
        setUnlockedForReorder((prev) => ({ ...prev, [colId]: !prev[colId] }));
    };

    /* ----------------------- Drag & Drop handlers ----------------------- */
    const onDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
        setDraggedId(id);
        (e.currentTarget as HTMLElement).classList.add("dragging");
    };

    const onDragOverColumn = (e: React.DragEvent, overId: string) => {
        e.preventDefault();
        if (draggedId === overId) return;
        setDragOverId(overId);
    };

    const onDropOnColumn = (e: React.DragEvent, dropId: string) => {
        e.preventDefault();
        const dragged = e.dataTransfer.getData("text/plain") || draggedId;
        if (!dragged) return;
        if (dragged === dropId) {
            setDraggedId(null);
            setDragOverId(null);
            return;
        }

        setColumns((prev) => {
            const list = [...prev];
            const fromIndex = list.findIndex((c) => c.id === dragged);
            const toIndex = list.findIndex((c) => c.id === dropId);
            if (fromIndex === -1 || toIndex === -1) return prev;
            const [moved] = list.splice(fromIndex, 1);
            list.splice(toIndex, 0, moved);
            return list;
        });

        setDraggedId(null);
        setDragOverId(null);
    };

    const onDragEnd = (e: React.DragEvent) => {
        setDraggedId(null);
        setDragOverId(null);
        (e.currentTarget as HTMLElement).classList.remove("dragging");
    };

    /* ----------------------- Icon helpers ----------------------- */
    const renderStageIcon = (idOrTitle: string) => {
        if (/cv/i.test(idOrTitle)) {
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stage-icon person-icon" aria-hidden>
                    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            );
        } else if (/ai/i.test(idOrTitle) || (/interview/i.test(idOrTitle) && /ai/i.test(idOrTitle))) {
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stage-icon mic-icon" aria-hidden>
                    <path d="M12 1v11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="7" y="4" width="10" height="8" rx="5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M19 11v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            );
        } else if (/final/i.test(idOrTitle) || /human/i.test(idOrTitle)) {
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stage-icon group-icon" aria-hidden>
                    <path d="M16 11a3 3 0 1 0-6 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 11a2 2 0 1 0-4 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15 20a5 5 0 0 1 9 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            );
        } else if (/offer/i.test(idOrTitle) || /job/i.test(idOrTitle)) {
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stage-icon offer-icon" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            );
        }
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stage-icon" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.2" />
            </svg>
        );
    };

    const renderHelpIcon = () => (
        <svg className="help-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.1" />
            <path d="M9.4 9.5a2.6 2.6 0 1 1 4.2 1.9c-.4.6-1 1.1-1 1.6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="17.2" r="0.6" fill="currentColor" />
        </svg>
    );

    const renderLockIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="lock-icon" aria-hidden>
            <path d="M17 11V8a5 5 0 10-10 0v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    );

    const renderDots = () => <div className="more-dots" aria-hidden>⋮</div>;

    /* ----------------------- RENDER ----------------------- */
    return (
        <>
            {/* Header */}
            <div className="add-career-header">
                <div className="header-left">
                    <div>
                        <h1 className="header-title">{formData.jobTitle ? `[Draft] ${formData.jobTitle}` : "[Draft] Software Engineer - Java"}</h1>
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Careers &nbsp;›&nbsp; Add new career</div>
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-unpublished"
                        onClick={() => {
                            createCareer("Unpublished");
                        }}
                        disabled={loading}
                    >
                        Save as Unpublished
                    </button>
                    <button className="btn-continue" onClick={handleSaveAndContinue} disabled={loading}>Save and Continue <i className="la la-arrow-right" /></button>
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
                                <div className={["mcircle", isActive ? "is-active" : isDone ? "is-done" : "is-upcoming"].join(" ")}>
                                    {isDone ? (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>) : (<span className={["mcircle-dot", isActive ? "dot-active" : isDone ? "dot-done" : "dot-upcoming"].join(" ")} />)}
                                </div>
                                {!isLast && <div className="mconnector" style={{ ["--fill" as any]: fill } as React.CSSProperties} />}
                            </div>
                            <div className={["mlabel", isActive ? "mlabel-active" : "mlabel-upcoming"].join(" ")}>{step.title}</div>
                        </div>
                    );
                })}
            </div>

            {/* Pipeline header */}
            <div className="pipeline-header-row" style={{ marginTop: 10 }}>
                <div className="pipeline-left">
                    <div className="pipeline-title">Customize pipeline stages</div>
                    <div className="pipeline-subtitle-left">
                        Create, modify, reorder, and delete stages and sub-stages. Core stages are fixed and can't be moved or edited as they are essential to Jia’s system logic.
                    </div>
                </div>

                <div className="pipeline-header-controls">
                    <button
                        className="btn-restore"
                        onClick={() => {
                            setColumns([...initialPipelineColumns]);
                            setUnlockedForReorder({}); // reset unlock state when restoring
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-left">
                            <path d="M3 3v6h6" />
                            <path d="M3.05 13A9 9 0 1 0 9 3.46" />
                        </svg>
                        <span className="btn-text">Restore to default</span>
                    </button>

                    <div className="dropdown-wrapper">
                        <button className="btn-copy" onClick={() => {/* open dropdown */ }}>
                            <span className="btn-text">Copy pipeline from existing job</span>
                            <span className="caret-wrapper" aria-hidden>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Pipeline board */}
            <div className="pipeline-board" style={{ marginTop: 12 }}>
                {(() => {
                    const lastLockedIndex = columns.reduce((acc, c, i) => (c.locked ? i : acc), -1);
                    return columns.map((col, idx) => {
                       
                        const isDraggable = !!unlockedForReorder[col.id];

                        
                        const railLabel = isDraggable ? "Drag to reorder stage" : "Core stage, cannot move";

                        const showRailLock = !isDraggable;// show lock SVG only in this case

                        return (
                            <React.Fragment key={col.id}>
                                <div
                                    className={[
                                        "column-stack",
                                        draggedId === col.id ? "is-dragging" : "",
                                        dragOverId === col.id ? "is-drag-over" : "",
                                    ].join(" ")}
                                    draggable={isDraggable}
                                    onDragStart={(e) => isDraggable && onDragStart(e, col.id)}
                                    onDragOver={(e) => isDraggable && onDragOverColumn(e, col.id)}
                                    onDrop={(e) => isDraggable && onDropOnColumn(e, col.id)}
                                    onDragEnd={onDragEnd}
                                >
                                    {/* top faint rail */}
                                    <div className="column-top-rail">
                                        <div className="rail-inner">
                                            {/* show the six-dot drag handle at left when rail allows drag */}
                                            {railLabel === "Drag to reorder stage" && (
                                                <span className="rail-handle" aria-hidden>
                                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                                        <g fill="#9aa1a8">
                                                            <circle cx="3.5" cy="3.5" r="1.4" />
                                                            <circle cx="3.5" cy="9" r="1.4" />
                                                            <circle cx="3.5" cy="14.5" r="1.4" />
                                                            <circle cx="9" cy="3.5" r="1.4" />
                                                            <circle cx="9" cy="9" r="1.4" />
                                                            <circle cx="9" cy="14.5" r="1.4" />
                                                        </g>
                                                    </svg>
                                                </span>
                                            )}

                                            {/* show lock icon on rail only when it's a core (locked) stage AND not unlocked for reorder */}
                                            {showRailLock && (
                                                <svg className="rail-lock" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                                                    <path d="M17 11V8a5 5 0 10-10 0v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                                                </svg>
                                            )}

                                            <div className="rail-label">{railLabel}</div>
                                        </div>
                                    </div>

                                    <div className="rail-bridge" />

                                    <div className={["pipeline-column-inner", col.locked ? "locked-inner" : "custom-inner"].join(" ")}>
                                        <div className="column-head">
                                            <div className="col-left">
                                                {renderStageIcon(col.id || col.title)}
                                                <div className="col-title-wrapper">
                                                    <div className="col-title-text">{col.title}</div>
                                                    <div className="help-container">{renderHelpIcon()}</div>
                                                </div>
                                            </div>

                                            {/* lock area: click to unlock for reorder (or lock back) */}
                                            <div
                                                className="col-more"
                                                onClick={() => toggleUnlockForReorder(col.id)}
                                                title={unlockedForReorder[col.id] ? "Lock column (click to disable reorder)" : "Unlock column (click to enable reorder)"}
                                                style={{ cursor: "pointer" }}
                                            >
                                                {unlockedForReorder[col.id] ? renderDots() : renderLockIcon()}
                                            </div>
                                        </div>

                                        <div className="subtitle-small">Substages</div>

                                        <div className="substage-list">
                                            {col.subtages.map((s) => (
                                                <div className="substage-card" key={s + col.id}>
                                                    <div className="substage-text">{s}</div>
                                                    <div className="substage-icon" aria-hidden>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {idx === lastLockedIndex && (
                                    <div className="pipeline-connector" aria-hidden>
                                        <div className="connector-rail">
                                            <button className="connector-plus" onClick={() => addCustomStage()} aria-label="Add stage">+</button>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    });
                })()}
            </div>

            <div style={{ height: 18 }} />
        </>
    );
}
