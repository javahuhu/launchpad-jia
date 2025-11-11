// reviewcareer.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useAppContext } from "@/lib/context/AppContext";
import { useLocalStorage } from "../../../../hooks/useLocalStorage";
import { errorToast, candidateActionToast } from "@/lib/Utils";
import Careertile from "../ReviewCareer/careertile";
import CVScreen from "./cvscreeningtile";
import InterviewAI from "./interviewAI";
import PipelineStage from "./reviewpipeline";

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

export default function reviewcareer({
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

    const [activeStep] = useState(5);
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

        if (!AIinterviewsecretprompt.trim()) {
            setAiSecretError("This field is required.");
            candidateActionToast("Please enter AI interview secret prompt.", 1600, <i className="la la-exclamation-triangle mr-1 text-danger"></i>);
            return;
        }

        if (totalQuestions < MIN_QUESTIONS) {
            setAiQuestionsError(`Please add at least ${MIN_QUESTIONS} interview questions.`);
            candidateActionToast(`Please add at least ${MIN_QUESTIONS} interview questions.`, 1800, <i className="la la-exclamation-triangle mr-1 text-danger"></i>);
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
                    <button
                        className="btn-continue"
                        onClick={handleSaveAndContinue}
                        disabled={loading}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 22px",
                            background: "#0f1724",
                            color: "#fff",
                            borderRadius: 999,
                            border: "none",
                            boxShadow: "0 6px 18px rgba(2,6,23,0.45)",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: 700,
                            fontSize: 16,
                            lineHeight: 1,
                            transition: "transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease",
                            opacity: loading ? 0.7 : 1,
                            marginBottom: 5
                        }}
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ display: "block", marginRight: 8 }}
                        >
                            <path
                                d="M7.5 12.3l2.3 2.3 6.2-6.7"
                                stroke="#fff"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        Publish
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

            {/* Pass the live form data and members into the tile so it shows the current form */}
            <Careertile data={formData} members={initialMembers ?? []} careerId={careerId} />

            {/* ✨ FIX: pass careerId into CVScreen so it fetches and displays the saved CV review data */}
            <CVScreen careerId={careerId} />


            <InterviewAI
                careerId={careerId}
                initialFormData={formData}
                initialMembers={initialMembers}
                onBack={() => onBack?.()}
                onNext={() => onNext?.()}
            />
            <PipelineStage />
        </>
    );
}
