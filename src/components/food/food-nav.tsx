"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/food",            label: "Overview"   },
  { href: "/food/meals",      label: "Meals"      },
  { href: "/food/plan",       label: "Meal Plan"  },
  { href: "/food/groceries",  label: "Groceries"  },
];

export function FoodNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-gray-100 mb-6 overflow-x-auto">
      {tabs.map(({ href, label }) => {
        const isActive = href === "/food" ? pathname === "/food" : pathname.startsWith(href);
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
