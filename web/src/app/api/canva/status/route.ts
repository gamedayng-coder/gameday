import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateAgentRequest } from "@/lib/agent-auth";
import { getCanvaCredential } from "@/lib/canva-db";
import { getExportJob, getAutofillJob } from "@/lib/canva-client";

// GET /api/canva/status?type=export&jobId=<id>
// GET /api/canva/status?type=autofill&jobId=<id>
// Polls a Canva async job. Used by clients that prefer to poll instead of waiting
// for the blocking generate endpoint.

export async function GET(req: NextRequest) {
  let userId: string | undefined;

  const agent = await validateAgentRequest(req);
  if (agent) {
    userId = agent.userId;
  } else {
    const session = await auth();
    userId = session?.user?.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const type = searchParams.get("type") ?? "export";

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const credential = await getCanvaCredential(userId);
  if (!credential) {
    return NextResponse.json({ error: "No Canva account connected" }, { status: 400 });
  }

  try {
    const result =
      type === "autofill"
        ? await getAutofillJob(credential.access_token, jobId)
        : await getExportJob(credential.access_token, jobId);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch job status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
