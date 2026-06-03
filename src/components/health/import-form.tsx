"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { importStepsFromCSV, importWeightFromCSV } from "@/actions/health";

type ParseResult<T> =
  | { ok: true; rows: T[]; skipped: number }
  | { ok: false; error: string };

// ── CSV parsers ───────────────────────────────────────────────────────────────

function parseStepsCSV(text: string): ParseResult<{ date: string; stepCount: number }> {
  const lines = text.trim().split(/\r?\n/);
  const rows: { date: string; stepCount: number }[] = [];
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    if (i === 0 && isNaN(Number(parts[1]))) continue; // skip header row

    const [dateRaw, countRaw] = parts;
    const date = dateRaw?.slice(0, 10); // take first 10 chars for YYYY-MM-DD
    const stepCount = Number(countRaw);

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(stepCount) || stepCount <= 0) {
      skipped++;
      continue;
    }
    rows.push({ date, stepCount: Math.round(stepCount) });
  }

  if (rows.length === 0) return { ok: false, error: "No valid rows found. Expected columns: date (YYYY-MM-DD), step_count" };
  return { ok: true, rows, skipped };
}

function parseWeightCSV(text: string): ParseResult<{ date: string; weightKg: number }> {
  const lines = text.trim().split(/\r?\n/);
  const rows: { date: string; weightKg: number }[] = [];
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    if (i === 0 && isNaN(Number(parts[1]))) continue; // skip header row

    const [dateRaw, weightRaw] = parts;
    const date = dateRaw?.slice(0, 10);
    const weightKg = Number(weightRaw);

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(weightKg) || weightKg <= 0) {
      skipped++;
      continue;
    }
    rows.push({ date, weightKg });
  }

  if (rows.length === 0) return { ok: false, error: "No valid rows found. Expected columns: date (YYYY-MM-DD), weight_kg" };
  return { ok: true, rows, skipped };
}

// ── Upload section ────────────────────────────────────────────────────────────

type ImportType = "steps" | "weight";

function UploadSection({
  type,
  label,
  icon: Icon,
  colour,
  sampleHeaders,
  sampleRow,
}: {
  type: ImportType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colour: string;
  sampleHeaders: string;
  sampleRow: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [preview, setPreview] = useState<{ rows: number; skipped: number } | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [parsedSteps, setParsedSteps]   = useState<{ date: string; stepCount: number }[] | null>(null);
  const [parsedWeight, setParsedWeight] = useState<{ date: string; weightKg: number }[] | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(null);
    setParsedSteps(null);
    setParsedWeight(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (type === "steps") {
        const result = parseStepsCSV(text);
        if (!result.ok) { setError(result.error); return; }
        setParsedSteps(result.rows);
        setPreview({ rows: result.rows.length, skipped: result.skipped });
      } else {
        const result = parseWeightCSV(text);
        if (!result.ok) { setError(result.error); return; }
        setParsedWeight(result.rows);
        setPreview({ rows: result.rows.length, skipped: result.skipped });
      }
    };
    reader.readAsText(file);
  }

  function handleImport() {
    setPending(true);
    startTransition(async () => {
      try {
        if (type === "steps" && parsedSteps) {
          await importStepsFromCSV(parsedSteps);
          toast.success(`Imported ${parsedSteps.length} step entries`);
        } else if (type === "weight" && parsedWeight) {
          await importWeightFromCSV(parsedWeight);
          toast.success(`Imported ${parsedWeight.length} weight entries`);
        }
        setPreview(null);
        setParsedSteps(null);
        setParsedWeight(null);
        router.refresh();
      } catch {
        toast.error("Import failed");
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${colour}`} />
        <h3 className="font-semibold text-gray-800">{label}</h3>
      </div>

      {/* Format guide */}
      <div className="mb-4 rounded-lg bg-gray-50 border border-gray-100 p-3 font-mono text-xs text-gray-600 space-y-0.5">
        <p className="text-gray-400 font-sans text-[10px] uppercase tracking-wide mb-1">Expected CSV format</p>
        <p>{sampleHeaders}</p>
        <p>{sampleRow}</p>
        <p className="text-gray-400">…</p>
      </div>

      {/* File input */}
      <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-6 cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 transition-colors">
        <Upload className="w-6 h-6 text-gray-400" />
        <span className="text-sm text-gray-500">Click to select a CSV file</span>
        <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
      </label>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && !error && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-teal-50 border border-teal-100 p-3">
          <div className="flex items-start gap-2 text-sm text-teal-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
            <div>
              <p><strong>{preview.rows}</strong> rows ready to import</p>
              {preview.skipped > 0 && <p className="text-xs text-teal-600 mt-0.5">{preview.skipped} rows skipped (bad format)</p>}
              <p className="text-xs text-teal-600 mt-0.5">Existing entries for the same date are kept (no overwrite)</p>
            </div>
          </div>
          <button
            onClick={handleImport}
            disabled={pending}
            className="shrink-0 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {pending ? "Importing…" : "Import"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Apple Health XML importer ─────────────────────────────────────────────────

type AppleHealthPreview = {
  stepDays: number;
  weightDays: number;
  dateRange: string;
  steps: { date: string; stepCount: number }[];
  weight: { date: string; weightKg: number }[];
};

function parseAppleHealthXML(text: string): AppleHealthPreview | { error: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) return { error: "Could not parse XML — make sure you uploaded export.xml from the Apple Health zip." };

    const records = Array.from(doc.querySelectorAll("Record"));

    // ── Steps: sum per calendar day ───────────────────────────────────────────
    const stepsByDay: Record<string, number> = {};
    for (const r of records) {
      if (r.getAttribute("type") !== "HKQuantityTypeIdentifierStepCount") continue;
      const dateRaw = r.getAttribute("startDate") ?? "";
      const date    = dateRaw.slice(0, 10); // "YYYY-MM-DD"
      const val     = Number(r.getAttribute("value") ?? 0);
      if (!date || isNaN(val)) continue;
      stepsByDay[date] = (stepsByDay[date] ?? 0) + val;
    }
    const steps = Object.entries(stepsByDay)
      .map(([date, stepCount]) => ({ date, stepCount: Math.round(stepCount) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Weight: latest reading per day, convert lbs→kg if needed ─────────────
    const weightByDay: Record<string, { value: number; time: string }> = {};
    for (const r of records) {
      if (r.getAttribute("type") !== "HKQuantityTypeIdentifierBodyMass") continue;
      const dateRaw = r.getAttribute("startDate") ?? "";
      const date    = dateRaw.slice(0, 10);
      const val     = Number(r.getAttribute("value") ?? 0);
      const unit    = r.getAttribute("unit") ?? "kg";
      if (!date || isNaN(val) || val <= 0) continue;
      const kg = unit === "lb" ? val * 0.453592 : val;
      const existing = weightByDay[date];
      if (!existing || dateRaw > existing.time) {
        weightByDay[date] = { value: parseFloat(kg.toFixed(1)), time: dateRaw };
      }
    }
    const weight = Object.entries(weightByDay)
      .map(([date, { value }]) => ({ date, weightKg: value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const allDates = [...steps.map(s => s.date), ...weight.map(w => w.date)].sort();
    const dateRange = allDates.length
      ? `${allDates[0]} → ${allDates[allDates.length - 1]}`
      : "no data";

    return { stepDays: steps.length, weightDays: weight.length, dateRange, steps, weight };
  } catch (e) {
    return { error: `Parse error: ${e}` };
  }
}

function AppleHealthImport() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [preview, setPreview]   = useState<AppleHealthPreview | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [parsing, setParsing]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [done, setDone]         = useState<{ steps: number; weight: number } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setPreview(null); setDone(null);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseAppleHealthXML(text);
      setParsing(false);
      if ("error" in result) { setError(result.error); return; }
      if (result.stepDays === 0 && result.weightDays === 0) {
        setError("No steps or weight data found in this file.");
        return;
      }
      setPreview(result);
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!preview) return;
    setImporting(true);
    startTransition(async () => {
      try {
        if (preview.steps.length > 0)  await importStepsFromCSV(preview.steps);
        if (preview.weight.length > 0) await importWeightFromCSV(preview.weight);
        setDone({ steps: preview.steps.length, weight: preview.weight.length });
        setPreview(null);
        router.refresh();
      } catch {
        toast.error("Import failed — please try again");
      } finally {
        setImporting(false);
      }
    });
  }

  return (
    <div className="rounded-xl border-2 border-teal-200 bg-white shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🍎</span>
        <h3 className="font-semibold text-gray-800">Import from Apple Health</h3>
        <span className="ml-auto text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">Recommended</span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Upload <code className="bg-gray-100 px-1 rounded text-xs">export.xml</code> from your Apple Health zip — imports steps and weight automatically.
      </p>

      {/* Steps */}
      <div className="mb-4 rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm text-gray-600 space-y-1">
        <p className="font-medium text-gray-700 text-xs uppercase tracking-wide">How to get the file</p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-gray-500">
          <li>On your iPhone: Health app → profile picture (top right) → <strong>Export All Health Data</strong></li>
          <li>AirDrop or share the zip to your Mac</li>
          <li>Double-click the zip to unzip it → open the folder</li>
          <li>Upload <strong>export.xml</strong> below (ignore the other files)</li>
        </ol>
      </div>

      {/* Upload zone */}
      {!done && (
        <label className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors ${
          parsing ? "border-teal-300 bg-teal-50/50" : "border-gray-200 hover:border-teal-300 hover:bg-teal-50/30"
        }`}>
          <Upload className="w-6 h-6 text-gray-400" />
          <span className="text-sm text-gray-500">
            {parsing ? "Parsing… this may take a moment for large files" : "Click to select export.xml"}
          </span>
          <span className="text-xs text-gray-400">The file can be several hundred MB — that&apos;s normal</span>
          <input type="file" accept=".xml" className="hidden" onChange={handleFile} disabled={parsing} />
        </label>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="mt-4 rounded-lg bg-teal-50 border border-teal-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-800">Ready to import</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-lg p-3 text-center border border-teal-100">
              <p className="text-2xl font-bold text-gray-900">{preview.stepDays.toLocaleString()}</p>
              <p className="text-xs text-gray-500">days of steps</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center border border-teal-100">
              <p className="text-2xl font-bold text-gray-900">{preview.weightDays.toLocaleString()}</p>
              <p className="text-xs text-gray-500">weight readings</p>
            </div>
          </div>
          <p className="text-xs text-teal-600 mb-3">Date range: {preview.dateRange}</p>
          <p className="text-xs text-gray-500 mb-4">Existing entries for the same dates are kept — no data will be overwritten.</p>
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {importing ? "Importing…" : `Import ${preview.stepDays + preview.weightDays} records`}
          </button>
        </div>
      )}

      {/* Success */}
      {done && (
        <div className="mt-4 rounded-lg bg-green-50 border border-green-100 p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-800">Import complete!</p>
          <p className="text-sm text-green-600 mt-1">
            {done.steps > 0 && <span>{done.steps} days of steps · </span>}
            {done.weight > 0 && <span>{done.weight} weight readings</span>}
          </p>
          <button onClick={() => setDone(null)} className="mt-3 text-xs text-green-600 underline">Import another file</button>
        </div>
      )}
    </div>
  );
}

// ── Main form ────────────────────────────────────────────────────────────────

export function ImportForm() {
  return (
    <div className="space-y-6 max-w-2xl">

      <AppleHealthImport />

      <details className="group">
        <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600 list-none flex items-center gap-1">
          <span className="group-open:rotate-90 inline-block transition-transform">▶</span>
          Manual CSV import (advanced)
        </summary>
        <div className="mt-4 space-y-4">
          <UploadSection
            type="steps"
            label="Steps (CSV)"
            icon={FileText}
            colour="text-teal-600"
            sampleHeaders="date,step_count"
            sampleRow="2025-01-15,8432"
          />
          <UploadSection
            type="weight"
            label="Weight (CSV)"
            icon={FileText}
            colour="text-blue-600"
            sampleHeaders="date,weight_kg"
            sampleRow="2025-01-15,82.4"
          />
        </div>
      </details>

    </div>
  );
}
