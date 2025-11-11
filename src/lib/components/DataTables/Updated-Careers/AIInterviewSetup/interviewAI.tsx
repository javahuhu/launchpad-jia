// interviewAI.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAppContext } from "@/lib/context/AppContext";
import { useLocalStorage } from "../../../../hooks/useLocalStorage";
import { errorToast, candidateActionToast } from "@/lib/Utils";
import "@/lib/styles/CareersTableV2-Style.scss";

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

type InterviewCategory = {
  categoryId: string;
  categoryName: string;
  questions: string[];
};

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

const MIN_QUESTIONS = 5;

export default function InterviewAI({
  initialFormData,
  initialMembers,
  careerId,
  onBack,
  onNext,
}: Props) {
  const { orgID, user } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [attemptSave, setAttemptSave] = useState(false);
  const [aiSecretError, setAiSecretError] = useState<string | null>(null);
  const [aiQuestionsError, setAiQuestionsError] = useState<string | null>(null);

  // form data mirror (for display)
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

  // AI interview specific state
  const [AIScreening, setAIScreening] = useState<string>("Good Fit and above");
  const [AIinterviewSecretPrompt, setAIinterviewSecretPrompt] = useState<string>("");
  const [requiredVideo, setRequiredVideo] = useState<boolean>(false);
  const [aiCategories, setAiCategories] = useState<InterviewCategory[]>([]);

  // sync careerId if parent provides one later
  const [localCareerId, setLocalCareerId] = useState<string | undefined>(careerId);
  useEffect(() => {
    if (careerId) setLocalCareerId(careerId);
  }, [careerId]);

  // basic org/career totals to decide Published vs Unpublished (same logic as other modules)
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

  // question counting
  const totalQuestions = aiCategories.reduce((sum, cat) => sum + (cat.questions?.length || 0), 0);

  const step3Percent = useMemo(() => {
    const base = AIinterviewSecretPrompt.trim() ? 25 : 0;
    const questionPoints = Math.min(totalQuestions * 10, 25); // max 25 from questions
    return Math.min(50, base + questionPoints);
  }, [AIinterviewSecretPrompt, totalQuestions]);

  /* ---------- helpers to manage categories/questions ---------- */
  const addCategory = (name?: string) => {
    const id = `cat_${Date.now()}`;
    setAiCategories((prev) => [...prev, { categoryId: id, categoryName: name || "New category", questions: [] }]);
  };

  const removeCategory = (categoryId: string) => {
    setAiCategories((prev) => prev.filter((c) => c.categoryId !== categoryId));
  };

  const addQuestionToCategory = (categoryId: string, question: string) => {
    if (!question.trim()) return;
    setAiCategories((prev) =>
      prev.map((c) => (c.categoryId === categoryId ? { ...c, questions: [...c.questions, question.trim()] } : c))
    );
  };

  const removeQuestionFromCategory = (categoryId: string, index: number) => {
    setAiCategories((prev) =>
      prev.map((c) =>
        c.categoryId === categoryId ? { ...c, questions: c.questions.filter((_, i) => i !== index) } : c
      )
    );
  };

  /* ---------- create / update career payload ---------- */
  const createOrUpdateCareer = async (status: Status) => {
    // Transform Ai categories to payload-friendly format
    const AiinterviewQuestionForPayload = (aiCategories || []).reduce(
      (acc: Record<string, string[]>, cat) => {
        const categoryName = cat.categoryName || "Other";
        const qs: string[] = Array.isArray(cat.questions) ? cat.questions : [];
        acc[categoryName] = qs.map((q: string, i: number) => `Question ${i + 1}: ${q}`);
        return acc;
      },
      {}
    );

    const payload: any = {
      requriedvideo: requiredVideo,
      AIScreening,
      AIinterviewsecretprompt: AIinterviewSecretPrompt,
      AiinterviewQuestion: AiinterviewQuestionForPayload,
      // include other data which backend expects (optionally include formData / members)
      // keep compatibility with existing endpoints by not removing fields
    };

    try {
      if (localCareerId) {
        const res = await axios.post("/api/update-career", { _id: localCareerId, ...payload });
        return res.data;
      } else {
        const res = await axios.post("/api/add-career", payload);
        const result = res.data ?? {};
        const insertedId =
          (result.insertedId && String(result.insertedId)) ||
          (result.career && (result.career._id || result.career.id)) ||
          (result._id && String(result._id)) ||
          undefined;

        if (insertedId) {
          setLocalCareerId(String(insertedId));
          console.log("Created career inside InterviewAI; stored localCareerId =", insertedId);
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

  /* ---------- save handlers ---------- */
  const handleSaveAndContinue = async () => {
    setAttemptSave(true);
    setAiQuestionsError(null);
    setAiSecretError(null);

    if (!AIinterviewSecretPrompt.trim()) {
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
      await createOrUpdateCareer(statusToUse);
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
      await createOrUpdateCareer("Unpublished");
      candidateActionToast("Saved as Unpublished", 1200, <i className="la la-save mr-1 text-info"></i>);
    } catch (err) {
      console.error(err);
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
          <div>
            <h1 className="header-title">{formData.jobTitle ? `[Draft] ${formData.jobTitle}` : "[Draft] Software Engineer - Java"}</h1>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Careers &nbsp;›&nbsp; Add new career</div>
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

      {/* Steps bar (keep consistent UI) */}
      <div className="steps-modern">
        {[
          { number: 1, title: "Career Details & Team Access" },
          { number: 2, title: "CV Review & Pre-screening" },
          { number: 3, title: "AI Interview Setup" },
          { number: 4, title: "Pipeline Stages" },
          { number: 5, title: "Review Career" },
        ].map((step, index, arr) => {
          const isActive = step.number === 3;
          const isDone = step.number < 3;
          const isLast = index === arr.length - 1;
          const fill = isActive ? `${Math.max(0, Math.min(step3Percent, 50))}%` : isDone ? "100%" : "0%";

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

      {/* Main Content */}
      <div className="add-career-main" style={{ alignItems: "flex-start" }}>
        <div className="form-section" style={{ flex: 1 }}>
          <div className="blue-wrap">
            <h2 className="section-title">1. AI Interview Setup</h2>
            <div className="white-inner">
              <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label">AI Screening</label>
                  <div style={{ marginBottom: 8, color: "#6b7280" }}>
                    Jia can score and rank candidates based on your secret prompt and interview responses.
                  </div>

                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                    <select value={AIScreening} onChange={(e) => setAIScreening(e.target.value)} className="select-input">
                      <option>Good Fit and above</option>
                      <option>Only Strong Fit</option>
                      <option>No Automatic Promotion</option>
                    </select>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
                      <input type="checkbox" checked={requiredVideo} onChange={(e) => setRequiredVideo(e.target.checked)} />
                      <span style={{ color: "#6b7280" }}>Require video answers</span>
                    </label>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 700 }}>AI Interview Secret Prompt</span>
                      <span style={{ color: "#9ca3af" }}>(required)</span>
                    </div>

                    <textarea
                      placeholder="This prompt will be used to assess candidate interview answers (hidden from candidates)."
                      value={AIinterviewSecretPrompt}
                      onChange={(e) => setAIinterviewSecretPrompt(e.target.value)}
                      className="textarea-input"
                      rows={5}
                      style={{ minHeight: 110 }}
                    />
                    {attemptSave && aiSecretError && <div className="field-error">{aiSecretError}</div>}
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: "#eef0f2", margin: "18px 0" }} />

              {/* Categories & Questions */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>Interview question categories</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn-unpublished" onClick={() => addCategory("Technical")}>Add category</button>
                    <button type="button" className="btn-unpublished" onClick={() => addCategory("Culture Fit")}>Add sample</button>
                  </div>
                </div>

                {aiCategories.length === 0 && (
                  <div style={{ color: "#6b7280", marginBottom: 12 }}>
                    Add categories and questions. Aim for at least {MIN_QUESTIONS} questions total.
                  </div>
                )}

                {aiCategories.map((cat) => (
                  <div key={cat.categoryId} style={{ marginBottom: 14, border: "1px solid #eef0f2", borderRadius: 10, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <input
                        value={cat.categoryName}
                        onChange={(e) => setAiCategories((prev) => prev.map((c) => (c.categoryId === cat.categoryId ? { ...c, categoryName: e.target.value } : c)))}
                        className="text-input"
                        style={{ width: "60%" }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="btn-unpublished" onClick={() => addQuestionToCategory(cat.categoryId, `Sample question ${cat.questions.length + 1}`)}>Add sample question</button>
                        <button type="button" className="ta-trash" onClick={() => removeCategory(cat.categoryId)}><i className="la la-trash" /></button>
                      </div>
                    </div>

                    <div>
                      {cat.questions.map((q, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <input
                              className="text-input"
                              value={q}
                              onChange={(e) => setAiCategories((prev) => prev.map((c) => c.categoryId === cat.categoryId ? { ...c, questions: c.questions.map((qq, idx) => idx === i ? e.target.value : qq) } : c))}
                            />
                          </div>
                          <button type="button" className="ta-trash" onClick={() => removeQuestionFromCategory(cat.categoryId, i)}><i className="la la-trash" /></button>
                        </div>
                      ))}

                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <input
                          placeholder="Add a custom question and press Enter"
                          className="text-input"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val) {
                                addQuestionToCategory(cat.categoryId, val);
                                (e.target as HTMLInputElement).value = "";
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {attemptSave && aiQuestionsError && <div className="field-error">{aiQuestionsError}</div>}
              </div>
            </div>
          </div>

          {/* back / next controls */}
          <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
            <button type="button" className="btn-unpublished" onClick={() => onBack?.()}>Back</button>
            <button type="button" className="btn-continue" onClick={handleSaveAndContinue} disabled={loading}>
              Save and Continue
              <i className="la la-arrow-right" />
            </button>
          </div>
        </div>

        {/* Tips sidebar */}
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
                <strong>Use a secret prompt</strong> to guide the AI evaluator on what to prioritize in candidate answers.
              </p>
              <p className="tip-paragraph">
                <strong>Group questions</strong> by category (e.g., Technical, Behavioral) to make evaluation consistent across candidates.
              </p>
              <p className="tip-paragraph">
                <strong>Collect at least {MIN_QUESTIONS} questions</strong> to ensure robust interview coverage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
