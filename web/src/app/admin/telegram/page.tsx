import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTelegramCredential, getTelegramPosts } from "@/lib/telegram-db";
import { getPosters } from "@/lib/poster-db";
import TelegramAdminClient from "./TelegramAdminClient";

export const dynamic = "force-dynamic";

export default async function TelegramAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const credential = (await getTelegramCredential()) ?? null;
  const posts = await getTelegramPosts(50);
  const approvedPosters = await getPosters({ status: "approved" });

  return (
    <TelegramAdminClient
      credential={credential}
      posts={posts}
      approvedPosters={approvedPosters}
    />
  );
}
