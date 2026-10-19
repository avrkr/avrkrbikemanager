import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getRequiredServerEnvironment } from "@/lib/env";
import { runMaintenanceReminders } from "@/lib/notifications/runner";

function isAuthorized(request: Request, expectedSecret: string) {
  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${expectedSecret}`;
  const actualBuffer = Buffer.from(authorization);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function GET(request: Request) {
  let cronSecret: string;
  try {
    cronSecret = getRequiredServerEnvironment("CRON_SECRET");
  } catch {
    return NextResponse.json({ error: "Cron authentication is not configured." }, { status: 503 });
  }
  if (!isAuthorized(request, cronSecret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const summary = await runMaintenanceReminders();
    return NextResponse.json({ ok: true, ...summary });
  } catch {
    return NextResponse.json({ error: "Reminder processing failed. Check server logs and configuration." }, { status: 500 });
  }
}