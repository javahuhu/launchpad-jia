// CVScreeningSelect.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import '@/lib/styles/CVScreeningStyle.scss';

type Setting = { name: string; icon: "check" | "check-double" | "times" };

const SCREENING: Setting[] = [
  { name: "Good Fit and Above", icon: "check" },
  { name: "Only Strong Fit", icon: "check-double" },
  { name: "No Automatic Promotion", icon: "times" },
];

export default function CVScreeningSelect({
  initial = SCREENING[0].name,
  value,
  onChange,
}: {
  initial?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
  // prefer controlled value prop, fallback to initial
  const [valueState, setValueState] = useState<string>(value ?? initial);

  // ref for root element
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Sync when parent changes the value prop (do NOT re-emit onChange here)
  useEffect(() => {
    if (value !== undefined && value !== valueState) {
      setValueState(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]); // only run when parent updates `value`

  // close popup when clicking outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

   const pick = (s: Setting) => {
    setValueState(s.name);
    // notify parent of user choice
    onChange?.(s.name);
    setOpen(false);
  };


  


  const Icon = (kind: Setting["icon"]) => {
    if (kind === "check")
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 13l4 4L19 7" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    if (kind === "check-double")
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 13l4 4L19 7" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M1 13l4 4L15 7" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 18L18 6M6 6l12 12" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="cv-select-root" ref={rootRef}>
      <button
        type="button"
        className={`cv-select-toggle ${open ? "open" : ""}`}
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="cv-select-left-icon">
          {/* show icon for the currently selected option */}
          {Icon(SCREENING.find((s) => s.name === value)?.icon ?? "check")}
        </span>

        <span className="cv-select-value">{value}</span>

        <span className="cv-select-caret" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="cv-select-popup" role="listbox" aria-label="CV screening options">
          {SCREENING.map((s) => {
            const isSelected = s.name === value;
            return (
              <div
                key={s.name}
                role="option"
                aria-selected={isSelected}
                className={`cv-select-item ${isSelected ? "selected" : ""}`}
                onClick={() => pick(s)}
              >
                <span className="cv-item-left">{Icon(s.icon)}</span>
                <span className="cv-item-text">{s.name}</span>
                <span className="cv-item-right">
                  {isSelected ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 12l4 4 8-8" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
