// AIQuestion.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Edit3, Trash2, Sparkles, Plus } from "lucide-react";
import "@/lib/styles/ai_interviewsettings_toggle.scss";

type Question = { id: string; text: string };
type Category = { id: string; name: string; questions: Question[] };

const genId = (prefix = "") =>
  `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function AIQuestion({
  onStructuredChange,
  minQuestionsRequired = 5,
  showWarning = false,
}: {
  onStructuredChange?: (structured: { categoryId: string; categoryName: string; questions: string[] }[]) => void;
  minQuestionsRequired?: number;
  showWarning?: boolean; // only show warning when true AND total < min
}) {
  const [categories, setCategories] = useState<Category[]>([
    { id: "cv-exp", name: "CV Validation / Experience", questions: [] },
    { id: "technical", name: "Technical", questions: [] },
    { id: "behavioral", name: "Behavioral", questions: [] },
    { id: "analytical", name: "Analytical", questions: [] },
    { id: "others", name: "Others", questions: [] },
  ]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const lastSentRef = useRef<string | null>(null);

  // compute total questions
  const totalQuestions = categories.reduce((sum, cat) => sum + cat.questions.length, 0);

  // emit structured when actual content changed (prevents continuous counting)
  useEffect(() => {
    const structured = categories.map((c) => ({ categoryId: c.id, categoryName: c.name, questions: c.questions.map(q => q.text) }));
    const key = JSON.stringify(structured);
    if (lastSentRef.current !== key) {
      lastSentRef.current = key;
      onStructuredChange?.(structured);
    }
  }, [categories, onStructuredChange]);

  const addQuestionToCategory = (categoryId: string, questionText?: string) => {
    const newQuestion: Question = { id: genId("q-"), text: questionText ?? "" };
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, questions: [...cat.questions, newQuestion] } : cat
      )
    );
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.add(categoryId);
      return next;
    });
    if (!questionText) {
      setTimeout(() => setEditingQuestion(newQuestion.id), 0);
    }
  };

  const removeQuestion = (categoryId: string, questionId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, questions: cat.questions.filter((q) => q.id !== questionId) } : cat
      )
    );
  };

  const updateQuestionText = (categoryId: string, questionId: string, text: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, questions: cat.questions.map((q) => (q.id === questionId ? { ...q, text } : q)) } : cat
      )
    );
  };

  const sample = {
    "cv-exp": ["What specific experience do you have with Java solutions?", "Describe your experience with Java."],
    technical: ["What programming languages are you most proficient in?", "Describe a challenging technical problem you solved recently."],
    behavioral: ["Tell me about a time you worked in a team to achieve a goal.", "How do you handle conflicts with colleagues?"],
    analytical: ["How do you approach problem-solving in your work?", "Describe a situation where you used data to make a decision."],
    others: ["What motivates you in your career?", "Where do you see yourself in 5 years?"],
  } as Record<string, string[]>;

  const generateQuestionsForCategory = (categoryId: string) => {
    const questions = sample[categoryId] || [];
    questions.forEach((q) => addQuestionToCategory(categoryId, q));
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.add(categoryId);
      return next;
    });
  };

  const generateAllQuestions = () => {
    categories.forEach((cat) => {
      if (cat.questions.length === 0) generateQuestionsForCategory(cat.id);
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        next.add(cat.id);
        return next;
      });
    });
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(categoryId) ? next.delete(categoryId) : next.add(categoryId);
      return next;
    });
  };

  const showMinWarning = showWarning && totalQuestions < minQuestionsRequired;

  return (
    <div className="blue-wrap">
      <div className="ai-container">
        <div className="ai-header">
          <div className="ai-titleRow">
            <h2 className="ai-title">2. AI Interview Questions</h2>
            <span className="ai-badge">{totalQuestions}</span>
          </div>

          <div className="ai-headerButtons">
            <button className="ai-generateBtn" onClick={generateAllQuestions}>
              <Sparkles size={18} />
              <span style={{ marginLeft: 10, fontWeight: 600 }}>Generate questions</span>
            </button>
          </div>
        </div>

        {showMinWarning && (
          <div className="ai-warning">
            <span className="ai-warningIcon">⚠️</span>
            <span className="ai-warningText">Please add at least {minQuestionsRequired} interview questions.</span>
          </div>
        )}

        <div className="white-inner">
          <div className="ai-categoriesContainer">
            {categories.map((category) => (
              <div key={category.id}>
                <div className="ai-categoryHeader" onClick={() => toggleCategory(category.id)}>
                  <h3 className="ai-categoryTitle">{category.name}</h3>
                </div>

                {expandedCategories.has(category.id) && (
                  <div className="ai-questionsContainer">
                    {category.questions.map((question, idx) => (
                      <div className="ai-questionCard" key={question.id}>
                        <div className="ai-dragHandle"><span className="ai-dotGrid">⋮⋮</span></div>

                        <div className="ai-questionContent">
                          {editingQuestion === question.id ? (
                            <input
                              autoFocus
                              className="ai-questionInput"
                              value={question.text}
                              onChange={(e) => updateQuestionText(category.id, question.id, e.target.value)}
                              onBlur={() => setEditingQuestion(null)}
                              placeholder="Enter your question..."
                            />
                          ) : (
                            <p className="ai-questionText">{question.text || `Question ${idx + 1}`}</p>
                          )}
                        </div>

                        <button className="ai-editBtn" onClick={() => setEditingQuestion(question.id)} aria-label="Edit question">
                          <Edit3 size={15} />
                          <span style={{ marginLeft: 6 }}>Edit</span>
                        </button>

                        <button className="ai-deleteBtn" onClick={() => removeQuestion(category.id, question.id)} aria-label="Delete question">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="ai-actionRow">
                  <button className="ai-generateBtnSmall" onClick={() => generateQuestionsForCategory(category.id)}>
                    <Sparkles size={14} />
                    <span style={{ marginLeft: 8, fontWeight: 600 }}>Generate questions</span>
                  </button>

                  <button className="ai-manuallyAddBtnSmall" onClick={() => addQuestionToCategory(category.id)}>
                    <span className="ai-plusCircleInner"><Plus size={12} /></span>
                    <span style={{ marginLeft: 0 }}>Manually add</span>
                  </button>

                  {expandedCategories.has(category.id) && category.questions.length > 0 && (
                    <span className="ai-questionCount"># of questions to ask <strong>{category.questions.length}</strong></span>
                  )}
                </div>

                <div className="ai-divider" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
