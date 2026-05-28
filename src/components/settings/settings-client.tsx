"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Download, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateCurrencyRate,
  addAccount, deleteAccount,
  upsertBudget, deleteBudget,
} from "@/actions/settings";
import { addRoutineItem, removeRoutineItem } from "@/actions/routines";
import { addUserOption, deleteUserOption, renameUserOption } from "@/actions/user-options";

// ── Types ────────────────────────────────────────────────────────────────────

type Rate      = { id: string; currencyCode: string; rateToGbp: number };
type Account   = { id: string; name: string; type: string; currency: string; currentBalance: number };
type Budget    = { id: string; category: string; monthlyLimitGbp: number };
type Routine   = { id: string; name: string; timeOfDay: string; items: { id: string; label: string }[] };
type UserOption = { id: string; value: string; label: string; orderIndex: number };

type Props = {
  rates:        Rate[];
  accounts:     Account[];
  budgets:      Budget[];
  routines:     Routine[];
  workoutTypes: UserOption[];
  txCategories: UserOption[];
};

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsClient({ rates, accounts, budgets, routines, workoutTypes, txCategories }: Props) {
  return (
    <div className="space-y-8 max-w-2xl">
      <WorkoutTypesSection options={workoutTypes} />
      <TxCategoriesSection options={txCategories} />
      <CurrencySection rates={rates} />
      <AccountsSection accounts={accounts} />
      <BudgetsSection budgets={budgets} />
      <RoutinesSection routines={routines} />
      <BackupSection />
    </div>
  );
}

// ── Workout Types ─────────────────────────────────────────────────────────────

function WorkoutTypesSection({ options }: { options: UserOption[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding]     = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  function handleAdd() {
    if (!newLabel.trim()) return;
    // Derive a value from the label (snake_case)
    const value = newLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    startTransition(async () => {
      await addUserOption("workout_type", value, newLabel.trim());
      toast.success("Workout type added");
      setNewLabel(""); setAdding(false);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteUserOption(id);
      toast.success("Removed");
      router.refresh();
    });
  }

  function handleRename(id: string) {
    if (!editLabel.trim()) return;
    startTransition(async () => {
      await renameUserOption(id, editLabel.trim());
      toast.success("Renamed");
      setEditingId(null);
      router.refresh();
    });
  }

  return (
    <Section title="Workout Types" description="Shown in the workout type dropdown when logging a workout.">
      <div className="space-y-1 mb-3">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
            {editingId === opt.id ? (
              <>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="flex-1 h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(opt.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button onClick={() => handleRename(opt.id)} className="p-1 text-teal-600 hover:text-teal-700"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-700">{opt.label}</span>
                <button
                  onClick={() => { setEditingId(opt.id); setEditLabel(opt.label); }}
                  className="p-1 text-gray-300 hover:text-gray-600 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(opt.id)}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
        {options.length === 0 && <p className="text-sm text-gray-400">No workout types. Add one below.</p>}
      </div>

      {adding ? (
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Upper Body"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            autoFocus
            className="flex-1 h-8 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewLabel(""); } }}
          />
          <Button size="sm" onClick={handleAdd}>Add</Button>
          <Button size="sm" variant="outline" onClick={() => { setAdding(false); setNewLabel(""); }}>Cancel</Button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          <Plus className="w-4 h-4" /> Add workout type
        </button>
      )}
    </Section>
  );
}

// ── Transaction Categories ────────────────────────────────────────────────────

function TxCategoriesSection({ options }: { options: UserOption[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding]     = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  function handleAdd() {
    if (!newLabel.trim()) return;
    startTransition(async () => {
      await addUserOption("transaction_category", newLabel.trim(), newLabel.trim());
      toast.success("Category added");
      setNewLabel(""); setAdding(false);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteUserOption(id);
      toast.success("Removed");
      router.refresh();
    });
  }

  function handleRename(id: string) {
    if (!editLabel.trim()) return;
    startTransition(async () => {
      await renameUserOption(id, editLabel.trim());
      toast.success("Renamed");
      setEditingId(null);
      router.refresh();
    });
  }

  return (
    <Section title="Transaction Categories" description="Shown in the category dropdown when adding a transaction.">
      <div className="space-y-1 mb-3">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
            {editingId === opt.id ? (
              <>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="flex-1 h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(opt.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button onClick={() => handleRename(opt.id)} className="p-1 text-teal-600 hover:text-teal-700"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-700">{opt.label}</span>
                <button
                  onClick={() => { setEditingId(opt.id); setEditLabel(opt.label); }}
                  className="p-1 text-gray-300 hover:text-gray-600 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(opt.id)}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
        {options.length === 0 && <p className="text-sm text-gray-400">No categories. Add one below.</p>}
      </div>

      {adding ? (
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Dining Out"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            autoFocus
            className="flex-1 h-8 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewLabel(""); } }}
          />
          <Button size="sm" onClick={handleAdd}>Add</Button>
          <Button size="sm" variant="outline" onClick={() => { setAdding(false); setNewLabel(""); }}>Cancel</Button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          <Plus className="w-4 h-4" /> Add category
        </button>
      )}
    </Section>
  );
}

// ── Currency rates ────────────────────────────────────────────────────────────

function CurrencySection({ rates }: { rates: Rate[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [rateVal, setRateVal] = useState("");

  function startEdit(r: Rate) {
    setEditing(r.id);
    setRateVal(String(r.rateToGbp));
  }

  function save(id: string) {
    const v = parseFloat(rateVal);
    if (!v || v <= 0) { toast.error("Invalid rate"); return; }
    startTransition(async () => {
      await updateCurrencyRate(id, v);
      toast.success("Rate updated");
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <Section title="Currency Rates" description="Used to convert transactions to GBP.">
      <div className="space-y-2">
        {rates.map((r) => (
          <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <span className="font-mono font-semibold text-sm w-12">{r.currencyCode}</span>
            {editing === r.id ? (
              <>
                <Input
                  type="number"
                  step="0.0001"
                  value={rateVal}
                  onChange={(e) => setRateVal(e.target.value)}
                  className="w-32 h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") save(r.id); if (e.key === "Escape") setEditing(null); }}
                />
                <span className="text-xs text-gray-400">GBP</span>
                <button onClick={() => save(r.id)} className="p-1 text-teal-600 hover:text-teal-700"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-600 flex-1">1 {r.currencyCode} = {r.rateToGbp} GBP</span>
                <button onClick={() => startEdit(r)} className="p-1 text-gray-400 hover:text-gray-600"><Pencil className="w-3.5 h-3.5" /></button>
              </>
            )}
          </div>
        ))}
        {rates.length === 0 && <p className="text-sm text-gray-400">No rates yet.</p>}
      </div>
    </Section>
  );
}

// ── Accounts ──────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES = ["checking", "savings", "credit", "investment", "cash"] as const;

function AccountsSection({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<typeof ACCOUNT_TYPES[number]>("checking");
  const [currency, setCurrency] = useState("GBP");
  const [balance, setBalance] = useState("0");

  function handleAdd() {
    if (!name.trim()) return;
    startTransition(async () => {
      await addAccount({ name: name.trim(), type, currency, currentBalance: Number(balance) || 0 });
      toast.success("Account added");
      setName(""); setBalance("0"); setAdding(false);
      router.refresh();
    });
  }

  function handleDelete(id: string, accountName: string) {
    startTransition(async () => {
      await deleteAccount(id);
      toast.success(`${accountName} removed`);
      router.refresh();
    });
  }

  return (
    <Section title="Accounts" description="Your bank accounts, savings, and cash.">
      <div className="space-y-2 mb-3">
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{a.name}</p>
              <p className="text-xs text-gray-400 capitalize">{a.type} · {a.currency}</p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-gray-700">
              {a.currency === "GBP" ? "£" : `${a.currency} `}{a.currentBalance.toFixed(2)}
            </span>
            <button
              onClick={() => handleDelete(a.id, a.name)}
              className="p-1 text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {accounts.length === 0 && <p className="text-sm text-gray-400">No accounts yet.</p>}
      </div>

      {adding ? (
        <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
          <Input placeholder="Account name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <Input placeholder="Currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            <Input type="number" placeholder="Balance" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} className="flex-1">Add</Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          <Plus className="w-4 h-4" /> Add account
        </button>
      )}
    </Section>
  );
}

// ── Budget categories ─────────────────────────────────────────────────────────

function BudgetsSection({ budgets }: { budgets: Budget[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState("");

  function handleAdd() {
    if (!newCat.trim() || !newLimit) return;
    startTransition(async () => {
      await upsertBudget(newCat.trim(), Number(newLimit));
      toast.success("Budget saved");
      setNewCat(""); setNewLimit(""); setAdding(false);
      router.refresh();
    });
  }

  function handleSaveEdit(id: string, category: string) {
    startTransition(async () => {
      await upsertBudget(category, Number(editLimit));
      toast.success("Budget updated");
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteBudget(id);
      toast.success("Budget removed");
      router.refresh();
    });
  }

  return (
    <Section title="Budget Categories" description="Monthly limits per spending category.">
      <div className="space-y-2 mb-3">
        {budgets.map((b) => (
          <div key={b.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-800 flex-1 capitalize">{b.category}</span>
            {editingId === b.id ? (
              <>
                <Input
                  type="number"
                  value={editLimit}
                  onChange={(e) => setEditLimit(e.target.value)}
                  className="w-24 h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(b.id, b.category); if (e.key === "Escape") setEditingId(null); }}
                />
                <span className="text-xs text-gray-400">£/mo</span>
                <button onClick={() => handleSaveEdit(b.id, b.category)} className="p-1 text-teal-600"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingId(null)} className="p-1 text-gray-400"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-600 tabular-nums">£{b.monthlyLimitGbp}/mo</span>
                <button onClick={() => { setEditingId(b.id); setEditLimit(String(b.monthlyLimitGbp)); }} className="p-1 text-gray-400 hover:text-gray-600"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(b.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            )}
          </div>
        ))}
        {budgets.length === 0 && <p className="text-sm text-gray-400">No budgets yet.</p>}
      </div>

      {adding ? (
        <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Category (e.g. Groceries)" value={newCat} onChange={(e) => setNewCat(e.target.value)} autoFocus />
            <Input type="number" placeholder="£ / month" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} className="flex-1">Add</Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          <Plus className="w-4 h-4" /> Add category
        </button>
      )}
    </Section>
  );
}

// ── Routines ──────────────────────────────────────────────────────────────────

function RoutinesSection({ routines }: { routines: Routine[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState<string | null>(null); // routineId
  const [newLabel, setNewLabel] = useState("");

  function handleAdd(routineId: string) {
    if (!newLabel.trim()) return;
    startTransition(async () => {
      await addRoutineItem(routineId, newLabel.trim());
      toast.success("Item added");
      setNewLabel(""); setAdding(null);
      router.refresh();
    });
  }

  function handleRemove(itemId: string) {
    startTransition(async () => {
      await removeRoutineItem(itemId);
      toast.success("Item removed");
      router.refresh();
    });
  }

  return (
    <Section title="Routines" description="Edit your morning and evening checklist items.">
      <div className="space-y-5">
        {routines.map((r) => (
          <div key={r.id}>
            <p className="text-sm font-semibold text-gray-700 capitalize mb-2">{r.timeOfDay} routine</p>
            <div className="space-y-1">
              {r.items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1">
                  <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-0.5 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {r.items.length === 0 && <p className="text-xs text-gray-400 pl-4">No items yet.</p>}
            </div>

            {adding === r.id ? (
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Item label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  autoFocus
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(r.id); if (e.key === "Escape") { setAdding(null); setNewLabel(""); } }}
                />
                <Button size="sm" onClick={() => handleAdd(r.id)}>Add</Button>
                <Button size="sm" variant="outline" onClick={() => { setAdding(null); setNewLabel(""); }}>Cancel</Button>
              </div>
            ) : (
              <button
                onClick={() => { setAdding(r.id); setNewLabel(""); }}
                className="mt-2 flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add item
              </button>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Backup & Export ───────────────────────────────────────────────────────────

function BackupSection() {
  return (
    <Section
      title="Backup & Export"
      description={`Your data lives at data/dashboard.db in the project folder.`}
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Download a copy of your database at any time. Keep it somewhere safe — it contains everything.
        </p>
        <a
          href="/api/backup"
          download
          className="inline-flex items-center gap-2 rounded-lg bg-[#0d9488] text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download backup
        </a>
        <p className="text-xs text-gray-400">
          💡 Tip: also copy the <code className="bg-gray-100 px-1 rounded">data/</code> folder to iCloud or an external drive regularly.
        </p>
      </div>
    </Section>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-0.5">{title}</h2>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {children}
    </div>
  );
}
