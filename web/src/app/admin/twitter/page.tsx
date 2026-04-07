import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTwitterCredential, getTwitterPosts } from "@/lib/twitter-db";
import { getPosters } from "@/lib/poster-db";
import TwitterAdminClient from "./TwitterAdminClient";

export const dynamic = "force-dynamic";

export default async function TwitterAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const credential = (await getTwitterCredential()) ?? null;
  const posts = await getTwitterPosts(50);
  const approvedPosters = await getPosters({ status: "approved" });

  return (
    <TwitterAdminClient
      credential={credential}
      posts={posts}
      approvedPosters={approvedPosters}
    />
  );
}
