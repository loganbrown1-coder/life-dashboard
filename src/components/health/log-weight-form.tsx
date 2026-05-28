"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logWeight } from "@/actions/health";

const schema = z.object({
  date: z.string(),
  weightKg: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Enter a valid weight"),
});

type FormValues = z.infer<typeof schema>;

export function LogWeightForm() {
  const today = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: today, weightKg: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await logWeight({ date: values.date, weightKg: Number(values.weightKg) });
      toast.success(`Logged ${values.weightKg} kg`);
      reset({ date: today, weightKg: "" });
    } catch {
      toast.error("Failed to save");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-3">
      <div>
        <Input type="date" className="w-36" {...register("date")} />
      </div>
      <div>
        <Input
          type="number"
          step="0.1"
          placeholder="e.g. 82.5"
          className="max-w-[140px] text-lg font-medium"
          {...register("weightKg")}
        />
        {errors.weightKg && (
          <p className="text-xs text-red-500 mt-1">{errors.weightKg.message}</p>
        )}
      </div>
      <Button type="submit" className="bg-[#0d9488] hover:bg-[#0f766e] text-white">
        Save
      </Button>
    </form>
  );
}
