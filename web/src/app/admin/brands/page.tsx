import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBrands } from "@/lib/training-data-db";
import BrandsClient from "./BrandsClient";

export default async function BrandsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // Gracefully handle missing DB tables (migrations not yet applied)
  let brands: Awaited<ReturnType<typeof getBrands>> = [];
  try {
    brands = await getBrands(session.user.id);
  } catch {
    // DB schema not initialized — show empty state
  }
  return <BrandsClient brands={brands} />;
}
