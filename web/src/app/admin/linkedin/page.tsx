import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLinkedInCredential, getLinkedInPosts } from "@/lib/linkedin-db";
import { getPosters } from "@/lib/poster-db";
import LinkedInAdminClient from "./LinkedInAdminClient";

export const dynamic = "force-dynamic";

export default async function LinkedInAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const credential = (await getLinkedInCredential()) ?? null;
  const posts = await getLinkedInPosts(50);
  const approvedPosters = await getPosters({ status: "approved" });

  return (
    <LinkedInAdminClient
      credential={credential}
      posts={posts}
      approvedPosters={approvedPosters}
    />
  );
}
