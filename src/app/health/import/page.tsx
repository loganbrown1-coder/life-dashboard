import { HealthNav } from "@/components/health/health-nav";
import { ImportForm } from "@/components/health/import-form";

export default function ImportPage() {
  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Health</h1>
        <p className="text-gray-500 mt-1">Import data</p>
      </div>

      <HealthNav />

      <ImportForm />
    </div>
  );
}
