"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import RichTextEditor, { type RichTextEditorHandle } from "@/components/members/RichTextEditor";

export interface EmailBodyEditorHandle {
  insertAtCursor: (text: string) => void;
  setContent: (html: string) => void;
}

interface Props {
  id?: string;
  "aria-labelledby"?: string;
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  attachments?: File[];
  onAttachmentsChange?: (files: File[]) => void;
}

const EmailBodyEditor = forwardRef<EmailBodyEditorHandle, Props>(function EmailBodyEditor(
  { id, "aria-labelledby": ariaLabelledBy, content, onChange, placeholder, attachments, onAttachmentsChange },
  ref
) {
  const [mode, setMode] = useState<"rich" | "html">("rich");
  const richRef = useRef<RichTextEditorHandle>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    insertAtCursor(text: string) {
      if (mode === "rich") {
        richRef.current?.insertAtCursor(text);
      } else {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart ?? el.value.length;
        const end   = el.selectionEnd   ?? el.value.length;
        const next  = el.value.slice(0, start) + text + el.value.slice(end);
        onChange(next);
        // Restore cursor after the inserted text.
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + text.length;
          el.focus();
        });
      }
    },
    setContent(html: string) {
      if (mode === "rich") {
        richRef.current?.setContent(html);
      } else {
        onChange(html);
      }
    },
  }));

  const switchToHtml = useCallback(() => {
    // Content is already in sync via onChange — just flip the mode.
    setMode("html");
  }, []);

  const switchToRich = useCallback(() => {
    // Tiptap will re-parse the current HTML. Custom inline styles (e.g. from
    // pasted raw HTML) may be simplified by Tiptap's schema.
    setMode("rich");
    // Give the editor a tick to mount before setting content.
    requestAnimationFrame(() => richRef.current?.setContent(content));
  }, [content]);

  return (
    <div className="flex flex-col">
      {/* Mode toggle */}
      <div className="flex justify-end mb-1.5">
        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs font-body">
          <button
            type="button"
            aria-pressed={mode === "rich"}
            onClick={switchToRich}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              mode === "rich"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            Rich Text
          </button>
          <button
            type="button"
            aria-pressed={mode === "html"}
            onClick={switchToHtml}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              mode === "html"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            HTML
          </button>
        </div>
      </div>

      {mode === "rich" ? (
        <RichTextEditor
          id={id}
          aria-labelledby={ariaLabelledBy}
          ref={richRef}
          content={content}
          onChange={onChange}
          placeholder={placeholder}
          attachments={attachments}
          onAttachmentsChange={onAttachmentsChange}
        />
      ) : (
        <div className="relative">
          <textarea
            id={id}
            aria-labelledby={ariaLabelledBy}
            aria-label={ariaLabelledBy ? undefined : "Email body HTML"}
            ref={textareaRef}
            value={content}
            onChange={e => onChange(e.target.value)}
            rows={18}
            spellCheck={false}
            placeholder={"<!DOCTYPE html><html>…</html>\n\nOr plain text — use {{firstName}}, {{name}}, {{link}}"}
            className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#F6B78D]/50 resize-y leading-relaxed"
          />
          <span className="absolute bottom-2 right-3 text-[10px] text-white/20 font-mono pointer-events-none select-none">
            {"{{firstName}}  {{name}}  {{link}}"}
          </span>
        </div>
      )}
    </div>
  );
});

export default EmailBodyEditor;
