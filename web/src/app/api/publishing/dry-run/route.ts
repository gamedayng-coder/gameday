import { auth } from "@/auth";
import { createSchedule, getRoutines, type PublishChannel } from "@/lib/publishing-db";
import { getContentItems } from "@/lib/content-db";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

// Simulates what would post and when without actually publishing.
// Uses routines to project scheduled posts for the next N days.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { days?: number; save?: boolean };
  const days = Math.min(body.days ?? 7, 30);
  const userId = session.user.id;

  const routines = getRoutines(userId).filter((r) => r.enabled === 1);
  const approvedContent = getContentItems(userId, "approved");

  type DryRunEntry = {
    id: string;
    routine_name: string;
    channel: PublishChannel;
    content_preview: string;
    scheduled_at: string;
    timezone: string;
  };

  const results: DryRunEntry[] = [];
  const now = new Date();

  for (const routine of routines) {
    const channels = (() => { try { return JSON.parse(routine.channels) as PublishChannel[]; } catch { return []; } })();
    const rule = (() => { try { return JSON.parse(routine.schedule_rule) as { type: string; time?: string; days?: number[] }; } catch { return { type: "immediate" }; } })();

    for (let d = 0; d < days; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);

      // If rule specifies days of week, skip non-matching days
      if (rule.days && rule.days.length > 0 && !rule.days.includes(date.getDay())) continue;

      // Build scheduled time
      const [hh, mm] = (rule.time ?? "09:00").split(":").map(Number);
      date.setHours(hh ?? 9, mm ?? 0, 0, 0);
      if (date < now) continue;

      // Pick up to max_per_day content items
      const eligible = approvedContent
        .filter((c) => routine.content_type === "any" || c.poster_id !== null)
        .slice(0, routine.max_per_day);

      for (const channel of channels) {
        for (const content of eligible.slice(0, 1)) { // 1 post per channel per day in dry run
          const entry: DryRunEntry = {
            id: randomUUID(),
            routine_name: routine.name,
            channel,
            content_preview: content.caption.slice(0, 100),
            scheduled_at: date.toISOString(),
            timezone: routine.timezone,
          };
          results.push(entry);

          if (body.save) {
            createSchedule(entry.id, userId, content.id, channel, date.toISOString(), true);
          }
        }
      }
    }
  }

  return NextResponse.json({ dry_run: true, days, entries: results, total: results.length });
}
