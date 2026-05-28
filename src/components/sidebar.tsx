"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Calendar,
  Dumbbell,
  UtensilsCrossed,
  Wallet,
  Target,
  CheckSquare,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/",          label: "Home",      icon: Home },
  { href: "/calendar",  label: "Calendar",  icon: Calendar },
  { href: "/health",    label: "Health",    icon: Dumbbell },
  { href: "/food",      label: "Food",      icon: UtensilsCrossed },
  { href: "/finances",  label: "Finances",  icon: Wallet },
  { href: "/goals",     label: "Goals",     icon: Target },
  { href: "/projects",  label: "Work",      icon: CheckSquare },
  { href: "/opspot",    label: "OpSpot",    icon: BarChart2 },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-white border-r border-gray-100 transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo / title */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
        <LayoutDashboard className="w-5 h-5 text-[#0d9488] flex-shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-gray-900 text-sm truncate">
            Life Dashboard
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#0d9488]/10 text-[#0d9488]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Search hint */}
      {!collapsed && (
        <div className="px-3 pb-1">
          <button
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
            }}
            className="flex w-full items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            <span className="flex-1 text-left">Search…</span>
            <kbd className="bg-gray-100 rounded px-1 py-0.5 text-[10px]">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Sign out */}
      <form action="/api/logout" method="POST" className="px-2 pb-1">
        <button
          type="submit"
          title={collapsed ? "Sign out" : undefined}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </form>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
