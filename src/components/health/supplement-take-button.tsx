"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { takeSupplement } from "@/actions/health";

export function SupplementTakeButton({
  supplementId,
  takenToday,
  name,
}: {
  supplementId: string;
  takenToday: boolean;
  name: string;
}) {
  const [taken, setTaken] = useState(takenToday);
  const [loading, setLoading] = useState(false);

  async function handleTake() {
    if (taken) return;
    setLoading(true);
    try {
      await takeSupplement(supplementId);
      setTaken(true);
      toast.success(`${name} logged ✓`);
    } catch {
      toast.error("Failed to log");
    } finally {
      setLoading(false);
    }
  }

  if (taken) {
    return (
      <span className="flex items-center gap-1 text-[#10b981] text-sm font-medium">
        <Check className="w-4 h-4" /> Done
      </span>
    );
  }

  return (
    <Button
      size="sm"
      onClick={handleTake}
      disabled={loading}
      className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "✓ Take"}
    </Button>
  );
}
