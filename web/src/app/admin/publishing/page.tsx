import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getRoutines, getSchedules } from "@/lib/publishing-db";
import PublishingAdminClient from "./PublishingAdminClient";

export default async function PublishingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const routines = getRoutines(session.user.id);
  const schedules = getSchedules(session.user.id, { limit: 50 });
  return <PublishingAdminClient routines={routines} schedules={schedules} />;
}
