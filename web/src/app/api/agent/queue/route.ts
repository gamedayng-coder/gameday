import { NextRequest, NextResponse } from "next/server";
import { validateAgentRequest } from "@/lib/agent-auth";
import { getContentItems } from "@/lib/content-db";

// GET /api/agent/queue
// Returns the current content queue for the agent user: draft and approved items.
// Query params:
//   status=draft|approved|scheduled|published  (default: draft,approved)
//
// Returns: { total: number, draft: number, approved: number, items: ContentItem[] }
export async function GET(req: NextRequest) {
  const agent = validateAgentRequest(req);
  if (!agent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");

  // Validate status parameter against allowed values
  const allowedStatuses = ["draft", "approved", "scheduled", "published", "discarded"] as const;
  type ContentStatus = typeof allowedStatuses[number];

  let requestedStatuses: ContentStatus[];
  if (statusParam) {
    const parsed = statusParam.split(",").map((s) => s.trim()) as ContentStatus[];
    const invalid = parsed.filter((s) => !allowedStatuses.includes(s));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid status values: ${invalid.join(", ")}. Allowed: ${allowedStatuses.join(", ")}` },
        { status: 400 }
      );
    }
    requestedStatuses = parsed;
  } else {
    requestedStatuses = ["draft", "approved"];
  }

  // Fetch items for each requested status and merge
  const items = requestedStatuses.flatMap((status) => getContentItems(agent.userId, status));

  // Sort by created_at desc
  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const counts = {
    draft: items.filter((i) => i.status === "draft").length,
    approved: items.filter((i) => i.status === "approved").length,
    scheduled: items.filter((i) => i.status === "scheduled").length,
    published: items.filter((i) => i.status === "published").length,
  };

  return NextResponse.json({
    total: items.length,
    ...counts,
    items,
  });
}
