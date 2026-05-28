"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logSteps } from "@/actions/health";

const schema = z.object({
  date: z.string(),
  stepCount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0 && Number.isInteger(Number(v)), "Enter a whole number"),
});

type FormValues = z.infer<typeof schema>;

export function LogStepsForm() {
  const today = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: today, stepCount: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      const steps = Math.round(Number(values.stepCount));
      await logSteps({ date: values.date, stepCount: steps });
      toast.success(`Logged ${steps.toLocaleString()} steps`);
      reset({ date: today, stepCount: "" });
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
        <Input type="number" placeholder="e.g. 8500" className="max-w-[160px]" {...register("stepCount")} />
        {errors.stepCount && (
          <p className="text-xs text-red-500 mt-1">{errors.stepCount.message}</p>
        )}
      </div>
      <Button type="submit" className="bg-[#0d9488] hover:bg-[#0f766e] text-white">
        Save
      </Button>
    </form>
  );
}
