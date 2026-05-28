"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/health",              label: "Overview"     },
  { href: "/health/workouts",     label: "Workouts"     },
  { href: "/health/weight",       label: "Weight"       },
  { href: "/health/steps",        label: "Steps"        },
  { href: "/health/supplements",  label: "Supplements"  },
  { href: "/health/sleep",        label: "Sleep"        },
  { href: "/health/import",       label: "Import"       },
];

export function HealthNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-gray-100 mb-6 overflow-x-auto">
      {tabs.map(({ href, label }) => {
        const isActive = href === "/health" ? pathname === "/health" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              isActive
                ? "border-[#0d9488] text-[#0d9488]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
