"use client";

import { useMemo } from "react";
import { format } from "date-fns";

export function Greeting() {
  const { greeting, dateStr } = useMemo(() => {
    const hour = new Date().getHours();
    const g = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return { greeting: g, dateStr: format(new Date(), "EEEE, d MMMM yyyy") };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{greeting}</h1>
      <p className="text-gray-500 mt-0.5">{dateStr}</p>
    </div>
  );
}
