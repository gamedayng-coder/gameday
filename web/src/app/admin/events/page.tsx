import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getManualEvents } from "@/lib/manual-events-db";
import EventsAdminClient from "./EventsAdminClient";

export default async function EventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const events = await getManualEvents(session.user.id);
  return <EventsAdminClient events={events} />;
}
