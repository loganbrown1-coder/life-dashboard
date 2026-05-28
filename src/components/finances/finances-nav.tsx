"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/finances",              label: "Overview"     },
  { href: "/finances/transactions", label: "Transactions" },
  { href: "/finances/budgets",      label: "Budgets"      },
  { href: "/finances/bills",        label: "Bills"        },
  { href: "/finances/savings",      label: "Savings"      },
  { href: "/finances/investments",  label: "Investments"  },
];

export function FinancesNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-gray-100 mb-6 overflow-x-auto">
      {tabs.map(({ href, label }) => {
        const isActive = href === "/finances" ? pathname === "/finances" : pathname.startsWith(href);
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
