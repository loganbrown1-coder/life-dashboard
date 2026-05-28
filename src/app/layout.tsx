import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Force every page to server-render on every request so dates stay current
// and routine/check-in data always reflects today, not the build date.
export const dynamic = "force-dynamic";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { QuickLog } from "@/components/quick-log";
import { CommandPalette } from "@/components/command-palette";
import { getUserOptions } from "@/db/queries/user-options";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Life Dashboard",
  description: "Your personal life dashboard",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dashboard",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workoutTypes = await getUserOptions("workout_type");

  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#0d9488" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <div className="flex h-screen overflow-hidden bg-[#fafafa]">
          {/* Left sidebar — hidden on mobile, visible on md+ */}
          <div className="hidden md:flex md:flex-shrink-0">
            <Sidebar />
          </div>

          {/* Main scrollable content area */}
          <main className="flex-1 overflow-y-auto">
            {/* Mobile top bar with sheet trigger */}
            <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
              <MobileNav />
              <span className="font-semibold text-gray-900">Life Dashboard</span>
            </div>

            <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
              {children}
            </div>
          </main>
        </div>

        <QuickLog workoutTypes={workoutTypes} />
        <CommandPalette />
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
