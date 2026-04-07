import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getContentItems } from "@/lib/content-db";
import { getPosters } from "@/lib/poster-db";
import { getManualEvents } from "@/lib/manual-events-db";
import ContentPreviewClient from "./ContentPreviewClient";

export default async function ContentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const items = await getContentItems(session.user.id);
  const posters = await getPosters({ status: "approved" });
  const events = await getManualEvents(session.user.id);
  return <ContentPreviewClient items={items} posters={posters} events={events} />;
}
