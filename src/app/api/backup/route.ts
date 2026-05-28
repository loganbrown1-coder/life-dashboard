import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

export async function GET() {
  const dbPath = path.join(process.cwd(), "data", "dashboard.db");

  if (!existsSync(dbPath)) {
    return NextResponse.json({ error: "Database file not found" }, { status: 404 });
  }

  const fileBuffer = readFileSync(dbPath);
  const now = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `dashboard-backup-${now}.db`;

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(fileBuffer.length),
    },
  });
}
