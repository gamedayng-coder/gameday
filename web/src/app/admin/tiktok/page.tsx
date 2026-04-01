import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTikTokCredential, getTikTokPosts } from "@/lib/tiktok-db";
import { getPosters } from "@/lib/poster-db";
import TikTokAdminClient from "./TikTokAdminClient";

export const dynamic = "force-dynamic";

export default async function TikTokAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const credential = getTikTokCredential() ?? null;
  const posts = getTikTokPosts(50);
  const approvedPosters = getPosters({ status: "approved" });

  return (
    <TikTokAdminClient
      credential={credential}
      posts={posts}
      approvedPosters={approvedPosters}
    />
  );
}
