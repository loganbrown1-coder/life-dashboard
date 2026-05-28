"use client";

import { useState, useEffect } from "react";
import { ExternalLink, AlertCircle, Clock, TrendingUp, Users, Zap, RefreshCw } from "lucide-react";

// ── Types matching OpSpot's DB structure ───────────────────────────────────────

type Contact = {
  id: number;
  brand: string;
  contact: string;
  role: string;
  region: string;
  sector: string;
  owner: string;
  stage: "outreach" | "qualified" | "discovery";
  followUpDate?: string;
  messages: number;
  notes: string;
  frozen?: boolean;
};

type Trial = {
  id: number;
  brand: string;
  contact: string;
  owner: string;
  region: string;
  sector: string;
  startDate?: string;
  duration: number; // months
  status: "Starting soon" | "Active" | "Finished";
  outcome: "Pending" | "Won" | "Lost";
  dealValue?: number;
  notes: string;
};

type OnboardingEntry = {
  id: number;
  brand: string;
  contact: string;
  owner: string;
  region: string;
  onboardingStatus: string;
  dealValue?: number;
  notes: string;
};

type OpSpotDB = {
  contacts: Contact[];
  trials: Trial[];
  onboarding: OnboardingEntry[];
  activityLog: Array<{ text: string; time: string; type: string }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

function trialEndDate(t: Trial): Date | null {
  if (!t.startDate) return null;
  const d = new Date(t.startDate);
  d.setMonth(d.getMonth() + (t.duration || 1));
  return d;
}

function trialDaysLeft(t: Trial): number | null {
  const end = trialEndDate(t);
  if (!end) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OpSpotDashboard() {
  const [db, setDb] = useState<OpSpotDB | null>(null);
  const [loaded, setLoaded] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  function loadData() {
    const raw = localStorage.getItem("opspot_db_v2");
    if (raw) {
      try {
        setDb(JSON.parse(raw));
      } catch {
        setDb(null);
      }
    } else {
      setDb(null);
    }
    setLoaded(true);
  }

  useEffect(() => { loadData(); }, []);

  if (!loaded) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;
  }

  // ── Not connected yet ──────────────────────────────────────────────────────
  if (!db) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">OpSpot</h1>
          <p className="text-gray-500 mt-1">Sales pipeline — live from your OpSpot data</p>
        </div>
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center space-y-4">
          <div className="text-4xl">📊</div>
          <h2 className="font-semibold text-gray-700">No OpSpot data found</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            OpSpot needs to be opened from this dashboard (same browser tab) so your data is accessible here.
            Click below to open it, add some contacts, then come back to this page.
          </p>
          <a
            href="/opspot/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F1F3D] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#162a52] transition-colors"
          >
            Open OpSpot <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-xs text-gray-400">After using OpSpot, come back and click Refresh</p>
          <button onClick={loadData} className="text-xs text-[#0d9488] hover:underline flex items-center gap-1 mx-auto">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const contacts  = db.contacts  ?? [];
  const trials    = db.trials    ?? [];
  const onboarding = db.onboarding ?? [];

  const outreachCount  = contacts.filter((c) => c.stage === "outreach"  && !c.frozen).length;
  const qualifiedCount = contacts.filter((c) => c.stage === "qualified" && !c.frozen).length;
  const discoveryCount = contacts.filter((c) => c.stage === "discovery" && !c.frozen).length;
  const activeTrials   = trials.filter((t) => t.status === "Active" && t.outcome === "Pending").length;
  const onboardingCount = onboarding.length;

  // Follow-ups overdue or due today
  const overdueFollowups = contacts.filter((c) => {
    if (!c.followUpDate || c.frozen) return false;
    return daysUntil(c.followUpDate) < 0;
  });
  const dueTodayFollowups = contacts.filter((c) => {
    if (!c.followUpDate || c.frozen) return false;
    return daysUntil(c.followUpDate) === 0;
  });
  const dueSoonFollowups = contacts.filter((c) => {
    if (!c.followUpDate || c.frozen) return false;
    const d = daysUntil(c.followUpDate);
    return d > 0 && d <= 3;
  });

  // Trials expiring soon (≤14 days) or overdue
  const expiringTrials = trials
    .filter((t) => t.status === "Active" && t.outcome === "Pending")
    .map((t) => ({ ...t, daysLeft: trialDaysLeft(t) }))
    .filter((t) => t.daysLeft !== null && t.daysLeft <= 14)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  // Recent wins (outcome = Won in last 30 days)
  const wins = trials.filter((t) => t.outcome === "Won").length;

  const totalPipeline = outreachCount + qualifiedCount + discoveryCount + activeTrials;
  const urgentCount = overdueFollowups.length + dueTodayFollowups.length + expiringTrials.filter((t) => (t.daysLeft ?? 99) <= 3).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">OpSpot</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {totalPipeline} in pipeline · {wins} won · {urgentCount > 0 ? `${urgentCount} urgent` : "nothing urgent"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <a
            href="/opspot/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-[#0F1F3D] text-white px-4 py-2 text-sm font-semibold hover:bg-[#162a52] transition-colors"
          >
            Open OpSpot <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Urgent alerts */}
      {(overdueFollowups.length > 0 || dueTodayFollowups.length > 0 || expiringTrials.filter(t => (t.daysLeft ?? 99) <= 3).length > 0) && (
        <div className="space-y-2">
          {overdueFollowups.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm font-semibold text-red-700">{overdueFollowups.length} overdue follow-up{overdueFollowups.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="space-y-1.5">
                {overdueFollowups.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-red-800">{c.brand}</span>
                    <span className="text-red-600">{c.contact}</span>
                    <span className="text-xs text-red-500 ml-auto">{Math.abs(daysUntil(c.followUpDate!))}d overdue</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dueTodayFollowups.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm font-semibold text-amber-700">{dueTodayFollowups.length} follow-up{dueTodayFollowups.length !== 1 ? "s" : ""} due today</p>
              </div>
              <div className="space-y-1.5">
                {dueTodayFollowups.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-amber-800">{c.brand}</span>
                    <span className="text-amber-600">{c.contact}</span>
                    <span className="text-xs text-amber-500 ml-auto capitalize">{c.stage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expiringTrials.filter(t => (t.daysLeft ?? 99) <= 3).map((t) => (
            <div key={t.id} className="rounded-xl bg-red-50 border border-red-200 p-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm font-semibold text-red-700">
                  Trial ending {t.daysLeft === 0 ? "today" : t.daysLeft! < 0 ? `${Math.abs(t.daysLeft!)}d overdue` : `in ${t.daysLeft}d`}: <span className="font-bold">{t.brand}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline summary */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#0d9488]" /> Pipeline
        </h2>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "Outreach",   count: outreachCount,  colour: "#60a5fa", emoji: "❄️" },
            { label: "Qualified",  count: qualifiedCount, colour: "#2563eb", emoji: "✅" },
            { label: "Discovery",  count: discoveryCount, colour: "#7c3aed", emoji: "🔍" },
            { label: "Trials",     count: activeTrials,   colour: "#0d9488", emoji: "🧪" },
            { label: "Onboarding", count: onboardingCount, colour: "#16a34a", emoji: "🚀" },
          ].map(({ label, count, colour, emoji }) => (
            <div key={label} className="rounded-xl border bg-white shadow-sm p-3 text-center">
              <p className="text-lg mb-0.5">{emoji}</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: colour }}>{count}</p>
              <p className="text-[10px] text-gray-400 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Due soon follow-ups */}
      {dueSoonFollowups.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Follow-ups due soon (next 3 days)
          </h2>
          <div className="rounded-xl border bg-white shadow-sm divide-y divide-gray-50">
            {dueSoonFollowups.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{c.brand}</p>
                  <p className="text-xs text-gray-500">{c.contact}{c.role ? ` · ${c.role}` : ""}</p>
                </div>
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium shrink-0">
                  in {daysUntil(c.followUpDate!)}d
                </span>
                <span className="text-xs text-gray-400 capitalize shrink-0">{c.stage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expiring trials */}
      {expiringTrials.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-500" /> Trials ending soon
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {expiringTrials.map((t) => {
              const dl = t.daysLeft ?? 0;
              const isUrgent = dl <= 3;
              return (
                <div key={t.id} className={`rounded-xl border bg-white shadow-sm p-4 ${isUrgent ? "border-red-200" : "border-amber-200"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{t.brand}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.contact}{t.owner ? ` · ${t.owner}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-2xl font-bold tabular-nums leading-none ${dl < 0 ? "text-red-500" : dl <= 3 ? "text-red-500" : "text-amber-500"}`}>{Math.abs(dl)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{dl < 0 ? "days over" : "days left"}</p>
                    </div>
                  </div>
                  {t.dealValue ? (
                    <p className="text-xs text-gray-400 mt-2">{t.dealValue} site{t.dealValue !== 1 ? "s" : ""} · {t.region}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Onboarding in progress */}
      {onboarding.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" /> Onboarding in progress
          </h2>
          <div className="rounded-xl border bg-white shadow-sm divide-y divide-gray-50">
            {onboarding.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{o.brand}</p>
                  <p className="text-xs text-gray-500">{o.contact}{o.owner ? ` · ${o.owner}` : ""}</p>
                </div>
                <span className="text-xs text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-medium shrink-0 text-right max-w-[180px] truncate">
                  {o.onboardingStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nothing urgent state */}
      {overdueFollowups.length === 0 && dueTodayFollowups.length === 0 && expiringTrials.length === 0 && totalPipeline > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
          ✅ No urgent items — pipeline looks healthy!
        </div>
      )}

      {/* Empty pipeline */}
      {totalPipeline === 0 && onboardingCount === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
          Pipeline is empty — open OpSpot and add some contacts to get started.
        </div>
      )}
    </div>
  );
}
