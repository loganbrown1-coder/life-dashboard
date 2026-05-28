"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Home, Calendar, Dumbbell, UtensilsCrossed, Wallet,
  Target, CheckSquare, BarChart2, Settings, Scale,
  Footprints, Moon, PoundSterling, Plus, Search,
} from "lucide-react";

type Item = {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const navigate = useCallback((path: string) => {
    router.push(path);
    setOpen(false);
    setQuery("");
  }, [router]);

  const items: Item[] = [
    // Navigation
    { id: "home",      label: "Home",            icon: <Home className="w-4 h-4" />,             action: () => navigate("/"),                 keywords: "dashboard" },
    { id: "cal",       label: "Calendar",         icon: <Calendar className="w-4 h-4" />,         action: () => navigate("/calendar") },
    { id: "health",    label: "Health",           icon: <Dumbbell className="w-4 h-4" />,         action: () => navigate("/health") },
    { id: "workouts",  label: "Workouts",         icon: <Dumbbell className="w-4 h-4" />,         action: () => navigate("/health/workouts"),  keywords: "gym exercise" },
    { id: "weight",    label: "Weight",           icon: <Scale className="w-4 h-4" />,            action: () => navigate("/health/weight") },
    { id: "steps",     label: "Steps",            icon: <Footprints className="w-4 h-4" />,       action: () => navigate("/health/steps") },
    { id: "sleep",     label: "Sleep",            icon: <Moon className="w-4 h-4" />,             action: () => navigate("/health/sleep") },
    { id: "food",      label: "Food & Meals",     icon: <UtensilsCrossed className="w-4 h-4" />, action: () => navigate("/food"),              keywords: "eat nutrition" },
    { id: "finances",  label: "Finances",         icon: <Wallet className="w-4 h-4" />,           action: () => navigate("/finances"),          keywords: "money bank spending" },
    { id: "budgets",   label: "Budgets",          icon: <Wallet className="w-4 h-4" />,           action: () => navigate("/finances/budgets"),  keywords: "budget limit spending" },
    { id: "savings",   label: "Savings Goals",    icon: <PoundSterling className="w-4 h-4" />,    action: () => navigate("/finances/savings") },
    { id: "goals",     label: "Goals",            icon: <Target className="w-4 h-4" />,           action: () => navigate("/goals"),             keywords: "aim target objective" },
    { id: "projects",  label: "Work / Projects",  icon: <CheckSquare className="w-4 h-4" />,      action: () => navigate("/projects"),          keywords: "tasks work todo" },
    { id: "opspot",    label: "OpSpot",           icon: <BarChart2 className="w-4 h-4" />,        action: () => navigate("/opspot"),            keywords: "sales pipeline crm" },
    { id: "settings",  label: "Settings",         icon: <Settings className="w-4 h-4" />,         action: () => navigate("/settings") },
    // Quick actions
    { id: "add-task",  label: "Add a task",       description: "Opens Work page",          icon: <Plus className="w-4 h-4" />, action: () => navigate("/projects"),  keywords: "new task todo" },
    { id: "log-weight",label: "Log weight",       description: "Health → Weight",          icon: <Scale className="w-4 h-4" />, action: () => navigate("/health/weight"), keywords: "weigh body" },
    { id: "log-sleep", label: "Log sleep",        description: "Health → Sleep",           icon: <Moon className="w-4 h-4" />,  action: () => navigate("/health/sleep"),  keywords: "sleep rest" },
    { id: "add-txn",   label: "Add transaction",  description: "Finances page",            icon: <PoundSterling className="w-4 h-4" />, action: () => navigate("/finances"), keywords: "spend buy pay" },
    { id: "backup",    label: "Download backup",  description: "Downloads dashboard.db",   icon: <Settings className="w-4 h-4" />, action: () => { window.location.href = "/api/backup"; setOpen(false); }, keywords: "export data save" },
  ];

  const filtered = query.trim()
    ? items.filter((item) => {
        const haystack = `${item.label} ${item.description ?? ""} ${item.keywords ?? ""}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
    : items;

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={() => { setOpen(false); setQuery(""); }}
      />

      {/* Palette */}
      <div className="fixed top-[20vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg mx-4">
        <div className="rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, actions…"
              className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length > 0) {
                  filtered[0].action();
                }
              }}
            />
            <kbd className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto py-2">
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No results for &quot;{query}&quot;</p>
            )}
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors group"
              >
                <span className="text-gray-400 group-hover:text-[#0d9488] transition-colors flex-shrink-0">
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-gray-400 truncate">{item.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 px-4 py-2">
            <p className="text-xs text-gray-400">
              <kbd className="bg-gray-100 rounded px-1 py-0.5 text-[10px]">⌘K</kbd>{" "}
              to open · <kbd className="bg-gray-100 rounded px-1 py-0.5 text-[10px]">↵</kbd>{" "}
              to select · <kbd className="bg-gray-100 rounded px-1 py-0.5 text-[10px]">ESC</kbd>{" "}
              to close
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
