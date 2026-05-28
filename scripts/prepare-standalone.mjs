/**
 * Copies the files that Next.js standalone needs but doesn't include itself:
 *   .next/static  → .next/standalone/.next/static
 *   public/       → .next/standalone/public
 *
 * Also creates shim packages for any Turbopack-hashed external module names
 * (e.g. "better-sqlite3-90e2652d1716b047" or "drizzle-orm-xxx/better-sqlite3")
 * so they resolve correctly at runtime.
 */
import { cpSync, existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error("❌  .next/standalone not found — did `next build` run with output: 'standalone'?");
  process.exit(1);
}

// Copy .next/static → standalone/.next/static
const staticSrc  = join(root, ".next", "static");
const staticDest = join(standalone, ".next", "static");
if (existsSync(staticSrc)) {
  mkdirSync(join(standalone, ".next"), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log("✓  Copied .next/static → standalone/.next/static");
}

// Copy public/ → standalone/public
const publicSrc  = join(root, "public");
const publicDest = join(standalone, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log("✓  Copied public/ → standalone/public");
}

// Copy data/ → standalone/data (snapshot the live DB for the bundle)
const dataSrc  = join(root, "data");
const dataDest = join(standalone, "data");
if (existsSync(dataSrc)) {
  mkdirSync(dataDest, { recursive: true });
  cpSync(dataSrc, dataDest, {
    recursive: true,
    filter: (src) => !src.endsWith("-wal") && !src.endsWith("-shm"),
  });
  console.log("✓  Copied data/ → standalone/data");
}

// Copy drizzle/ → standalone/drizzle (migrations, run on each app launch)
const drizzleSrc  = join(root, "drizzle");
const drizzleDest = join(standalone, "drizzle");
if (existsSync(drizzleSrc)) {
  mkdirSync(drizzleDest, { recursive: true });
  cpSync(drizzleSrc, drizzleDest, { recursive: true });
  console.log("✓  Copied drizzle/ → standalone/drizzle");
}

// ── Turbopack shim fix ────────────────────────────────────────────────────────
// Turbopack mangles external package names with a hash suffix at build time
// (e.g. "drizzle-orm-4d62399e06797e94/better-sqlite3"). We scan all built SSR
// chunks, find every hashed name (including sub-paths), and create tiny shim
// packages that forward require() to the real package + sub-path.
//
// Pattern: <pkg-name>-<16-hex-chars>[/optional/subpath]
const ssrChunksDir = join(standalone, ".next", "server", "chunks", "ssr");
// Match the hashed module name + any sub-path after it
const shimPattern = /["']([a-z@][a-z0-9@/_.-]*-[0-9a-f]{16}(?:\/[a-z0-9/_.-]+)*)["']/g;
const shimEntries = new Map(); // shimName → realName

if (existsSync(ssrChunksDir)) {
  for (const file of readdirSync(ssrChunksDir)) {
    if (!file.endsWith(".js")) continue;
    const src = readFileSync(join(ssrChunksDir, file), "utf8");
    for (const [, fullName] of src.matchAll(shimPattern)) {
      if (shimEntries.has(fullName)) continue;
      // Real name = strip the "-<16hexchars>" hash from the package name portion
      const realName = fullName.replace(/-[0-9a-f]{16}(?=\/|$)/, "");
      shimEntries.set(fullName, realName);
    }
  }
}

const nmDir = join(standalone, "node_modules");
for (const [shimName, realName] of shimEntries) {
  const shimDir = join(nmDir, ...shimName.split("/"));
  mkdirSync(shimDir, { recursive: true });
  // Only write package.json at the root shim level (not sub-paths)
  if (!shimName.includes("/")) {
    writeFileSync(join(shimDir, "package.json"), JSON.stringify({
      name: shimName,
      version: "0.0.1",
      main: "index.js",
    }));
  }
  writeFileSync(join(shimDir, "index.js"),
    `// Turbopack shim — forwards to the real package\nmodule.exports = require(${JSON.stringify(realName)});\n`
  );
  console.log(`✓  Created Turbopack shim: ${shimName} → ${realName}`);
}

console.log("✅  Standalone ready at .next/standalone/");

// ── Copy standalone → src-tauri/target/release/server/ ───────────────────────
// Tauri's build script (tauri_build::build) walks its resource directory and
// calls canonicalize() on every file.  If those files live in iCloud Drive and
// have been evicted to save space, each canonicalize() triggers an iCloud
// download that can time out (os error 60 / ETIMEDOUT).
//
// Writing the files here — immediately before `tauri build` runs — guarantees
// they are freshly written on-disk and iCloud has not had time to evict them.
// Pointing tauri.conf.json at this path (instead of .next/standalone) means
// tauri_build reads from files that were just written, never evicted.
const tauriServerDest = join(root, "src-tauri", "target", "release", "server");
mkdirSync(tauriServerDest, { recursive: true });
cpSync(standalone, tauriServerDest, {
  recursive: true,
  force: true,
  filter: (src) => !src.endsWith("-wal") && !src.endsWith("-shm"),
});
console.log("✓  Copied .next/standalone → src-tauri/target/release/server (Tauri resource cache)");
