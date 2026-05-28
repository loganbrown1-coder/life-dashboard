"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home, Calendar, Dumbbell, UtensilsCrossed, Wallet,
  Target, CheckSquare, BarChart2, Settings, Menu, LayoutDashboard,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/",         label: "Home",     icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/health",   label: "Health",   icon: Dumbbell },
  { href: "/food",     label: "Food",     icon: UtensilsCrossed },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/goals",    label: "Goals",    icon: Target },
  { href: "/projects", label: "Work",     icon: CheckSquare },
  { href: "/opspot",   label: "OpSpot",   icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="p-1 text-gray-600" aria-label="Open menu">
        <Menu className="w-5 h-5" />
      </SheetTrigger>

      <SheetContent side="left" className="w-64 p-0">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
          <LayoutDashboard className="w-5 h-5 text-[#0d9488]" />
          <span className="font-semibold text-gray-900 text-sm">Life Dashboard</span>
        </div>

        <nav className="py-4 space-y-0.5 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#0d9488]/10 text-[#0d9488]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
