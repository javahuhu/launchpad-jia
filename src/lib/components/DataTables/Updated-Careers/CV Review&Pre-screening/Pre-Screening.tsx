"use client";

import React, { useEffect, useRef, useState } from "react";
import "@/lib/styles/cvreviewandscreening.scss";

/* ---------- Types ---------- */
type QuestionType = "short" | "long" | "dropdown" | "checkboxes" | "range";

type PreQuestion = {
  id: string;
  suggestedId?: string;
  title: string;
  type: QuestionType;
  options?: string[]; // for dropdown/checkboxes
  range?: { min?: string; max?: string; currency?: string };
};

/* ---------- Helpers ---------- */
const genId = (prefix = "") => `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const DEFAULT_CURRENCY = "PHP";
const ensureOptions = (preset?: string[]) =>
  preset && preset.length ? [...preset] : ["Option 1", "Option 2"];

/* ---------- Component ---------- */
export default function PreScreening({
  initialQuestions = undefined,
  onChange,
}: {
  // initialQuestions left optional; if present, it may be string[] or PreQuestion[].
  initialQuestions?: string[] | PreQuestion[] | undefined;
  onChange?: (questions: PreQuestion[]) => void;
}) {
  // normalize initial questions:
  const normalizeInitial = (): PreQuestion[] => {
    if (!initialQuestions) return [];
    if (Array.isArray(initialQuestions) && initialQuestions.length > 0) {
      if (typeof initialQuestions[0] === "string") {
        // convert strings into simple short-type questions
        return (initialQuestions as string[]).map((t) => ({ id: genId("q-"), title: t, type: "short" as QuestionType }));
      } else {
        return (initialQuestions as PreQuestion[]).map((q: any) => ({
          id: q.id ?? genId("q-"),
          suggestedId: q.suggestedId,
          title: q.title ?? "",
          type: q.type ?? "short",
          options: Array.isArray(q.options) ? q.options.slice() : undefined,
          range: q.range ? { ...q.range } : undefined,
        }));
      }
    }
    return [];
  };

  const [activeQuestions, setActiveQuestions] = useState<PreQuestion[]>(normalizeInitial);

  // suggested list (keeps track if added)
  const [suggestedPreScreenQuestions, setSuggestedPreScreenQuestions] = useState(
    [
      { id: "s-notice", title: "Notice Period", desc: "How long is your notice period?", defaultType: "dropdown", added: false },
      { id: "s-work-setup", title: "Work Setup", desc: "How often are you willing to report to the office each week?", defaultType: "dropdown", added: false },
      { id: "s-asking-salary", title: "Asking Salary", desc: "How much is your expected monthly salary?", defaultType: "range", added: false },
    ] as any[]
  );

  // emit structured array on change (but avoid duplicate emissions)
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    const payload = activeQuestions.map((q) => ({
      id: q.id,
      suggestedId: q.suggestedId,
      title: q.title,
      type: q.type,
      options: q.options ? q.options.slice() : undefined,
      range: q.range ? { ...q.range } : undefined,
    }));
    const key = JSON.stringify(payload);
    if (lastSentRef.current !== key) {
      lastSentRef.current = key;
      onChange?.(payload);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestions]);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setInputRef = (id: string) => (el: HTMLInputElement | null) => {
    inputRefs.current[id] = el;
  };

  /* ---------- Actions ---------- */
  const addCustomPreScreen = (title?: string) => {
    const q: PreQuestion = {
      id: genId("q-"),
      title: title ?? "",
      type: "short",
    };
    setActiveQuestions((prev) => [q, ...prev]);
    requestAnimationFrame(() => {
      const el = inputRefs.current[q.id];
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  };

  const addSuggested = (id: string) => {
    const sIndex = suggestedPreScreenQuestions.findIndex((x) => x.id === id);
    if (sIndex === -1) return;
    const s = suggestedPreScreenQuestions[sIndex];
    if (s.added) return;

    let options: string[] | undefined = undefined;
    if (s.id === "s-notice") options = ["Immediately", "< 30 days", "> 30 days"];
    if (s.id === "s-work-setup") options = ["100% Remote", "2-3 days/wk", "5 days/wk"];
    // for salary leave range

    const q: PreQuestion = {
      id: genId("q-"),
      suggestedId: s.id,
      title: s.title,
      type: s.defaultType ?? "short",
      options: options,
      range: s.defaultType === "range" ? { min: "", max: "", currency: DEFAULT_CURRENCY } : undefined,
    };

    setActiveQuestions((prev) => [q, ...prev]);
    setSuggestedPreScreenQuestions((prev) => prev.map((x) => (x.id === id ? { ...x, added: true } : x)));
  };

  const removeQuestion = (qId: string) => {
    const q = activeQuestions.find((x) => x.id === qId);
    setActiveQuestions((prev) => prev.filter((x) => x.id !== qId));
    if (q?.suggestedId) {
      setSuggestedPreScreenQuestions((prev) => prev.map((s) => (s.id === q.suggestedId ? { ...s, added: false } : s)));
    }
    delete inputRefs.current[qId];
  };

  const updateQuestionTitle = (qId: string, title: string) => setActiveQuestions((p) => p.map((q) => (q.id === qId ? { ...q, title } : q)));
  const changeQuestionType = (qId: string, t: QuestionType) =>
    setActiveQuestions((p) =>
      p.map((q) => {
        if (q.id !== qId) return q;
        const next: PreQuestion = { ...q, type: t };
        if (t === "dropdown" || t === "checkboxes") {
          if (!next.options || next.options.length === 0) next.options = ensureOptions();
          delete (next as any).range;
        } else if (t === "range") {
          next.range = next.range ?? { min: "", max: "", currency: DEFAULT_CURRENCY };
          delete next.options;
        } else {
          delete next.options;
          delete next.range;
        }
        return next;
      })
    );

  const addOption = (qId: string) =>
    setActiveQuestions((p) => p.map((q) => (q.id === qId ? { ...q, options: [...(q.options ?? []), `Option ${(q.options?.length ?? 0) + 1}`] } : q)));
  const updateOptionText = (qId: string, idx: number, text: string) =>
    setActiveQuestions((p) =>
      p.map((q) => (q.id === qId ? { ...q, options: q.options?.map((o, i) => (i === idx ? text : o)) } : q))
    );
  const removeOption = (qId: string, idx: number) =>
    setActiveQuestions((p) =>
      p.map((q) => {
        if (q.id !== qId) return q;
        const filtered = (q.options ?? []).filter((_, i) => i !== idx);
        return { ...q, options: filtered.length ? filtered : ensureOptions() };
      })
    );
  const updateRange = (qId: string, field: "min" | "max" | "currency", val: string) =>
    setActiveQuestions((p) => p.map((q) => (q.id === qId ? { ...q, range: { ...(q.range ?? { min: "", max: "", currency: DEFAULT_CURRENCY }), [field]: val } } : q)));

  /* ---------- Render ---------- */
  return (
    <div className="blue-wrap">
      <div className="ps-header">
        <h2 className="section-title">
          2. Pre-Screening Questions <span className="ps-optional">(optional)</span>
        </h2>
        <button
          className="ps-add-custom"
          onClick={() => {
            const custom = window.prompt("Add custom pre-screening question (leave blank to create an empty editable card)");
            if (custom && custom.trim()) addCustomPreScreen(custom.trim());
            else if (custom === "") addCustomPreScreen();
          }}
        >
          + Add custom
        </button>
      </div>

      <div className="white-inner">
        <div className="ps-questions">
          {activeQuestions.length === 0 ? (
            <div className="ps-empty">No pre-screening questions added yet.</div>
          ) : (
            activeQuestions.map((q, idx) => (
              <div key={q.id} className="ps-row">
                <div className="ps-handle-col">
                  <div className="ps-drag-handle" title="Drag to reorder" role="button" aria-label={`Drag question ${idx + 1}`}>
                    <span className="dot" /><span className="dot" /><span className="dot" />
                    <span className="dot" /><span className="dot" /><span className="dot" />
                  </div>
                </div>

                <div className="ps-card">
                  <div className="ps-card-top">
                    <input
                      ref={setInputRef(q.id)}
                      value={q.title}
                      onChange={(e) => updateQuestionTitle(q.id, e.target.value)}
                      placeholder="Write your question..."
                      className="ps-card-title-input"
                      aria-label="Question title"
                    />

                    <div className="ps-select-wrap">
                      <div className="ps-type-select-container">
                        <select value={q.type} onChange={(e) => changeQuestionType(q.id, e.target.value as QuestionType)} className="ps-type-select">
                          <option value="short">Short answer</option>
                          <option value="long">Long answer</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="checkboxes">Checkboxes</option>
                          <option value="range">Range</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="ps-card-body">
                    {(q.type === "dropdown" || q.type === "checkboxes") && (
                      <div className="ps-options">
                        {(q.options ?? []).map((opt, idxOpt) => (
                          <div key={idxOpt} className="ps-option">
                            <div className="ps-option-combined">
                              <div className="ps-option-num">{idxOpt + 1}</div>
                              <input value={opt} onChange={(e) => updateOptionText(q.id, idxOpt, e.target.value)} placeholder={`Option ${idxOpt + 1}`} className="ps-option-input" />
                            </div>
                            <button className="ps-opt-remove" onClick={() => removeOption(q.id, idxOpt)} aria-label="Remove option">✕</button>
                          </div>
                        ))}

                        <button className="ps-add-option" onClick={() => addOption(q.id)}>＋ Add Option</button>
                      </div>
                    )}

                    {q.type === "range" && (
                      <div className="ps-range-row">
                        <div className="ps-range-col">
                          <label className="ps-range-label">Minimum</label>
                          <div className="ps-input-symbol">
                            <span className="ps-curr">{q.range?.currency === "PHP" ? "₱" : q.range?.currency === "USD" ? "$" : "€"}</span>
                            <input type="number" min={0} value={q.range?.min ?? ""} onChange={(e) => updateRange(q.id, "min", e.target.value)} className="ps-range-input" />
                          </div>
                        </div>

                        <div className="ps-range-col">
                          <label className="ps-range-label">Maximum</label>
                          <div className="ps-input-symbol">
                            <span className="ps-curr">{q.range?.currency === "PHP" ? "₱" : q.range?.currency === "USD" ? "$" : "€"}</span>
                            <input type="number" min={0} value={q.range?.max ?? ""} onChange={(e) => updateRange(q.id, "max", e.target.value)} className="ps-range-input" />
                          </div>
                        </div>

                        <div className="ps-range-col ps-currency-col">
                          <label className="ps-range-label">Currency</label>
                          <select value={q.range?.currency ?? DEFAULT_CURRENCY} onChange={(e) => updateRange(q.id, "currency", e.target.value)} className="ps-range-select">
                            <option value="PHP">PHP</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {(q.type === "short" || q.type === "long") && <div className="ps-placeholder">{q.type === "short" ? "Short answer input" : "Long answer textarea"}</div>}
                  </div>

                  <div className="ps-card-footer">
                    <button className="ps-delete" onClick={() => removeQuestion(q.id)}>Delete Question</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* suggested */}
        <div className="ps-suggestions">
          <div className="ps-sugg-title">Suggested Pre-screening Questions:</div>
          <div className="ps-sugg-list">
            {suggestedPreScreenQuestions.map((s) => (
              <div key={s.id} className="ps-sugg-row">
                <div className="ps-sugg-text">
                  <div className="ps-sugg-head">{s.title}</div>
                  <div className="ps-sugg-desc">{s.desc}</div>
                </div>
                <div>
                  {s.added ? (
                    <button className="ps-added" disabled>Added</button>
                  ) : (
                    <button className="ps-add" onClick={() => addSuggested(s.id)}>Add</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
