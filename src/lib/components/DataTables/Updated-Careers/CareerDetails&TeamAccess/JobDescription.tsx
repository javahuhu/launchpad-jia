"use client";

import React from "react";

type RichJobDescriptionProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
};

export default function JobDescription({
  value,
  onChange,
  placeholder = "Enter job description...",
  className = "",
  hasError = false,
}: RichJobDescriptionProps) {
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const initializedRef = React.useRef(false);
  const composingRef = React.useRef(false);
  const rafRef = React.useRef<number | null>(null);
  const lastValueRef = React.useRef<string>(value ?? "");

  // Initialize once
  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (!initializedRef.current) {
      el.innerHTML = value ?? "";
      lastValueRef.current = value ?? "";
      initializedRef.current = true;
    }
  }, []);

  // Sync external value only when not focused or composing
  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const isFocused = document.activeElement === el;
    if (!isFocused && !composingRef.current && value !== lastValueRef.current) {
      el.innerHTML = value ?? "";
      lastValueRef.current = value ?? "";
    }
  }, [value]);

  const scheduleOnChange = React.useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const html = editorRef.current?.innerHTML ?? "";
      lastValueRef.current = html;
      onChange(html);
    });
  }, [onChange]);

  const handleInput = React.useCallback(() => {
    if (composingRef.current) return;
    scheduleOnChange();
  }, [scheduleOnChange]);

  const onCompositionStart = React.useCallback(() => {
    composingRef.current = true;
  }, []);
  const onCompositionEnd = React.useCallback(() => {
    composingRef.current = false;
    const html = editorRef.current?.innerHTML ?? "";
    lastValueRef.current = html;
    onChange(html);
  }, [onChange]);

  const onBlur = React.useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    if (html !== lastValueRef.current) {
      lastValueRef.current = html;
      onChange(html);
    }
  }, [onChange]);

  const doCmd = React.useCallback((cmd: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(cmd, false, null);
    scheduleOnChange();
  }, [scheduleOnChange]);

  return (
    <div className={`rj-card ${className} ${hasError ? "rj-error" : ""}`}>


      {/* Editable content */}
      <div
        ref={editorRef}
        className="rj-editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        onInput={handleInput}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        onBlur={onBlur}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {/* Divider line */}
      <div className="rj-divider" />

      {/* Toolbar */}
      <div className="rj-toolbar">
        <button type="button" onClick={() => doCmd("bold")} aria-label="Bold"><b>B</b></button>
        <button type="button" onClick={() => doCmd("italic")} aria-label="Italic"><i>I</i></button>
        <button type="button" onClick={() => doCmd("underline")} aria-label="Underline"><u>U</u></button>
        <button type="button" onClick={() => doCmd("strikeThrough")} aria-label="Strike"><s>S</s></button>
        <div className="rj-toolbar-sep" />
        <button type="button" onClick={() => doCmd("insertUnorderedList")} aria-label="Bulleted list">•</button>
        <button type="button" onClick={() => doCmd("insertOrderedList")} aria-label="Numbered list">1.</button>
      </div>
    </div>
  );
}
