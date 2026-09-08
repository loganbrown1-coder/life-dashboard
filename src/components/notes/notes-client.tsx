"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2, Pin, Search, ChevronLeft, MoreHorizontal, FolderOpen } from "lucide-react";
import { createNote, updateNote, deleteNote, pinNote } from "@/actions/notes";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";

type Note = {
  id: string;
  title: string;
  section: string;
  content: string;
  pinnedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function fmtDate(d: Date) {
  if (isToday(d))     return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMM");
}

function preview(content: string) {
  const line = content.split("\n").find((l) => l.trim()) ?? "";
  return line.slice(0, 80) || "No additional text";
}

const DEFAULT_SECTIONS = ["Personal", "Work", "Ideas"];

export function NotesClient({ notes }: { notes: Note[] }) {
  const [activeSection, setActiveSection] = useState<string | null>(null); // null = All Notes
  const [selectedId, setSelectedId]       = useState<string | null>(notes[0]?.id ?? null);
  const [search, setSearch]               = useState("");
  const [showList, setShowList]           = useState(true); // mobile: toggle list vs editor
  const [, start]                         = useTransition();

  // Derive sections from notes + defaults
  const noteSections = Array.from(new Set([...DEFAULT_SECTIONS, ...notes.map((n) => n.section)])).sort();

  // Filter notes
  const filtered = notes
    .filter((n) => !activeSection || n.section === activeSection)
    .filter((n) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.pinnedAt && !b.pinnedAt) return -1;
      if (!a.pinnedAt && b.pinnedAt) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  // Section counts
  const countFor = (s: string | null) =>
    s ? notes.filter((n) => n.section === s).length : notes.length;

  async function handleNew() {
    const section = activeSection ?? "Personal";
    start(async () => {
      const id = await createNote("", section);
      setSelectedId(id);
      setShowList(false);
    });
  }

  function selectNote(id: string) {
    setSelectedId(id);
    setShowList(false);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-4 -my-6 md:-mx-8 overflow-hidden">

      {/* ── Left: Sections sidebar ── */}
      <aside className="hidden md:flex flex-col w-44 shrink-0 border-r bg-gray-50/50 pt-4 pb-4">
        <div className="px-3 mb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1">Sections</p>
        </div>
        <SectionItem
          label="All Notes"
          count={countFor(null)}
          active={activeSection === null}
          onClick={() => { setActiveSection(null); setShowList(true); }}
        />
        {noteSections.map((s) => (
          <SectionItem
            key={s}
            label={s}
            count={countFor(s)}
            active={activeSection === s}
            onClick={() => { setActiveSection(s); setShowList(true); }}
          />
        ))}
        <AddSectionButton onCreate={(name) => {
          start(async () => {
            const id = await createNote("", name);
            setActiveSection(name);
            setSelectedId(id);
            setShowList(false);
          });
        }} />
      </aside>

      {/* ── Middle: Notes list ── */}
      <div className={`flex flex-col w-full md:w-64 shrink-0 border-r bg-white ${!showList ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 pt-4 pb-2 border-b">
          <h2 className="font-semibold text-gray-900 flex-1 truncate text-sm">
            {activeSection ?? "All Notes"}
          </h2>
          <button
            onClick={handleNew}
            className="p-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white transition-colors shrink-0"
            title="New note"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-gray-50"
            />
          </div>
        </div>

        {/* Mobile: section tabs */}
        <div className="flex md:hidden gap-1 px-2 py-2 border-b overflow-x-auto">
          <button
            onClick={() => setActiveSection(null)}
            className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${activeSection === null ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            All
          </button>
          {noteSections.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${activeSection === s ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              {search ? "No notes match" : "No notes yet"}
            </div>
          ) : (
            filtered.map((n) => (
              <button
                key={n.id}
                onClick={() => selectNote(n.id)}
                className={`w-full text-left px-3 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedId === n.id ? "bg-teal-50 border-l-2 border-l-teal-400" : ""}`}
              >
                <div className="flex items-start gap-1.5">
                  {n.pinnedAt && <Pin className="w-2.5 h-2.5 text-teal-500 shrink-0 mt-0.5" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-semibold text-gray-900 truncate">{n.title || "Untitled"}</p>
                      <span className="text-[10px] text-gray-400 shrink-0">{fmtDate(n.updatedAt)}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate leading-snug">{preview(n.content)}</p>
                    {activeSection === null && (
                      <p className="text-[10px] text-teal-500 mt-0.5 font-medium">{n.section}</p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Editor ── */}
      <div className={`flex-1 flex flex-col min-w-0 bg-white ${showList && "hidden md:flex"}`}>
        {selected ? (
          <NoteEditor
            key={selected.id}
            note={selected}
            sections={noteSections}
            onBack={() => setShowList(true)}
            onDelete={() => {
              start(async () => {
                await deleteNote(selected.id);
                setSelectedId(filtered.find((n) => n.id !== selected.id)?.id ?? null);
                setShowList(true);
                toast.success("Note deleted");
              });
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3">
            <FolderOpen className="w-12 h-12" />
            <p className="text-sm">Select a note or create one</p>
            <button
              onClick={handleNew}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> New note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section sidebar item ──────────────────────────────────────────────────────

function SectionItem({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 mx-1 rounded-lg text-left transition-colors ${active ? "bg-teal-100 text-teal-800" : "text-gray-600 hover:bg-gray-100"}`}
    >
      <span className="text-sm flex-1 truncate font-medium">{label}</span>
      <span className="text-xs text-gray-400 shrink-0">{count}</span>
    </button>
  );
}

function AddSectionButton({ onCreate }: { onCreate: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName]     = useState("");
  const ref                 = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) ref.current?.focus(); }, [adding]);

  function save() {
    if (name.trim()) onCreate(name.trim());
    setAdding(false);
    setName("");
  }

  if (adding) return (
    <div className="px-3 pt-1">
      <input
        ref={ref}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setAdding(false); setName(""); } }}
        onBlur={save}
        placeholder="Section name…"
        className="w-full rounded-lg border border-teal-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
      />
    </div>
  );

  return (
    <button
      onClick={() => setAdding(true)}
      className="flex items-center gap-1.5 px-5 py-2 text-xs text-gray-400 hover:text-teal-600 transition-colors"
    >
      <Plus className="w-3 h-3" /> New section
    </button>
  );
}

// ── Note editor ───────────────────────────────────────────────────────────────

function NoteEditor({ note, sections, onBack, onDelete }: {
  note: Note;
  sections: string[];
  onBack: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle]       = useState(note.title);
  const [content, setContent]   = useState(note.content);
  const [section, setSection]   = useState(note.section);
  const [pinned, setPinned]     = useState(!!note.pinnedAt);
  const [showMenu, setShowMenu] = useState(false);
  const [savedAt, setSavedAt]   = useState<Date>(note.updatedAt);
  const [saving, setSaving]     = useState(false);
  const [, start]               = useTransition();
  const saveTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef              = useRef<HTMLTextAreaElement>(null);

  // Clean up timer on unmount so it doesn't trigger a stale re-render
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [content]);

  // Debounced save on change
  const schedSave = useCallback((t: string, c: string, s: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(() => {
      start(async () => {
        await updateNote(note.id, { title: t, content: c, section: s });
        setSaving(false);
        setSavedAt(new Date());
      });
    }, 800);
  }, [note.id]);

  function handleTitleChange(v: string) {
    setTitle(v);
    schedSave(v, content, section);
  }

  function handleContentChange(v: string) {
    setContent(v);
    schedSave(title, v, section);
  }

  function handleSectionChange(v: string) {
    setSection(v);
    start(async () => {
      await updateNote(note.id, { section: v });
      setSavedAt(new Date());
    });
  }

  function handlePin() {
    const next = !pinned;
    setPinned(next);
    start(async () => { await pinNote(note.id, next); });
    toast.success(next ? "Note pinned" : "Note unpinned");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <button onClick={onBack} className="md:hidden p-1 text-gray-400 hover:text-gray-700">
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Section selector */}
        <select
          value={section}
          onChange={(e) => handleSectionChange(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
        >
          {sections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <span className="text-xs text-gray-400 flex-1 text-right">
          {saving ? <span className="text-teal-400">Saving…</span> : fmtDate(savedAt)}
        </span>

        <button
          onClick={handlePin}
          title={pinned ? "Unpin" : "Pin"}
          className={`p-1.5 rounded-lg transition-colors ${pinned ? "text-teal-600 bg-teal-50" : "text-gray-400 hover:text-teal-500 hover:bg-gray-50"}`}
        >
          <Pin className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border shadow-lg z-10 overflow-hidden">
              <button
                onClick={() => { setShowMenu(false); onDelete(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editable area */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Title"
          className="w-full text-2xl font-bold text-gray-900 placeholder-gray-300 focus:outline-none bg-transparent mb-3 leading-tight"
        />

        {/* Content */}
        <textarea
          ref={contentRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start writing…"
          rows={1}
          className="w-full text-sm text-gray-700 placeholder-gray-300 focus:outline-none bg-transparent resize-none leading-relaxed min-h-[60vh]"
        />
      </div>

      {/* Click away to close menu */}
      {showMenu && <div className="fixed inset-0 z-[5]" onClick={() => setShowMenu(false)} />}
    </div>
  );
}
