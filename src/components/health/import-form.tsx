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

// ── Main form ────────────────────────────────────────────────────────────────

export function ImportForm() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-xl border bg-amber-50 border-amber-200 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">How to export from Apple Health</p>
        <ol className="list-decimal list-inside space-y-1 text-amber-700">
          <li>Open the Health app on your iPhone</li>
          <li>Tap your profile picture → Export All Health Data</li>
          <li>Unzip the file and open <code className="bg-amber-100 px-1 rounded">export.xml</code></li>
          <li>Or use a free app like <strong>Health Auto Export</strong> to export as CSV directly</li>
        </ol>
        <p className="mt-2 text-xs text-amber-600">Any CSV with the right columns works — apps, spreadsheets, manual files.</p>
      </div>

      <UploadSection
        type="steps"
        label="Steps"
        icon={FileText}
        colour="text-teal-600"
        sampleHeaders="date,step_count"
        sampleRow="2025-01-15,8432"
      />

      <UploadSection
        type="weight"
        label="Weight"
        icon={FileText}
        colour="text-blue-600"
        sampleHeaders="date,weight_kg"
        sampleRow="2025-01-15,82.4"
      />
    </div>
  );
}
