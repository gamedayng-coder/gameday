import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getDataSources } from "@/lib/data-sources-db";
import DataSourcesAdminClient from "./DataSourcesAdminClient";

export default async function DataSourcesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const sources = getDataSources(session.user.id);
  // Mask keys before passing to client
  const masked = sources.map((s) => ({ ...s, api_key: s.api_key ? "••••••••" : "" }));
  return <DataSourcesAdminClient sources={masked} />;
}
