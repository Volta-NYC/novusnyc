"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";

// ── Custom FontSize extension via TextStyle attribute ──────────────────────────
const FontSizeTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
        renderHTML: (attrs) =>
          attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
    };
  },
});

// ── Constants ──────────────────────────────────────────────────────────────────
const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet", value: "'Trebuchet MS', sans-serif" },
];

const FONT_SIZES = [
  "10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px",
];

const TEXT_COLORS = [
  "#FFFFFF", "#E5E7EB", "#9CA3AF", "#6B7280",
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#85CC17",
  "#000000", "#1F2937", "#374151", "#4B5563",
];

const HIGHLIGHT_COLORS = [
  "#FEF08A", "#86EFAC", "#93C5FD", "#FCA5A5",
  "#F9A8D4", "#C4B5FD", "#6EE7B7", "#FED7AA",
  "transparent",
];

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function BoldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v7a6 6 0 0 0 12 0V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  );
}

function StrikeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <path d="M16 6C16 6 14.5 4 12 4C9.5 4 8 5.5 8 7.5C8 9.5 9.5 10.5 12 11" />
      <path d="M8 18C8 18 9.5 20 12 20C14.5 20 16 18.5 16 16.5" />
    </svg>
  );
}

function AlignLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="15" y2="12" />
      <line x1="3" y1="18" x2="18" y2="18" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="6" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function AlignJustifyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function NumberedListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 10h2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IndentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="9" y1="18" x2="21" y2="18" />
      <polyline points="3 8 7 12 3 16" />
    </svg>
  );
}

function OutdentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="9" y1="18" x2="21" y2="18" />
      <polyline points="7 8 3 12 7 16" />
    </svg>
  );
}

function BlockquoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  );
}

function HrIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="7" x2="7" y2="7" />
      <line x1="17" y1="7" x2="21" y2="7" />
      <line x1="3" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="21" y2="17" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function TextColorIcon({ color }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <text x="3" y="17" fontSize="16" fontWeight="bold" fill="currentColor">A</text>
      <rect x="3" y="19" width="18" height="3" fill={color || "#85CC17"} rx="1" />
    </svg>
  );
}

function HighlightIcon({ color }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 7l-5 10h14L13 7z" fill={color && color !== "transparent" ? color : "none"} strokeLinejoin="round" />
      <line x1="3" y1="21" x2="21" y2="21" strokeWidth="2" />
    </svg>
  );
}

function ClearFormattingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3" />
      <path d="M5 20h6" />
      <path d="M13 4l-4 16" />
      <line x1="17" y1="14" x2="21" y2="18" />
      <line x1="21" y1="14" x2="17" y2="18" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

// ── Helper: Toolbar button ─────────────────────────────────────────────────────
function ToolbarBtn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      disabled={disabled}
      className={[
        "h-7 w-7 rounded flex items-center justify-center transition-colors",
        active
          ? "text-[#85CC17] bg-[#85CC17]/10"
          : "text-white/60 hover:text-white hover:bg-white/8",
        disabled ? "opacity-30 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span className="w-px h-5 bg-white/10 mx-1 self-center flex-shrink-0" />;
}

// ── Color Palette popup ────────────────────────────────────────────────────────
function ColorPalette({
  colors,
  onSelect,
  onClose,
  label,
}: {
  colors: string[];
  onSelect: (color: string) => void;
  onClose: () => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-50 bg-[#1C1F26] border border-white/10 rounded-lg p-2 shadow-xl"
    >
      <p className="text-[10px] text-white/40 mb-1.5 px-0.5">{label}</p>
      <div className="grid grid-cols-4 gap-1">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(color); onClose(); }}
            title={color}
            className="h-6 w-6 rounded border border-white/10 hover:scale-110 transition-transform"
            style={{
              backgroundColor: color === "transparent" ? undefined : color,
              backgroundImage: color === "transparent"
                ? "linear-gradient(45deg, #888 25%, transparent 25%, transparent 75%, #888 75%), linear-gradient(45deg, #888 25%, transparent 25%, transparent 75%, #888 75%)"
                : undefined,
              backgroundSize: color === "transparent" ? "6px 6px" : undefined,
              backgroundPosition: color === "transparent" ? "0 0, 3px 3px" : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Link popup ─────────────────────────────────────────────────────────────────
function LinkPopup({
  initialUrl,
  onSet,
  onRemove,
  onClose,
}: {
  initialUrl: string;
  onSet: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-50 bg-[#1C1F26] border border-white/10 rounded-lg p-3 shadow-xl w-72"
    >
      <p className="text-[10px] text-white/40 mb-1.5">Insert link</p>
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onSet(url); onClose(); }
          if (e.key === "Escape") onClose();
        }}
        placeholder="https://..."
        className="w-full bg-[#0F1014] border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/45 mb-2"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSet(url); onClose(); }}
          className="flex-1 h-7 rounded bg-[#85CC17]/15 text-[#85CC17] text-xs font-medium hover:bg-[#85CC17]/25 transition-colors"
        >
          Set link
        </button>
        {initialUrl && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onRemove(); onClose(); }}
            className="flex-1 h-7 rounded bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors"
          >
            Remove
          </button>
        )}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onClose(); }}
          className="h-7 px-3 rounded bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────
export interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  attachments?: File[];
  onAttachmentsChange?: (files: File[]) => void;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Write your email...",
  minHeight = 240,
  attachments = [],
  onAttachmentsChange,
}: RichTextEditorProps) {
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [activeTextColor, setActiveTextColor] = useState<string>("#FFFFFF");
  const [activeHighlight, setActiveHighlight] = useState<string>("#FEF08A");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // We override textStyle via FontSizeTextStyle below
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "rte-link" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      FontSizeTextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose-rte focus:outline-none",
        style: `min-height: ${minHeight}px; padding: 12px;`,
      },
    },
  });

  // Sync external content changes (e.g. reset after send)
  useEffect(() => {
    if (!editor) return;
    if (content === "" && editor.getHTML() !== "<p></p>") {
      editor.commands.setContent("");
    }
  }, [content, editor]);

  const currentFontFamily = editor?.getAttributes("textStyle").fontFamily ?? "";
  const currentFontSize = editor?.getAttributes("textStyle").fontSize ?? "";

  const handleFontFamily = useCallback(
    (value: string) => {
      if (!editor) return;
      if (!value) {
        editor.chain().focus().unsetFontFamily().run();
      } else {
        editor.chain().focus().setFontFamily(value).run();
      }
    },
    [editor],
  );

  const handleFontSize = useCallback(
    (value: string) => {
      if (!editor) return;
      editor.chain().focus().setMark("textStyle", { fontSize: value || null }).run();
    },
    [editor],
  );

  const handleSetLink = useCallback(
    (url: string) => {
      if (!editor) return;
      if (!url) {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      const finalUrl = url.startsWith("http") ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: finalUrl }).run();
    },
    [editor],
  );

  const handleRemoveLink = useCallback(() => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
  }, [editor]);

  const handleAttachFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFiles = Array.from(e.target.files ?? []);
      if (newFiles.length === 0) return;
      onAttachmentsChange?.([...attachments, ...newFiles]);
      // Reset input so same file can be re-added
      e.target.value = "";
    },
    [attachments, onAttachmentsChange],
  );

  const removeAttachment = useCallback(
    (index: number) => {
      onAttachmentsChange?.(attachments.filter((_, i) => i !== index));
    },
    [attachments, onAttachmentsChange],
  );

  const currentLinkUrl = editor?.getAttributes("link").href ?? "";

  if (!editor) return null;

  return (
    <div className="flex flex-col">
      {/* ── Toolbar ── */}
      <div className="bg-[#1C1F26] border border-white/10 rounded-t-lg px-2 py-1.5 flex flex-wrap gap-0.5 items-center">

        {/* Row 1 group: Font family + size */}
        <select
          value={currentFontFamily}
          onChange={(e) => handleFontFamily(e.target.value)}
          title="Font family"
          className="h-7 rounded bg-transparent border border-white/10 px-1.5 text-xs text-white/70 focus:outline-none focus:border-[#85CC17]/45 mr-0.5"
          style={{ minWidth: 90 }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value} style={{ background: "#1C1F26" }}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={currentFontSize}
          onChange={(e) => handleFontSize(e.target.value)}
          title="Font size"
          className="h-7 rounded bg-transparent border border-white/10 px-1.5 text-xs text-white/70 focus:outline-none focus:border-[#85CC17]/45"
          style={{ minWidth: 64 }}
        >
          <option value="" style={{ background: "#1C1F26" }}>Size</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s} style={{ background: "#1C1F26" }}>
              {s}
            </option>
          ))}
        </select>

        <Separator />

        {/* Text formatting */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
          <BoldIcon />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
          <ItalicIcon />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
          <UnderlineIcon />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <StrikeIcon />
        </ToolbarBtn>

        <Separator />

        {/* Text color */}
        <div className="relative">
          <ToolbarBtn
            onClick={() => {
              setShowHighlight(false);
              setShowLink(false);
              setShowTextColor((v) => !v);
            }}
            active={showTextColor}
            title="Text color"
          >
            <TextColorIcon color={activeTextColor} />
          </ToolbarBtn>
          {showTextColor && (
            <ColorPalette
              colors={TEXT_COLORS}
              label="Text color"
              onSelect={(color) => {
                setActiveTextColor(color);
                editor.chain().focus().setColor(color).run();
              }}
              onClose={() => setShowTextColor(false)}
            />
          )}
        </div>

        {/* Highlight color */}
        <div className="relative">
          <ToolbarBtn
            onClick={() => {
              setShowTextColor(false);
              setShowLink(false);
              setShowHighlight((v) => !v);
            }}
            active={showHighlight}
            title="Highlight color"
          >
            <HighlightIcon color={activeHighlight !== "transparent" ? activeHighlight : undefined} />
          </ToolbarBtn>
          {showHighlight && (
            <ColorPalette
              colors={HIGHLIGHT_COLORS}
              label="Highlight color"
              onSelect={(color) => {
                setActiveHighlight(color);
                if (color === "transparent") {
                  editor.chain().focus().unsetHighlight().run();
                } else {
                  editor.chain().focus().setHighlight({ color }).run();
                }
              }}
              onClose={() => setShowHighlight(false)}
            />
          )}
        </div>

        <Separator />

        {/* Alignment */}
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
          <AlignLeftIcon />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">
          <AlignCenterIcon />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
          <AlignRightIcon />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justify">
          <AlignJustifyIcon />
        </ToolbarBtn>

        <Separator />

        {/* Lists + indent */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <BulletListIcon />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
          <NumberedListIcon />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().sinkListItem("listItem").run()} active={false} title="Indent">
          <IndentIcon />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().liftListItem("listItem").run()} active={false} title="Outdent">
          <OutdentIcon />
        </ToolbarBtn>

        <Separator />

        {/* Structure */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <BlockquoteIcon />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Horizontal rule">
          <HrIcon />
        </ToolbarBtn>

        <Separator />

        {/* Link */}
        <div className="relative">
          <ToolbarBtn
            onClick={() => {
              setShowTextColor(false);
              setShowHighlight(false);
              setShowLink((v) => !v);
            }}
            active={editor.isActive("link") || showLink}
            title="Insert link"
          >
            <LinkIcon />
          </ToolbarBtn>
          {showLink && (
            <LinkPopup
              initialUrl={currentLinkUrl}
              onSet={handleSetLink}
              onRemove={handleRemoveLink}
              onClose={() => setShowLink(false)}
            />
          )}
        </div>

        <Separator />

        {/* Clear formatting */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          active={false}
          title="Clear formatting"
        >
          <ClearFormattingIcon />
        </ToolbarBtn>

        <Separator />

        {/* Attachments */}
        <ToolbarBtn
          onClick={() => fileInputRef.current?.click()}
          active={attachments.length > 0}
          title="Attach files"
        >
          <PaperclipIcon />
        </ToolbarBtn>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleAttachFiles}
        />
      </div>

      {/* ── Editor area ── */}
      <div className="bg-[#0F1014] border border-t-0 border-white/10 rounded-b-lg overflow-hidden">
        <style>{`
          .prose-rte {
            color: rgba(255,255,255,0.85);
            font-size: 0.875rem;
            line-height: 1.6;
            word-break: break-word;
          }
          .prose-rte p { margin: 0 0 0.5em; }
          .prose-rte p:last-child { margin-bottom: 0; }
          .prose-rte strong { font-weight: 700; }
          .prose-rte em { font-style: italic; }
          .prose-rte u { text-decoration: underline; }
          .prose-rte s { text-decoration: line-through; }
          .prose-rte blockquote {
            border-left: 3px solid #85CC17;
            margin: 0.5em 0;
            padding-left: 0.75em;
            color: rgba(255,255,255,0.55);
          }
          .prose-rte ul { list-style-type: disc; padding-left: 1.5em; margin: 0.5em 0; }
          .prose-rte ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.5em 0; }
          .prose-rte li { margin: 0.1em 0; }
          .prose-rte hr {
            border: none;
            border-top: 1px solid rgba(255,255,255,0.12);
            margin: 0.75em 0;
          }
          .rte-link {
            color: #85CC17;
            text-decoration: underline;
            cursor: pointer;
          }
          .prose-rte .ProseMirror-selectednode { outline: 2px solid #85CC17; }
          .prose-rte.ProseMirror-focused { outline: none; }
          /* Placeholder */
          .prose-rte p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: rgba(255,255,255,0.2);
            pointer-events: none;
            height: 0;
          }
        `}</style>
        <EditorContent editor={editor} />
      </div>

      {/* ── Attached files list ── */}
      {attachments.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {attachments.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center gap-2 bg-[#1C1F26] border border-white/8 rounded-lg px-3 py-1.5 text-xs"
            >
              <PaperclipIcon />
              <span className="text-white/75 truncate flex-1">{file.name}</span>
              <span className="text-white/35 flex-shrink-0">
                {file.size < 1024
                  ? `${file.size} B`
                  : file.size < 1024 * 1024
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="text-white/35 hover:text-white/70 ml-1 flex-shrink-0"
                title="Remove attachment"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
