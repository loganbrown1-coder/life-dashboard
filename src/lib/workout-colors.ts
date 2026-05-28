/**
 * Deterministic colour assignment for workout types.
 * Any string always maps to the same colour, so custom types
 * added by the user get consistent colours everywhere.
 */

const PALETTE = [
  { dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-700",   hex: "#60a5fa" },
  { dot: "bg-purple-400", badge: "bg-purple-100 text-purple-700", hex: "#a78bfa" },
  { dot: "bg-red-400",    badge: "bg-red-100 text-red-700",     hex: "#f87171" },
  { dot: "bg-orange-400", badge: "bg-orange-100 text-orange-700", hex: "#fb923c" },
  { dot: "bg-cyan-400",   badge: "bg-cyan-100 text-cyan-700",   hex: "#22d3ee" },
  { dot: "bg-green-400",  badge: "bg-green-100 text-green-700", hex: "#4ade80" },
  { dot: "bg-teal-400",   badge: "bg-teal-100 text-teal-700",   hex: "#2dd4bf" },
  { dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700", hex: "#facc15" },
  { dot: "bg-pink-400",   badge: "bg-pink-100 text-pink-700",   hex: "#f472b6" },
  { dot: "bg-indigo-400", badge: "bg-indigo-100 text-indigo-700", hex: "#818cf8" },
];

/** Hash a string to a palette index — same string always gets same colour. */
function hashType(type: string): number {
  let h = 0;
  for (let i = 0; i < type.length; i++) h = (h + type.charCodeAt(i)) % PALETTE.length;
  return h;
}

export function workoutDotColor(type: string): string {
  return PALETTE[hashType(type)].dot;
}

export function workoutBadgeColor(type: string): string {
  return PALETTE[hashType(type)].badge;
}

export function workoutHex(type: string): string {
  return PALETTE[hashType(type)].hex;
}

export type WorkoutTypeOption = { value: string; label: string };
